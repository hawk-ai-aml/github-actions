import {codeChurnCalculator} from '@/service/metrics/codeChurn';
import {TestSetup} from '../../utils/test-helpers';
import * as core from '@actions/core';
import * as git from '@/utils/git';

jest.mock('@/utils/git');

describe('CodeChurn', () => {

  beforeEach(() => {
    new TestSetup();
    jest.clearAllMocks();
  });

  it('should return 0 when no changed files found', async () => {
    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue([]);

    const result = await codeChurnCalculator.calculate();

    expect(result).toBe(0);
    expect(core.warning).toHaveBeenCalledWith('Could not calculate code churn - no changed files found');
  });

  it('should return 0 when files have no commits', async () => {
    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['file1.ts']);
    (git.getSimpleLog as jest.Mock).mockResolvedValue([]);

    const result = await codeChurnCalculator.calculate();

    expect(result).toBe(0);
  });

  it('should assign minimal churn score for files modified only once', async () => {
    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['file1.ts']);
    (git.getSimpleLog as jest.Mock).mockResolvedValue(['commit1']);
    (git.getCommitDetails as jest.Mock).mockResolvedValue([]);

    const result = await codeChurnCalculator.calculate();

    expect(result).toBe(0.1);
    expect(core.info).toHaveBeenCalledWith(
      'File file1.ts: 1 change (new file), churn score: 0.10'
    );
  });

  it('should calculate churn for files with multiple commits', async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['file1.ts']);
    (git.getSimpleLog as jest.Mock).mockResolvedValue(['commit1', 'commit2', 'commit3']);
    (git.getCommitDetails as jest.Mock).mockResolvedValue([
      {hash: 'commit1', date: thirtyDaysAgo},
      {hash: 'commit2', date: sixtyDaysAgo},
      {hash: 'commit3', date: sixtyDaysAgo}
    ]);

    const result = await codeChurnCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('Code churn calculation: 1 files analyzed')
    );
  });

  it('should calculate weighted recent changes correctly', async () => {
    const now = new Date();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    const fiftyDaysAgo = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000);
    const hundredDaysAgo = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000);

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['file1.ts']);
    (git.getSimpleLog as jest.Mock).mockResolvedValue(['commit1', 'commit2', 'commit3', 'commit4']);
    (git.getCommitDetails as jest.Mock).mockResolvedValue([
      {hash: 'commit1', date: twentyDaysAgo},
      {hash: 'commit2', date: fiftyDaysAgo},
      {hash: 'commit3', date: hundredDaysAgo},
      {hash: 'commit4', date: hundredDaysAgo}
    ]);

    const result = await codeChurnCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File file1.ts: 4 changes')
    );
  });

  it('should handle multiple files and calculate average', async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['file1.ts', 'file2.ts']);
    (git.getSimpleLog as jest.Mock)
      .mockResolvedValueOnce(['commit1', 'commit2'])
      .mockResolvedValueOnce(['commit3', 'commit4', 'commit5']);
    (git.getCommitDetails as jest.Mock)
      .mockResolvedValueOnce([
        {hash: 'commit1', date: thirtyDaysAgo},
        {hash: 'commit2', date: thirtyDaysAgo}
      ])
      .mockResolvedValueOnce([
        {hash: 'commit3', date: thirtyDaysAgo},
        {hash: 'commit4', date: thirtyDaysAgo},
        {hash: 'commit5', date: thirtyDaysAgo}
      ]);

    const result = await codeChurnCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('Code churn calculation: 2 files analyzed')
    );
  });

  it('should handle errors gracefully and continue processing other files', async () => {
    const now = new Date();

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['file1.ts', 'file2.ts']);
    (git.getSimpleLog as jest.Mock)
      .mockRejectedValueOnce(new Error('Git error'))
      .mockResolvedValueOnce(['commit1', 'commit2']);
    (git.getCommitDetails as jest.Mock).mockResolvedValue([
      {hash: 'commit1', date: now},
      {hash: 'commit2', date: now}
    ]);

    const result = await codeChurnCalculator.calculate();

    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('Failed to analyze churn for file file1.ts')
    );
    expect(result).toBeGreaterThan(0);
  });

  it('should handle zero file age correctly', async () => {
    const now = new Date();

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['file1.ts']);
    (git.getSimpleLog as jest.Mock).mockResolvedValue(['commit1', 'commit2']);
    (git.getCommitDetails as jest.Mock).mockResolvedValue([
      {hash: 'commit1', date: now},
      {hash: 'commit2', date: now}
    ]);

    const result = await codeChurnCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File file1.ts: 2 changes over 0 days')
    );
  });
});
