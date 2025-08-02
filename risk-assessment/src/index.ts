import * as core from '@actions/core';
import {RiskTier} from '@/types';
import {MetricsRegistry} from "@/service/metricsRegistry";
import {InputValidator} from "@/utils/inputValidator";
import {RiskAssessment} from "@/risk/risk";
import {LlmResponseParser} from "@/utils/llmResponseParser";
import {ScoringService} from "@/service/scoringService";
import {CommentGenerator} from "@/utils/commentGenerator";
import {GithubService} from "@/service/githubService";

class RiskAssessmentRunner {
  private static readonly riskAssessment = new RiskAssessment();

  static async execute(): Promise<void> {
    const {token, aiResponse, riskConfig, prNumber} = await InputValidator.validate();

    core.info(`Raw AI response: ${aiResponse}`);
    const aiFactors = LlmResponseParser.parse(aiResponse, riskConfig);
    core.info(`Parsed risk factors: ${JSON.stringify(aiFactors, null, 2)}`);

    const metricFactors = await MetricsRegistry.calculateAll();
    const factors = {...aiFactors, ...metricFactors};

    const {totalScore: riskScore} = ScoringService.calculate(factors, riskConfig);
    core.info(`Calculated risk score: ${riskScore}`);

    const riskTier = this.riskAssessment.getRiskTier(riskScore);
    core.info(`Determined risk tier: ${JSON.stringify(riskTier)}`);

    const enforceMode = process.env.SRA_ENFORCE_MODE === 'true';
    const advisoryNote = enforceMode ? '' : ' (Advisory Mode - Not Enforced)';

    const comment = await CommentGenerator.generate(riskScore, riskTier, factors, riskConfig, advisoryNote);
    core.info(`Generated risk comment: ${comment}`);

    await GithubService.upsertComment(token, prNumber, comment);

    this.setOutputs(riskScore, riskTier, enforceMode);
  }

  private static setOutputs(riskScore: number, riskTier: RiskTier, enforceMode: boolean): void {
    const finalStatus = enforceMode ? riskTier.status : 'success';

    core.setOutput('risk-score', riskScore.toString());
    core.setOutput('risk-tier', riskTier.name);
    core.setOutput('status', finalStatus);
  }
}

export async function run(): Promise<void> {
  try {
    await RiskAssessmentRunner.execute();
  } catch (error) {
    if (error instanceof Error && error.message === 'SRA_DISABLED') {
      return;
    }
    core.setFailed(`Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// noinspection JSIgnoredPromiseFromCall
run();
