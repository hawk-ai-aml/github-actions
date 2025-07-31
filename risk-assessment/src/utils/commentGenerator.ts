import {Answer, RiskConfig, RiskFactors, RiskQuestion, RiskTier, TemplateData} from "@/types";
import {loadTemplate, renderTemplate} from "./template";

export class CommentGenerator {
  static async generate(
    score: number,
    tier: RiskTier,
    factors: RiskFactors,
    riskConfig: RiskConfig,
    advisoryNote = ''
  ): Promise<string> {
    const templateData = this.buildTemplateData(score, tier, factors, riskConfig, advisoryNote);
    const template = loadTemplate();
    return renderTemplate(template, templateData);
  }

  private static buildTemplateData(
    score: number,
    tier: RiskTier,
    factors: RiskFactors,
    riskConfig: RiskConfig,
    advisoryNote: string
  ): TemplateData {
    const results = this.buildQuestionResults(factors, riskConfig.questions);
    const activeFactors = this.extractActiveFactors(results);

    return {
      score,
      tierName: tier.name + advisoryNote,
      tierDescription: tier.message,
      results,
      logChurn: factors.logChurn?.toFixed(1) || '0.0',
      logChurnPoints: Math.round((factors.logChurn || 0) * riskConfig.logChurnWeight * 100) / 100,
      logChurnWeight: riskConfig.logChurnWeight,
      codeChurn: factors.codeChurn?.toFixed(1) || '0.0',
      codeChurnPoints: Math.round((factors.codeChurn || 0) * riskConfig.codeChurnWeight * 100) / 100,
      codeChurnWeight: riskConfig.codeChurnWeight,
      halsteadComplexity: factors.halsteadComplexity?.toFixed(1) || '0.0',
      halsteadComplexityPoints: Math.round((factors.halsteadComplexity || 0) * riskConfig.halsteadComplexityWeight * 100) / 100,
      halsteadComplexityWeight: riskConfig.halsteadComplexityWeight,
      cognitiveComplexity: factors.cognitiveComplexity?.toFixed(1) || '0.0',
      cognitiveComplexityPoints: Math.round((factors.cognitiveComplexity || 0) * riskConfig.cognitiveComplexityWeight * 100) / 100,
      cognitiveComplexityWeight: riskConfig.cognitiveComplexityWeight,
      activeFactors
    };
  }

  private static buildQuestionResults(factors: RiskFactors, questions: RiskQuestion[]): any[] {
    return questions.map((q: RiskQuestion) => {
      const factor = factors[q.key] as Answer | undefined;
      const isRisk = factor?.answer?.toLowerCase() === 'yes';
      const evidenceSanitized = factor?.evidence ? factor.evidence.replace(/[\r\n]+/g, ' ') : '';
      return {
        question: q.question,
        weight: factor?.weight,
        answer: factor?.answer,
        evidence: evidenceSanitized,
        risk: isRisk
      };
    });
  }

  private static extractActiveFactors(results: any[]): any[] {
    return results
      .filter((r: any) => r.risk)
      .map((f: any) => ({
        question: f.question.split(':')[0]
      }));
  }
}