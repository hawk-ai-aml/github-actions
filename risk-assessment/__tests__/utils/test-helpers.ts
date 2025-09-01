import * as core from '@actions/core';
import * as github from '@actions/github';
import simpleGit from 'simple-git';
import {Answer} from "@/types";

export interface MockGitFile {
  added: number;
  deleted: number;
  filename: string;
}

export interface MockComment {
  id: number;
  body: string;
}

export class TestSetup {
  private inputs: Record<string, string> = {};
  private outputs: Record<string, string> = {};
  private gitFiles: MockGitFile[] = [];
  private comments: MockComment[] = [];

  constructor() {
    this.setupMocks();
  }

  private setupMocks(): void {
    // Setup core mocks
    (core.getInput as jest.Mock).mockImplementation((name: string, options?: { required?: boolean }) => {
      const value = this.inputs[name] || '';
      if (options?.required && !value) {
        throw new Error(`Input required and not supplied: ${name}`);
      }
      return value;
    });
    (core.setOutput as jest.Mock).mockImplementation((name: string, value: string) => {
      this.outputs[name] = value;
    });
    (core.setFailed as jest.Mock).mockClear();
    (core.info as jest.Mock).mockClear();
    (core.warning as jest.Mock).mockClear();

    // Setup git mocks
    const mockGit = {
      diff: jest.fn(),
      raw: jest.fn(),
      log: jest.fn()
    };
    (simpleGit as jest.Mock).mockReturnValue(mockGit);

    // Setup GitHub API mocks
    const mockOctokit = {
      rest: {
        pulls: {
          listFiles: jest.fn().mockResolvedValue({
            data: this.gitFiles.map(f => ({
              filename: f.filename,
              additions: f.added,
              deletions: f.deleted,
              changes: f.added + f.deleted,
              status: 'modified',
              patch: `@@ -1,1 +1,1 @@\n-old line\n+new line`
            }))
          })
        },
        issues: {
          listComments: jest.fn().mockResolvedValue({data: this.comments}),
          createComment: jest.fn().mockResolvedValue({data: {id: 456}}),
          updateComment: jest.fn().mockResolvedValue({data: {id: 456}})
        }
      }
    };
    (github.getOctokit as jest.Mock).mockReturnValue(mockOctokit);

    // Setup AI inference and PR context service mocks with default responses
    const {AIInferenceService} = require('@/service/aiInferenceService');
    const {PRContextService} = require('@/service/prContextService');

    PRContextService.gatherContext.mockResolvedValue({
      title: 'Test PR',
      body: 'Test PR description',
      fileSummary: this.gitFiles.map(f => `${f.filename}: modified (+${f.added}/-${f.deleted})`).join('\n'),
      fileDiffs: 'Mock file diffs',
      selectedFiles: this.gitFiles.length,
      totalFiles: this.gitFiles.length,
      headRef: 'feature/test'
    });

    // Default AI response - will be overridden in individual tests
    AIInferenceService.performRiskAssessment.mockResolvedValue(
      JSON.stringify({
        authentication: {answer: 'No', evidence: 'No changes', weight: "0"},
        schema: {answer: 'No', evidence: 'No changes', weight: "0"}
      })
    );
  }

  setInputs(inputs: Record<string, string>): this {
    this.inputs = {...this.inputs, ...inputs};
    return this;
  }

  setGitDiff(config: { files: MockGitFile[] }): this {
    this.gitFiles = config.files;

    const mockGit = (simpleGit as jest.Mock)();

    // Mock git diff --name-only output
    const fileNames = this.gitFiles.map(f => f.filename).join('\n');
    mockGit.diff.mockResolvedValue(fileNames);

    // Mock git diff --numstat output
    const numStatOutput = this.gitFiles
      .map(f => `${f.added}\t${f.deleted}\t${f.filename}`)
      .join('\n');
    mockGit.raw.mockResolvedValue(numStatOutput);

    // Mock git log output
    mockGit.log.mockResolvedValue({
      all: [{hash: 'abc123', date: '2023-01-01', message: 'test commit'}],
      latest: {hash: 'abc123'}
    });

    return this;
  }

  setExistingComments(comments: MockComment[]): this {
    this.comments = comments;
    const mockOctokit = (github.getOctokit as jest.Mock)();
    mockOctokit.rest.issues.listComments.mockResolvedValue({data: comments});
    return this;
  }

  expectOutputSet(name: string): string | undefined {
    return this.outputs[name];
  }
}

export function createMockConfig() {
  return {
    questions: [
      {
        key: 'authentication',
        question: 'Any authentication changes?',
        weight: 5
      },
      {
        key: 'schema',
        question: 'Any schema changes?',
        weight: 4
      },
      {
        key: 'apiIncompatibility',
        question: 'Any breaking API changes?',
        weight: 6
      },
      {
        key: 'performance',
        question: 'Any impactful performance changes?',
        weight: 3
      },
      {
        key: 'dependencies',
        question: 'Any dependency changes?',
        weight: 2
      }
    ],
    codeChurnWeight: 0.2,
    cognitiveComplexityWeight: 0.4
  };
}

export function createMockAIResponse(factors: Record<string, Answer>): string {
  return JSON.stringify(factors);
}

export function encodeConfig(config: any): string {
  return Buffer.from(JSON.stringify(config)).toString('base64');
}
