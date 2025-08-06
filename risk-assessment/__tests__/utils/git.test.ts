import simpleGit from 'simple-git';
import {getBranches, getListOfChangedFiles} from '@/utils/git';

import '../setup';

// Mock simple-git
jest.mock('simple-git', () => {
  const mockGit = {
    log: jest.fn(),
    raw: jest.fn(),
    diff: jest.fn()
  };

  return jest.fn(() => mockGit);
});

const mockGit = simpleGit() as jest.Mocked<ReturnType<typeof simpleGit>>;

describe('git utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GITHUB_BASE_REF;
  });

  describe('getBranches', () => {
    it('should return base branch with fallbacks when GITHUB_BASE_REF is set', () => {
      process.env.GITHUB_BASE_REF = 'develop';
      const branches = getBranches();
      expect(branches).toEqual(['origin/develop', 'origin/main', 'origin/master']);
    });

    it('should return only fallback branches when GITHUB_BASE_REF is not set', () => {
      const branches = getBranches();
      expect(branches).toEqual(['origin/main', 'origin/master']);
    });
  });

  describe('getListOfChangedFiles', () => {
    beforeEach(() => {
      process.env.GITHUB_BASE_REF = 'main';
    });

    it('should return filtered list of relevant changed files', async () => {
      const mockDiffOutput = `src/utils/helper.ts
src/components/Button.tsx
src/__tests__/helper.test.ts
node_modules/package/index.js
dist/bundle.js
README.md
package-lock.json
src/styles.css`;

      mockGit.diff.mockResolvedValue(mockDiffOutput);

      const result = await getListOfChangedFiles();

      expect(mockGit.diff).toHaveBeenCalledWith(['--name-only', 'origin/main...HEAD']);
      expect(result).toEqual([
        'src/utils/helper.ts',
        'src/components/Button.tsx'
      ]);
    });

    it('should filter out test files', async () => {
      const mockDiffOutput = `src/utils.ts
src/utils.test.ts
src/utils.spec.js
src/__tests__/component.test.tsx
tests/integration.js`;

      mockGit.diff.mockResolvedValue(mockDiffOutput);

      const result = await getListOfChangedFiles();

      expect(result).toEqual(['src/utils.ts']);
    });

    it('should filter out non-code files', async () => {
      const mockDiffOutput = `src/component.tsx
README.md
package.json
.env
.DS_Store
Thumbs.db
styles.css
image.png`;

      mockGit.diff.mockResolvedValue(mockDiffOutput);

      const result = await getListOfChangedFiles();

      expect(result).toEqual(['src/component.tsx']);
    });

    it('should handle empty diff output', async () => {
      mockGit.diff.mockResolvedValue('');

      const result = await getListOfChangedFiles();

      expect(result).toEqual([]);
    });

    it('should handle diff output with only whitespace', async () => {
      mockGit.diff.mockResolvedValue('   \n  \n   ');

      const result = await getListOfChangedFiles();

      expect(result).toEqual([]);
    });
  });
});
