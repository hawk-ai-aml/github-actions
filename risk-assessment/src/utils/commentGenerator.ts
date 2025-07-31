import {RiskConfig, RiskFactors, RiskTier} from "@/types";

export class CommentGenerator {
  static async generate(
    score: number,
    tier: RiskTier,
    factors: RiskFactors,
    riskConfig: RiskConfig,
    advisoryNote = ''
  ): Promise<string> {
    return "placeholder"
  }
}