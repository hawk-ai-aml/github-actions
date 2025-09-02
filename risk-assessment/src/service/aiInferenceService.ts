import * as core from '@actions/core';
import {OpenAI} from 'openai';
import {RiskConfig} from '@/types';

export interface InferenceRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }>;
  modelName: string;
  maxTokens: number;
  endpoint: string;
  token: string;
  responseFormat?: { type: 'json_schema'; json_schema: unknown };
}

export class AIInferenceService {
  private static readonly DEFAULT_MODEL = 'openai/gpt-4o';
  private static readonly DEFAULT_MAX_TOKENS = 1000;
  private static readonly DEFAULT_ENDPOINT = 'https://models.github.ai/inference';

  static async performRiskAssessment(
    token: string,
    prTitle: string,
    prBody: string,
    fileSummary: string,
    fileDiffs: string,
    selectedFiles: number,
    totalFiles: number,
    riskConfig: RiskConfig,
    headRef: string,
    repository: string
  ): Promise<string> {
    const startTime = Date.now();
    core.info('🚀 Starting AI risk assessment...');

    const prompt = this.buildRiskAssessmentPrompt(
      prTitle,
      prBody,
      fileSummary,
      fileDiffs,
      selectedFiles,
      totalFiles,
      riskConfig,
      headRef,
      repository
    );

    const request: InferenceRequest = {
      messages: [
        {role: 'user', content: prompt}
      ],
      modelName: this.DEFAULT_MODEL,
      maxTokens: this.DEFAULT_MAX_TOKENS,
      endpoint: this.DEFAULT_ENDPOINT,
      token
    };

    // Try primary model first, fallback to alternative on failure
    try {
      core.info('Attempting risk assessment with primary model (gpt-4.1)');
      const response = await this.simpleInference({...request, modelName: 'openai/gpt-4.1'});

      const duration = Date.now() - startTime;
      core.info(`Primary model success - Duration: ${duration}ms`);

      return response;
    } catch (error) {
      const primaryDuration = Date.now() - startTime;
      core.warning(`Primary model failed after ${primaryDuration}ms: ${error instanceof Error ? error.message : 'Unknown error'}`);
      core.info('Falling back to secondary model');

      try {
        const fallbackStartTime = Date.now();
        const response = await this.simpleInference(request);

        const fallbackDuration = Date.now() - fallbackStartTime;
        const totalDuration = Date.now() - startTime;
        core.info(`Fallback model success - Fallback duration: ${fallbackDuration}ms, Total duration: ${totalDuration}ms`);
        core.setOutput('fallback', 'true');

        return response;
      } catch (fallbackError) {
        const totalDuration = Date.now() - startTime;
        core.error(`Both models failed after ${totalDuration}ms`);
        core.setOutput('fallback', 'true');
        throw new Error(`Inference failed: Primary model: ${error instanceof Error ? error.message : 'Unknown error'}, Fallback model: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
      }
    }
  }

  private static buildRiskAssessmentPrompt(
    prTitle: string,
    prBody: string,
    fileSummary: string,
    fileDiffs: string,
    selectedFiles: number,
    totalFiles: number,
    riskConfig: RiskConfig,
    headRef: string,
    repository: string
  ): string {
    const questions = riskConfig.questions
      .map((q, index) => `${index + 1}. ${q.key}: ${q.question} Max Weight: ${q.maxWeight}`)
      .join('\n');

    const jsonStructure = riskConfig.questions.reduce((acc, q) => {
      acc[q.key] = {
        evidence: "❌ if no, only if yes then evidence",
        answer: "Yes/No",
        weight: "0 <= weight <= maxWeight; string field"
      };
      return acc;
    }, {} as Record<string, any>);

    return `Risk assessment for PR. For each question, provide evidence and score (0 to max weight).

PR: ${prTitle}
Description: 
\`\`\`
${prBody}
\`\`\`

Files (${selectedFiles}/${totalFiles} analyzed):
${fileSummary}

Key Changes:
${fileDiffs}

Questions:
${questions}

Response format: ${JSON.stringify(jsonStructure, null, 2)}

Rules:
- Evidence: Specific findings from code/PR. If no evidence found, respond with exactly "❌" and nothing else
- Score: 0 if not applicable/no evidence, otherwise 0 to max weight
- Use GitHub links: https://github.com/${repository}/blob/${headRef}/{filepath}`;
  }

  private static async simpleInference(request: InferenceRequest): Promise<string> {
    core.info('Running AI inference without tools');

    const client = new OpenAI({
      apiKey: request.token,
      baseURL: request.endpoint,
    });

    const chatCompletionRequest: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      messages: request.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      max_completion_tokens: request.maxTokens,
      model: request.modelName,
    };

    if (request.responseFormat) {
      chatCompletionRequest.response_format = request.responseFormat as any;
    }

    const response = await client.chat.completions.create(chatCompletionRequest);
    const modelResponse = response.choices[0]?.message?.content;

    core.info(`Model response received: ${modelResponse ? 'Success' : 'No content'}`);

    if (!modelResponse) {
      throw new Error('No response content received from AI model');
    }

    return modelResponse;
  }
}
