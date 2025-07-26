import * as core from '@actions/core';
import * as github from '@actions/github';
import {exec} from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';

interface Answer {
  answer: string;
  evidence: string;
}

interface RiskQuestion {
  key: string;
  weight: number;
  title: string;
  question: string;
  description: string;
}

interface RiskConfig {
  questions: RiskQuestion[];
  logChurnWeight: number;
}

interface RiskFactors {
  [key: string]: Answer | undefined | number;
  logChurn: number;
}

interface RiskTier {
  name: string;
  minScore: number;
  status: 'success' | 'pending' | 'failure';
  description: string;
}

const RISK_TIERS: RiskTier[] = [
  {name: 'Low', minScore: 0, status: 'success', description: 'Routine change, standard review required'},
  {name: 'Medium', minScore: 2, status: 'success', description: 'Moderate risk, additional review recommended'},
  {name: 'High', minScore: 4, status: 'pending', description: 'High risk, CODEOWNER approval required'},
  {
    name: 'Critical',
    minScore: 6,
    status: 'failure',
    description: 'Critical risk, requires rework or team lead override'
  }
];

// Load configuration
const configPath = path.join(__dirname, 'config', 'risk-questions.json');
const riskConfig: RiskConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

async function calculateLogChurn(): Promise<number> {
  let output = '';
  await exec('git', ['diff', '--numstat', 'origin/main...HEAD'], {
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString();
      }
    }
  });

  let totalLines = 0;
  const lines = output.trim().split('\n');

  for (const line of lines) {
    if (line.trim()) {
      const [added, deleted] = line.split('\t').map(num => parseInt(num) || 0);
      totalLines += added + deleted;
    }
  }

  return Math.log(1 + totalLines);
}

function parseAIResponse(response: string): RiskFactors {
  try {
    const cleaned = response
      .replace(/^```json\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    const factors: RiskFactors = { logChurn: -1 };

    // Initialize all question keys
    riskConfig.questions.forEach(q => {
      factors[q.key] = parsed[q.key];
    });

    return factors;
  } catch {
    const factors: RiskFactors = { logChurn: -1 };
    riskConfig.questions.forEach(q => {
      factors[q.key] = undefined;
    });
    return factors;
  }
}

function calculateRiskScore(factors: RiskFactors): number {
  let score = 0;

  riskConfig.questions.forEach(q => {
    const factor = factors[q.key] as Answer | undefined;
    if (factor?.answer === 'Yes') {
      score += q.weight;
    }
  });

  score += (factors.logChurn ? factors.logChurn : 0) * riskConfig.logChurnWeight;

  return Math.round(score * 100) / 100;
}

function getRiskTier(score: number): RiskTier {
  for (let i = RISK_TIERS.length - 1; i >= 0; i--) {
    if (score >= RISK_TIERS[i].minScore) {
      return RISK_TIERS[i];
    }
  }
  return RISK_TIERS[0];
}

async function generateRiskComment(score: number, tier: RiskTier, factors: RiskFactors): Promise<string> {
  const results = riskConfig.questions.map(q => {
    const factor = factors[q.key] as Answer | undefined;
    return {
      question: q.description,
      risk: factor?.answer?.toLowerCase() === 'yes',
      answer: factor?.answer,
      evidence: factor?.evidence
    };
  });

  const activeFactors = results.filter(r => r.risk);

  return `## 🚨 Risk Assessment Results

**Risk Score:** ${score}
**Risk Tier:** **${tier.name}**
**Status:** ${tier.description}

### AI-Powered Risk Analysis

${results.map(r => `**${r.question}**
**Answer:** ${r.answer} ${r.risk ? '⚠️' : '✅'}
${r.evidence ? `**Evidence:** ${r.evidence}` : ''}`).join('\n\n')}

**Code Churn Factor:** ${factors.logChurn?.toFixed(1)} (${Math.round(factors.logChurn * riskConfig.logChurnWeight)} points)

### Risk Factors Detected:
${activeFactors.length > 0 ? activeFactors.map(f => `- ${f.question.split(':')[0]} ⚠️`).join('\n') : '- No significant risk factors detected ✅'}

### Next Steps:
${tier.name === 'Critical' ? '❌ This PR cannot be merged. Please reduce risk factors or seek team lead override.' :
    tier.name === 'High' ? '⏸️ CODEOWNER approval required before merge.' :
      tier.name === 'Medium' ? '⚠️ Additional peer review recommended.' :
        '✅ Standard review process applies.'}

---
*Risk assessment performed automatically by SRA v1.0 using AI analysis of code changes.*`;
}

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', {required: true});
    const aiResponse = core.getInput('ai-response', {required: true});

    core.info(`Raw AI response: ${aiResponse}`);

    const octokit = github.getOctokit(token);
    const {context} = github;
    const prNumber = context.payload.pull_request?.number;

    if (!prNumber) {
      throw new Error('Not running in pull request context');
    }

    const factors = parseAIResponse(aiResponse);
    core.info(`Parsed risk factors: ${JSON.stringify(factors, null, 2)}`);

    factors.logChurn = await calculateLogChurn();
    core.info(`Calculated log churn: ${factors.logChurn}`);

    const riskScore = calculateRiskScore(factors);
    core.info(`Calculated risk score: ${riskScore}`);

    const riskTier = getRiskTier(riskScore);
    core.info(`Determined risk tier: ${JSON.stringify(riskTier)}`);

    const comment = await generateRiskComment(riskScore, riskTier, factors);
    core.info(`Generated risk comment: ${comment}`);

    const {data: comments} = await octokit.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber
    });
    core.info(`Found ${comments.length} existing comments on PR #${prNumber}`);

    const existingComment = comments.find(c => c.body?.includes('Risk Assessment Results'));

    if (existingComment) {
      await octokit.rest.issues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: existingComment.id,
        body: comment
      });
    } else {
      await octokit.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber,
        body: comment
      });
    }

    core.setOutput('risk-score', riskScore.toString());
    core.setOutput('risk-tier', riskTier.name);
    core.setOutput('status', riskTier.status);

  } catch (error) {
    core.setFailed(`Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

run();
