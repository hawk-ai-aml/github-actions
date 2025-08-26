import './setup';
import * as core from '@actions/core';
import {run} from '@/index';
import {createMockAIResponse, createMockConfig, encodeConfig, TestSetup} from './utils/test-helpers';

describe('Risk Assessment', () => {
  let testSetup: TestSetup;
  const mockConfig = createMockConfig();

  beforeEach(() => {
    testSetup = new TestSetup();
  });

  describe('run function integration tests', () => {
    it('should complete successfully with valid inputs and low risk', async () => {
      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig),
          'llm-response': createMockAIResponse({
            authentication: {answer: 'No', evidence: 'No auth changes', weight: "0.3"},
            schema: {answer: 'No', evidence: 'No schema changes', weight: "0.5"},
            performance: {answer: 'No', evidence: 'No performance issues', weight: "0.7"},
            dependencies: {answer: 'No', evidence: 'No dependency changes', weight: "0.9"}
          })
        })
        .setGitDiff({files: [{added: 5, deleted: 2, filename: 'file1.ts'}]})
        .setExistingComments([]);

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();
      expect(testSetup.expectOutputSet('risk-score')).toBeTruthy();
      expect(testSetup.expectOutputSet('risk-tier')).toBeTruthy();
    });

    it('should complete successfully with high risk factors', async () => {
      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig),
          'llm-response': createMockAIResponse({
            authentication: {answer: 'Yes', evidence: 'Auth changes', weight: "0.5"},
            schema: {answer: 'Yes', evidence: 'Database schema modified', weight: "1"},
            apiIncompatibility: {answer: 'Yes', evidence: 'Breaking API changes', weight: "2"}
          })
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

      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig),
          'llm-response': wrappedResponse
        })
        .setGitDiff({files: []})
        .setExistingComments([]);

      await run();
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should handle empty git diff output', async () => {
      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig),
          'llm-response': createMockAIResponse({
            authentication: {answer: 'No', evidence: 'No changes', weight: "0"},
            schema: {answer: 'No', evidence: 'No changes', weight: "0"}
          })
        })
        .setGitDiff({files: []})
        .setExistingComments([]);

      await run();
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should return success status in advisory mode regardless of risk tier', async () => {
      process.env.SRA_ENFORCE_MODE = 'false';

      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig),
          'llm-response': createMockAIResponse({
            authentication: {answer: 'Yes', evidence: 'High risk changes', weight: "1"},
            schema: {answer: 'Yes', evidence: 'Breaking schema changes', weight: "1.4"},
            apiIncompatibility: {answer: 'Yes', evidence: 'Breaking API changes', weight: "2"}
          })
        })
        .setGitDiff({files: [{added: 200, deleted: 100, filename: 'file1.ts'}]})
        .setExistingComments([]);

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();
      expect(testSetup.expectOutputSet('status')).toBeTruthy();

      delete process.env.SRA_ENFORCE_MODE;
    });

    it('should handle invalid AI response gracefully', async () => {
      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig),
          'llm-response': 'invalid json'
        })
        .setGitDiff({files: []})
        .setExistingComments([]);

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should update existing risk assessment comment', async () => {
      const existingComment = {
        id: 123,
        body: '# 🔍 Risk Assessment Results\nOld content...'
      };

      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig),
          'llm-response': createMockAIResponse({
            authentication: {answer: 'No', evidence: 'No changes', weight: "1"}
          })
        })
        .setGitDiff({files: []})
        .setExistingComments([existingComment]);

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should create new comment when none exists', async () => {
      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig),
          'llm-response': createMockAIResponse({
            authentication: {answer: 'No', evidence: 'No changes', weight: "0.7"}
          })
        })
        .setGitDiff({files: []})
        .setExistingComments([]);

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should fail when github-token is missing', async () => {
      testSetup.setInputs({
        'config': encodeConfig(mockConfig),
        'llm-response': '{}'
      });

      await run();
      testSetup.expectFailureWithMessage('Action failed');
    });

    it('should fail when config is missing', async () => {
      testSetup.setInputs({
        'github-token': 'token',
        'llm-response': '{}'
      });

      await run();
      testSetup.expectFailureWithMessage('No config provided');
    });
  });
});