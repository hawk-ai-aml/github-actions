export interface Answer {
  answer: string;
  evidence: string;
}

export interface RiskQuestion {
  key: string;
  weight: number;
  title: string;
  question: string;
  description: string;
}

export interface RiskConfig {
  questions: RiskQuestion[];
  logChurnWeight: number;
}

export interface RiskFactors {
  [key: string]: Answer | undefined | number;

  logChurn: number;
}
