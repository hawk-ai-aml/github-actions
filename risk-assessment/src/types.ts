interface Answer {
  answer: string;
  evidence: string;
  weight: string;
}

interface RiskQuestion {
  key: string;
  maxWeight: number;
  title: string;
  question: string;
}

interface RiskConfig {
  questions: RiskQuestion[];
  codeChurnWeight: number;
  cognitiveComplexityWeight: number;
}

interface RiskFactors {
  [key: string]: Answer | undefined | number;

  codeChurn: number;
  cognitiveComplexity: number;
}

interface RiskTier {
  name: string;
  minScore: number;
  status: string;
  message: string;
}

interface Metric {
  name: string;

  calculate(): Promise<number>;
}

interface ValidationResult {
  token: string;
  riskConfig: RiskConfig;
  prNumber: number;
}

interface ScoreCalculation {
  questionScore: number;
  metricScore: number;
  totalScore: number;
}

interface TemplateData {
  score: number;
  tierName: string;
  tierDescription: string;
  results: any[];
  codeChurn: string;
  codeChurnPoints: number;
  codeChurnWeight: number;
  cognitiveComplexity: string;
  cognitiveComplexityPoints: number;
  cognitiveComplexityWeight: number;
  activeFactors: any[];
}

export {
  Answer,
  RiskQuestion,
  RiskConfig,
  RiskFactors,
  RiskTier,
  Metric,
  ValidationResult,
  ScoreCalculation,
  TemplateData
};
