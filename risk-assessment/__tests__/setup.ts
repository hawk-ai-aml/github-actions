import * as github from '@actions/github';

Object.defineProperty(github, 'context', {
  value: {
    payload: {
      pull_request: {
        number: 123,
        title: 'Test PR',
        body: 'Test PR description',
        head: {ref: 'feature/test'}
      }
    },
    repo: {owner: 'test-owner', repo: 'test-repo'}
  },
  writable: true,
  configurable: true
});

jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('simple-git');

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn()
  }
}));

jest.mock('@/service/aiInferenceService', () => ({
  AIInferenceService: {
    performRiskAssessment: jest.fn()
  }
}));

jest.mock('@/service/prContextService', () => ({
  PRContextService: {
    gatherContext: jest.fn()
  }
}));

jest.mock('@/utils/template', () => ({
  loadTemplate: jest.fn(() => `# Risk Assessment Results
Risk Level: **{{tierName}}**
Score: {{score}}
{{tierDescription}}
{{#if activeFactors}}
Active Factors:
{{#each activeFactors}}
- {{question}} ⚠️
{{/each}}
{{else}}
No active risk factors identified.
{{/if}}

## Details
{{#each results}}
| {{question}} | {{answer}} | {{weight}} | {{evidence}} |
{{/each}}`),
  renderTemplate: jest.fn((template, data) => {
    // Simple mock template rendering that handles undefined values safely
    let result = template || '';
    if (data) {
      Object.keys(data).forEach(key => {
        const value = data[key];
        const replacement = value !== undefined && value !== null ? String(value) : '';
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, replacement);
      });
    }
    return result;
  })
}));

process.env.GITHUB_WORKSPACE = '/mock/workspace';
process.env.GITHUB_REPOSITORY = 'test-owner/test-repo';
