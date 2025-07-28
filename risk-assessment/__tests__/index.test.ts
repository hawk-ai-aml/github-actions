import './setup';
import * as core from '@actions/core';
import {run} from '../src';
import {createMockAIResponse, createMockConfig, encodeConfig, TestSetup} from './utils/test-helpers';

describe('Risk Assessment', () => {
  let testSetup: TestSetup;
  const mockConfig = createMockConfig();

  beforeEach(() => {
    testSetup = new TestSetup();
  });

  describe('calculateLogChurn', () => {
    it('should calculate log churn correctly', async () => {
      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig),
          'ai-response': createMockAIResponse({
            breaking_changes: {answer: 'No', evidence: 'No API changes'},
            security_impact: {answer: 'No', evidence: 'No security changes'}
          })
        })
        .setGitDiff({
          files: [{added: 10, deleted: 5, filename: 'file1.ts'}]
        })
        .setExistingComments([]);

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should handle empty git diff output', async () => {
      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig),
          'ai-response': createMockAIResponse({
            breaking_changes: {answer: 'No', evidence: 'No changes'},
            security_impact: {answer: 'No', evidence: 'No changes'}
          })
        })
        .setGitDiff({files: []})
        .setExistingComments([]);

      await run();
      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('parseAIResponse', () => {
    it('should parse valid JSON response', async () => {
      const aiResponse = createMockAIResponse({
        breaking_changes: {answer: 'Yes', evidence: 'API removed'},
        security_impact: {answer: 'No', evidence: 'No security changes'}
      });

      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig),
          'ai-response': aiResponse
        })
        .setGitDiff({files: []})
        .setExistingComments([]);

      await run();
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should handle JSON wrapped in code blocks', async () => {
      const wrappedResponse = '```json\n' + createMockAIResponse({
        breaking_changes: {answer: 'Yes', evidence: 'API removed'},
        security_impact: {answer: 'No', evidence: 'No security changes'}
      }) + '\n```';

      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig),
          'ai-response': wrappedResponse
        })
        .setGitDiff({files: []})
        .setExistingComments([]);

      await run();
      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('calculateRiskScore', () => {
    it('should calculate high risk score with Yes answers', async () => {
      testSetup
        .setInputs({
          'github-token': 'mock-token',
          'config': encodeConfig(mockConfig),
          'ai-response': createMockAIResponse({
            breaking_changes: {answer: 'Yes', evidence: 'API removed'},
            security_impact: {answer: 'Yes', evidence: 'Auth changes'}
          })
        })
        .setGitDiff({files: [{added: 100, deleted: 50, filename: 'file1.ts'}]})
        .setExistingComments([]);

      await run();

      expect(testSetup.expectOutputSet('risk-score')).toBeTruthy();
      expect(testSetup.expectOutputSet('risk-tier')).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('should fail when github-token is missing', async () => {
      testSetup.setInputs({
        'config': encodeConfig(mockConfig),
        'ai-response': '{}'
      });

      await run();
      testSetup.expectFailureWithMessage('Action failed');
    });

    it('should fail when config is missing', async () => {
      testSetup.setInputs({
        'github-token': 'token',
        'ai-response': '{}'
      });

      await run();
      testSetup.expectFailureWithMessage('No config provided');
    });
  });
});