import {RiskTier} from "@/types";
import riskTiersData from "./risk-tiers.json";

export class RiskAssessment {
  private readonly riskTiers: RiskTier[] = riskTiersData;

  getRiskTier(score: number): RiskTier {
    for (let i = this.riskTiers.length - 1; i >= 0; i--) {
      if (score >= this.riskTiers[i].minScore) {
        return this.riskTiers[i];
      }
    }
    return this.riskTiers[0];
  }
}
