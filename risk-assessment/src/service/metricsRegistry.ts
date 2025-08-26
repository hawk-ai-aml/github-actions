import {RiskFactors} from "@/types";
import * as core from "@actions/core";
import {codeChurnCalculator} from "@/service/metrics/codeChurn";
import {cognitiveComplexityCalculator} from "@/service/metrics/cognitiveComplexity";

export class MetricsRegistry {
  static async calculateAll(): Promise<Partial<RiskFactors>> {
    const [codeChurn, cognitiveComplexity] = await Promise.all([
      this.calculateCodeChurn(),
      this.calculateCognitiveComplexity()
    ]);

    return {codeChurn, cognitiveComplexity};
  }

  private static async calculateCodeChurn(): Promise<number> {
    const result = await codeChurnCalculator.calculate();
    core.info(`Calculated code churn: ${result}`);
    return result;
  }

  private static async calculateCognitiveComplexity(): Promise<number> {
    const result = await cognitiveComplexityCalculator.calculate();
    core.info(`Calculated cognitive complexity: ${result}`);
    return result;
  }
}