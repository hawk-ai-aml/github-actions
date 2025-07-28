import * as core from '@actions/core';
import * as github from '@actions/github';
import {exec} from '@actions/exec';
import * as fs from 'fs';
import {RiskConfig} from '../../src/types';

export interface MockInputs {
  'github-token'?: string;
  'ai-response'?: string;
  config?: string;
}

export interface MockGitDiffOutput {
  files?: Array<{ added: number; deleted: number; filename: string }>;
}

export class TestSetup {
  private mockOctokit = {
    rest: {
      issues: {
        listComments: jest.fn(),
        createComment: jest.fn(),
        updateComment: jest.fn()
      }
    }
  };

  constructor() {
    this.setupDefaultMocks();
  }

  private setupDefaultMocks(): void {
    jest.clearAllMocks();
    (github.getOctokit as jest.Mock).mockReturnValue(this.mockOctokit);
    (fs.readFileSync as jest.Mock).mockReturnValue('## Risk Assessment Results\n{{score}} {{tierName}}');
  }

  setInputs(inputs: MockInputs): this {
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      return inputs[name as keyof MockInputs] || '';
    });
    return this;
  }

  setGitDiff(output: MockGitDiffOutput): this {
    const gitOutput = output.files
      ? output.files.map(f => `${f.added}\t${f.deleted}\t${f.filename}`).join('\n')
      : '';

    (exec as jest.Mock).mockImplementation((cmd, args, options) => {
      options?.listeners?.stdout?.(Buffer.from(gitOutput));
      return Promise.resolve(0);
    });
    return this;
  }

  setExistingComments(comments: any[]): this {
    this.mockOctokit.rest.issues.listComments.mockResolvedValue({data: comments});
    return this;
  }

  expectCommentCreated(): jest.Mock {
    return this.mockOctokit.rest.issues.createComment;
  }

  expectCommentUpdated(): jest.Mock {
    return this.mockOctokit.rest.issues.updateComment;
  }

  expectOutputSet(key: string): jest.Mock {
    return (core.setOutput as jest.Mock).mock.calls.find(call => call[0] === key);
  }

  expectFailureWithMessage(message: string): void {
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining(message));
  }
}

export function createMockConfig(overrides: Partial<RiskConfig> = {}): RiskConfig {
  const defaultConfig: RiskConfig = {
    questions: [
      {
        key: 'breaking_changes',
        weight: 2,
        title: 'Breaking Changes',
        question: 'Does this PR introduce breaking changes?',
        description: 'Breaking API changes'
      },
      {
        key: 'security_impact',
        weight: 3,
        title: 'Security Impact',
        question: 'Does this PR affect security?',
        description: 'Security-related changes'
      }
    ],
    logChurnWeight: 0.1
  };

  return {...defaultConfig, ...overrides};
}

export function createMockAIResponse(responses: Record<string, { answer: string; evidence: string }>) {
  return JSON.stringify(responses);
}

export function encodeConfig(config: RiskConfig): string {
  return Buffer.from(JSON.stringify(config)).toString('base64');
}