import {RiskConfig, RiskFactors, RiskQuestion} from "@/types";

export class LlmResponseParser {
  static parse(response: string, riskConfig: RiskConfig): RiskFactors {
    try {
      const responseSanitized = this.sanitizeResponse(response);
      const parsed = JSON.parse(responseSanitized);
      return this.mapParsedFactors(parsed, riskConfig);
    } catch {
      return this.createEmptyFactors(riskConfig);
    }
  }

  private static sanitizeResponse(response: string): string {
    return response
      .replace(/^```json\s*/i, '')
      .replace(/```$/i, '')
      .trim();
  }

  private static mapParsedFactors(parsed: any, riskConfig: RiskConfig): RiskFactors {
    const factors: RiskFactors = this.createBaseFactors();
    riskConfig.questions.forEach((q: RiskQuestion) => {
      factors[q.key] = parsed[q.key];
    });
    return factors;
  }

  private static createEmptyFactors(riskConfig: RiskConfig): RiskFactors {
    const factors: RiskFactors = this.createBaseFactors();
    riskConfig.questions.forEach((q: RiskQuestion) => {
      factors[q.key] = undefined;
    });
    return factors;
  }

  private static createBaseFactors(): RiskFactors {
    return {
      logChurn: -1,
      codeChurn: -1,
      cognitiveComplexity: -1
    };
  }
}