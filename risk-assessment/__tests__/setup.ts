import {jest} from '@jest/globals';

// Mock @actions/core
jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  info: jest.fn(),
  warning: jest.fn()
}));

// Mock @actions/github
jest.mock('@actions/github', () => ({
  getOctokit: jest.fn(() => ({
    rest: {
      issues: {
        listComments: jest.fn(),
        createComment: jest.fn(),
        updateComment: jest.fn()
      }
    }
  })),
  context: {
    repo: {
      owner: 'test-owner',
      repo: 'test-repo'
    },
    payload: {
      pull_request: {
        number: 123
      }
    }
  }
}));

// Mock simple-git
jest.mock('simple-git', () => {
  return jest.fn(() => ({
    diff: jest.fn(),
    raw: jest.fn(),
    log: jest.fn()
  }));
});

// Mock node:fs
jest.mock('node:fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  statSync: jest.fn()
}));

// Mock node:path
jest.mock('node:path', () => ({
  resolve: jest.fn((...args) => args.join('/')),
  join: jest.fn((...args) => args.join('/'))
}));

// Set up environment
process.env.GITHUB_WORKSPACE = '/mock/workspace';
process.env.GITHUB_REPOSITORY = 'test-owner/test-repo';
