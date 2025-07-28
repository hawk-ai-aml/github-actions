export interface RiskTier {
  name: string;
  minScore: number;
  status: 'success' | 'pending' | 'failure';
  description: string;
  message: string;
}

export const RISK_TIERS: RiskTier[] = [
  {
    name: 'Low',
    minScore: 0,
    status: 'success',
    description: 'Routine change, standard review required',
    message: '✅ Standard review process applies.'
  },
  {
    name: 'Medium',
    minScore: 2,
    status: 'success',
    description: 'Moderate risk, additional review recommended',
    message: '⚠️ Additional peer review recommended.'
  },
  {
    name: 'High',
    minScore: 4,
    status: 'pending',
    description: 'High risk, CODEOWNER approval required',
    message: '⏸️ Code owner approval required before merge.'
  },
  {
    name: 'Critical',
    minScore: 6,
    status: 'failure',
    description: 'Critical risk, requires rework or team lead override',
    message: '❌ This PR cannot be merged. Please reduce risk factors or seek team lead override.'
  }
];