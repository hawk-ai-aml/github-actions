import * as core from '@actions/core';
import {RiskTier} from '@/types';
import {MetricsRegistry} from "@/service/metricsRegistry";
import {InputValidator} from "@/utils/inputValidator";
import {RiskAssessment} from "@/risk/risk";
import {LlmResponseParser} from "@/utils/llmResponseParser";
import {ScoringService} from "@/service/scoringService";
import {CommentGenerator} from "@/utils/commentGenerator";
import {GithubService} from "@/service/githubService";
import {AIInferenceService} from "@/service/aiInferenceService";
import {PRContextService} from "@/service/prContextService";
import * as github from "@actions/github";

class RiskAssessmentRunner {
  private static readonly riskAssessment = new RiskAssessment();

  static async execute(): Promise<void> {
    const {token, riskConfig, prNumber} = await InputValidator.validate();

    // Gather PR context information
    core.info('Gathering PR context and changed files...');
    const prContext = await PRContextService.gatherContext(token, prNumber);
    core.info(`PR Context: ${prContext.title}`);
    core.info(`Files analyzed: ${prContext.selectedFiles}/${prContext.totalFiles}`);

    // Perform AI risk assessment
    core.info('Performing AI risk assessment...');
    const aiResponse = await AIInferenceService.performRiskAssessment(
      token,
      prContext.title,
      prContext.body,
      prContext.fileSummary,
      prContext.fileDiffs,
      prContext.selectedFiles,
      prContext.totalFiles,
      riskConfig,
      prContext.headRef,
      github.context.repo.owner + '/' + github.context.repo.repo
    );

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
    core.setOutput('risk-score', riskScore.toString());
    core.setOutput('risk-tier', riskTier.name);
    core.setOutput('status', riskTier.status);

    // Only fail the action if enforce mode is on AND the risk tier status is failure
    if (enforceMode && riskTier.status === 'failure') {
      core.setFailed(`Risk assessment failed: ${riskTier.message}`);
    }
  }

  static handleGenericRuntimeError(error: unknown): void {
    if (error instanceof Error && error.message === 'SRA_DISABLED') {
      return;
    }

    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
      core.error(`Stack trace: ${error.stack}`);
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = JSON.stringify(error);
      core.error(`Non-Error object thrown: ${errorMessage}`);
    }

    core.error(`Risk assessment error: ${errorMessage}`);

    // Set safe default outputs when an error occurs
    core.setOutput('risk-score', '-1');
    core.setOutput('risk-tier', 'unknown');
    core.setOutput('status', 'unknown');

    // Never fail the action due to errors - only log them
    core.warning('Risk assessment encountered an error but will not fail the action');
  }
}

export async function run(): Promise<void> {
  try {
    await RiskAssessmentRunner.execute();
  } catch (error) {
    // Log the error but don't fail the action
    RiskAssessmentRunner.handleGenericRuntimeError(error);
  }
}

// noinspection JSIgnoredPromiseFromCall
run();
