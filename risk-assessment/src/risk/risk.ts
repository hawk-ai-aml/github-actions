import {RiskTier} from "@/types";

export class RiskAssessment {

  getRiskTier(score: number): RiskTier {
    return {name: "", message: "", status: "success", minScore: 0}; // Placeholder for actual implementation
  }
}
