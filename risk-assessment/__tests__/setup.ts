// Mock @actions/core
const mockCore = {
  getInput: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn()
};

// Mock @actions/github
const mockGithub = {
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
  },
  getOctokit: jest.fn()
};

// Mock @actions/exec
const mockExec = jest.fn();

// Mock fs
const mockFs = {
  readFileSync: jest.fn()
};

jest.doMock('@actions/core', () => mockCore);
jest.doMock('@actions/github', () => mockGithub);
jest.doMock('@actions/exec', () => ({exec: mockExec}));
jest.doMock('fs', () => mockFs);
jest.doMock('node:fs', () => mockFs);
