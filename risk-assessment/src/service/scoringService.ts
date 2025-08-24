import {Answer, RiskConfig, RiskFactors, RiskQuestion, ScoreCalculation} from "@/types";

export class ScoringService {
  static calculate(factors: RiskFactors, riskConfig: RiskConfig): ScoreCalculation {
    const questionScore = this.calculateQuestionScore(factors, riskConfig.questions);
    const metricScore = this.calculateMetricScore(factors, riskConfig);
    const totalScore = Math.round((questionScore + metricScore) * 100) / 100;

    return {questionScore, metricScore, totalScore};
  }

  private static calculateQuestionScore(factors: RiskFactors, questions: RiskQuestion[]): number {
    return questions.reduce((score, q) => {
      const factor = factors[q.key] as Answer | undefined;
      return score + (factor ? Number(factor.weight) : 0);
    }, 0);
  }

  private static calculateMetricScore(factors: RiskFactors, config: RiskConfig): number {
    const metrics = [
      factors.codeChurn * config.codeChurnWeight,
      factors.halsteadComplexity * config.halsteadComplexityWeight,
      factors.cognitiveComplexity * config.cognitiveComplexityWeight
    ];
    return metrics.reduce((sum, metric) => sum + metric, 0);
  }
}