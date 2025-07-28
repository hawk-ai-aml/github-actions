import * as core from '@actions/core';
import * as github from '@actions/github';
import {exec} from '@actions/exec';
import path from "node:path";
import * as fs from "node:fs";
import {RISK_TIERS, RiskTier} from './risk-config';
import {Answer, RiskConfig, RiskFactors, RiskQuestion} from './types';

const s = "use strict";

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

function parseAIResponse(response: string, riskConfig: RiskConfig): RiskFactors {
  try {
    const cleaned = response
      .replace(/^```json\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    const factors: RiskFactors = { logChurn: -1 };

    riskConfig.questions.forEach((q: RiskQuestion) => {
      factors[q.key] = parsed[q.key];
    });

    return factors;
  } catch {
    const factors: RiskFactors = { logChurn: -1 };
    riskConfig.questions.forEach((q: RiskQuestion) => {
      factors[q.key] = undefined;
    });
    return factors;
  }
}

function calculateRiskScore(factors: RiskFactors, riskConfig: RiskConfig): number {
  let score = 0;

  riskConfig.questions.forEach((q: RiskQuestion) => {
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

function loadTemplate(): string {
  const templatePath = path.resolve(__dirname, '..', 'src', 'templates', 'risk-comment.md');
  return fs.readFileSync(templatePath, 'utf8');
}

function renderTemplate(template: string, data: any): string {
  let result = template;

  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, data[key]);
  });

  result = result.replace(/{{#if activeFactors}}[\s\S]*?{{else}}([\s\S]*?){{\/if}}/g,
    data.activeFactors.length > 0 ? '' : '$1');

  result = result.replace(/{{#if activeFactors}}([\s\S]*?){{else}}[\s\S]*?{{\/if}}/g,
    data.activeFactors.length > 0 ? '$1' : '');

  if (data.activeFactors.length > 0) {
    const factorsList = data.activeFactors.map((f: any) => `- ${f.question} ⚠️`).join('\n');
    result = result.replace(/{{#each activeFactors}}[\s\S]*?{{\/each}}/g, factorsList);
  }

  // Handle results loop
  const resultsList = data.results.map((r: any) =>
    `**${r.question}**\n**Answer:** ${r.answer} ${r.risk ? '⚠️' : '✅'}\n${r.evidence ? `**Evidence:** ${r.evidence}` : ''}`
  ).join('\n\n');
  result = result.replace(/{{#each results}}[\s\S]*?{{\/each}}/g, resultsList);

  return result;
}

async function generateRiskComment(score: number, tier: RiskTier, factors: RiskFactors, riskConfig: RiskConfig): Promise<string> {
  const results = riskConfig.questions.map((q: RiskQuestion) => {
    const factor = factors[q.key] as Answer | undefined;
    return {
      question: q.description,
      risk: factor?.answer?.toLowerCase() === 'yes',
      answer: factor?.answer,
      evidence: factor?.evidence
    };
  });

  const activeFactors = results.filter((r: any) => r.risk).map((f: any) => ({
    question: f.question.split(':')[0]
  }));

  const template = loadTemplate();
  const templateData = {
    score,
    tierName: tier.name,
    tierDescription: tier.description,
    results,
    logChurn: factors.logChurn?.toFixed(1),
    churnPoints: Math.round(factors.logChurn * riskConfig.logChurnWeight),
    activeFactors,
    nextSteps: tier.message
  };

  return renderTemplate(template, templateData);
}

export async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', {required: true});
    const aiResponse = core.getInput('ai-response', {required: true});
    const configInput = core.getInput('config');

    const riskConfig: RiskConfig = configInput
      ? JSON.parse(Buffer.from(configInput, 'base64').toString())
      : null;

    if (!riskConfig) {
      core.setFailed('No config provided');
      return;
    }

    core.info(`Raw AI response: ${aiResponse}`);

    const octokit = github.getOctokit(token);
    const {context} = github;
    const prNumber = context.payload.pull_request?.number;

    if (!prNumber) {
      throw new Error('Not running in pull request context');
    }

    const factors = parseAIResponse(aiResponse, riskConfig);
    core.info(`Parsed risk factors: ${JSON.stringify(factors, null, 2)}`);

    factors.logChurn = await calculateLogChurn();
    core.info(`Calculated log churn: ${factors.logChurn}`);

    const riskScore = calculateRiskScore(factors, riskConfig);
    core.info(`Calculated risk score: ${riskScore}`);

    const riskTier = getRiskTier(riskScore);
    core.info(`Determined risk tier: ${JSON.stringify(riskTier)}`);

    const comment = await generateRiskComment(riskScore, riskTier, factors, riskConfig);
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
