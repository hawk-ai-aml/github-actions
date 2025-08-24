import {ScoringService} from '@/service/scoringService';
import {Answer, RiskConfig, RiskFactors, RiskQuestion} from '@/types';

describe('ScoringService', () => {
  const mockRiskConfig: RiskConfig = {
    questions: [
      { key: 'question1', title: 'Test Question 1', maxWeight: 3, question: "Is this a question?" },
      { key: 'question2', title: 'Test Question 2', maxWeight: 5, question: "This is a question?" }
    ] as RiskQuestion[],
    logChurnWeight: 0.1,
    codeChurnWeight: 0.2,
    cognitiveComplexityWeight: 0.25
  };

  const mockAnswers: Answer[] = [
    { weight: "2.5", answer: "answer", evidence: "evidence" },
    { weight: "1.8", answer: "answer", evidence: "evidence" }
  ];

  describe('calculate', () => {
    it('should calculate total score correctly with all factors present', () => {
      const factors: RiskFactors = {
        question1: mockAnswers[0],
        question2: mockAnswers[1],
        logChurn: 1.0,
        codeChurn: 2.0,
        cognitiveComplexity: 0.8
      };

      const result = ScoringService.calculate(factors, mockRiskConfig);

      expect(result.questionScore).toBe(4.3); // 2.5 + 1.8
      expect(result.metricScore).toBe(0.7); // (1.0*0.1) + (2.0*0.2) + (0.8*0.25)
      expect(result.totalScore).toBe(5); // Rounded to 2 decimal places
    });

    it('should handle missing question answers', () => {
      const factors: RiskFactors = {
        question1: mockAnswers[0],
        logChurn: 5,
        codeChurn: 10,
        cognitiveComplexity: 4
      };

      const result = ScoringService.calculate(factors, mockRiskConfig);

      expect(result.questionScore).toBe(2.5); // Only question1 answer
      expect(result.metricScore).toBe(3.5); // (5*0.1) + (10*0.2) + (4*0.25)
      expect(result.totalScore).toBe(6);
    });

    it('should handle zero values', () => {
      const factors: RiskFactors = {
        question1: { weight: "0", answer: "answer", evidence: "evidence" },
        question2: { weight: "0", answer: "answer", evidence: "evidence" },
        logChurn: 0,
        codeChurn: 0,
        cognitiveComplexity: 0
      };

      const result = ScoringService.calculate(factors, mockRiskConfig);

      expect(result.questionScore).toBe(0);
      expect(result.metricScore).toBe(0);
      expect(result.totalScore).toBe(0);
    });

    it('should handle empty questions array', () => {
      const configWithNoQuestions = { ...mockRiskConfig, questions: [] };
      const factors: RiskFactors = {
        logChurn: 10,
        codeChurn: 10,
        cognitiveComplexity: 10
      };

      const result = ScoringService.calculate(factors, configWithNoQuestions);

      expect(result.questionScore).toBe(0);
      expect(result.metricScore).toBe(5.5); // (10*0.1) + (10*0.2) + (10*0.25)
      expect(result.totalScore).toBe(5.5);
    });

    it('should handle negative weights and values', () => {
      const factors: RiskFactors = {
        question1: { weight: "-1.5", answer: "answer", evidence: "evidence" },
        logChurn: -5,
        codeChurn: 10,
        cognitiveComplexity: 2
      };

      const result = ScoringService.calculate(factors, mockRiskConfig);

      expect(result.questionScore).toBe(-1.5);
      expect(result.metricScore).toBe(2); // (-5*0.1) + (10*0.2) + (2*0.25)
      expect(result.totalScore).toBe(0.5);
    });
  });
});
