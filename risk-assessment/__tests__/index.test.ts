import './setup';
import * as core from '@actions/core';
import {run} from '@/index';
import {createMockAIResponse, createMockConfig, encodeConfig, TestSetup} from './utils/test-helpers';

// Import the mocked services to set up responses
import {AIInferenceService} from '@/service/aiInferenceService';

describe('Risk Assessment', () => {
  let testSetup: TestSetup;
  const mockConfig = createMockConfig();

  beforeEach(() => {
    testSetup = new TestSetup();
  });

  describe('run function integration tests', () => {
    it('should complete successfully with valid inputs and low risk', async () => {
      // Mock AI response for low risk scenario
      (AIInferenceService.performRiskAssessment as jest.Mock).mockResolvedValue(
        createMockAIResponse({
          authentication: {answer: 'No', evidence: 'No auth changes', weight: "0.3"},
          schema: {answer: 'No', evidence: 'No schema changes', weight: "0.5"},
          performance: {answer: 'No', evidence: 'No performance issues', weight: "0.7"},
          dependencies: {answer: 'No', evidence: 'No dependency changes', weight: "0.9"}
        })
      );

      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig)
        })
        .setGitDiff({files: [{added: 5, deleted: 2, filename: 'file1.ts'}]})
        .setExistingComments([]);

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();
      expect(testSetup.expectOutputSet('risk-score')).toBeTruthy();
      expect(testSetup.expectOutputSet('risk-tier')).toBeTruthy();
    });

    it('should complete successfully with high risk factors', async () => {
      // Mock AI response for high risk scenario
      (AIInferenceService.performRiskAssessment as jest.Mock).mockResolvedValue(
        createMockAIResponse({
          authentication: {answer: 'Yes', evidence: 'Auth changes', weight: "0.5"},
          schema: {answer: 'Yes', evidence: 'Database schema modified', weight: "1"},
          apiIncompatibility: {answer: 'Yes', evidence: 'Breaking API changes', weight: "2"}
        })
      );

      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig)
        })
        .setGitDiff({files: [{added: 100, deleted: 50, filename: 'file1.ts'}]})
        .setExistingComments([]);

      await run();

      expect(testSetup.expectOutputSet('risk-score')).toBeTruthy();
      expect(testSetup.expectOutputSet('risk-tier')).toBeTruthy();
    });

    it('should handle JSON wrapped in code blocks', async () => {
      const wrappedResponse = '```json\n' + createMockAIResponse({
        authentication: {answer: 'Yes', evidence: 'Auth logic modified', weight: "0.8"},
        schema: {answer: 'No', evidence: 'No schema changes', weight: "0.2"}
      }) + '\n```';

      (AIInferenceService.performRiskAssessment as jest.Mock).mockResolvedValue(wrappedResponse);

      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig)
        })
        .setGitDiff({files: []})
        .setExistingComments([]);

      await run();
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should handle empty git diff output', async () => {
      (AIInferenceService.performRiskAssessment as jest.Mock).mockResolvedValue(
        createMockAIResponse({
          authentication: {answer: 'No', evidence: 'No changes', weight: "0"},
          schema: {answer: 'No', evidence: 'No changes', weight: "0"}
        })
      );

      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig)
        })
        .setGitDiff({files: []})
        .setExistingComments([]);

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();
      expect(testSetup.expectOutputSet('status')).toBeTruthy();
    });

    it('should return success status in advisory mode regardless of risk tier', async () => {
      process.env.SRA_ENFORCE_MODE = 'false';

      (AIInferenceService.performRiskAssessment as jest.Mock).mockResolvedValue(
        createMockAIResponse({
          authentication: {answer: 'Yes', evidence: 'High risk changes', weight: "1"},
          schema: {answer: 'Yes', evidence: 'High risk schema changes', weight: "1"}
        })
      );

      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig)
        })
        .setGitDiff({files: []})
        .setExistingComments([]);

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should update existing risk assessment comment', async () => {
      (AIInferenceService.performRiskAssessment as jest.Mock).mockResolvedValue(
        createMockAIResponse({
          authentication: {answer: 'No', evidence: 'No changes', weight: "0.7"}
        })
      );

      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig)
        })
        .setGitDiff({files: []})
        .setExistingComments([{id: 123, body: '## Risk Assessment\nOld content'}]);

      await run();
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should create new comment when none exists', async () => {
      (AIInferenceService.performRiskAssessment as jest.Mock).mockResolvedValue(
        createMockAIResponse({
          authentication: {answer: 'No', evidence: 'No changes', weight: "0"}
        })
      );

      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig)
        })
        .setGitDiff({files: []})
        .setExistingComments([]);

      try {
        await run();
        expect(core.setFailed).not.toHaveBeenCalled();
      } catch (error) {
        console.error('Actual error in test:', error);
        throw error;
      }
    });

    it('should handle missing or invalid inputs gracefully', async () => {
      testSetup.setInputs({
        'config': encodeConfig(mockConfig)
        // Missing 'github-token' - this should trigger validation error
      });

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();
      expect(testSetup.expectOutputSet('risk-score')).toBe('-1');
      expect(testSetup.expectOutputSet('risk-tier')).toBe('unknown');
      expect(testSetup.expectOutputSet('status')).toBe('unknown');
    });

    it('should handle invalid AI response gracefully', async () => {
      (AIInferenceService.performRiskAssessment as jest.Mock).mockResolvedValue('invalid json response');

      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig)
        })
        .setGitDiff({files: []})
        .setExistingComments([]);

      await run();

      // The system should handle invalid JSON gracefully and not fail
      expect(core.setFailed).not.toHaveBeenCalled();
      expect(testSetup.expectOutputSet('risk-score')).toBeTruthy();
      expect(testSetup.expectOutputSet('risk-tier')).toBeTruthy();
    });
  });
});