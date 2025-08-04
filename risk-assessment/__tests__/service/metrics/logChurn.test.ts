import {logChurnCalculator} from '@/service/metrics/logChurn';
import {TestSetup} from '../../utils/test-helpers';
import * as core from '@actions/core';
import * as git from '@/utils/git';

jest.mock('@/utils/git');

describe('logChurn', () => {

  beforeEach(() => {
    new TestSetup();
    jest.clearAllMocks();
  });

  it('should return 0 when no diff stats found', async () => {
    (git.getDiffStats as jest.Mock).mockResolvedValue(null);

    const result = await logChurnCalculator.calculate();

    expect(result).toBe(0);
    expect(core.warning).toHaveBeenCalledWith('Could not calculate log churn - no diff stats found');
  });

  it('should return 0 when diff stats is empty string', async () => {
    (git.getDiffStats as jest.Mock).mockResolvedValue('');

    const result = await logChurnCalculator.calculate();

    expect(result).toBe(0);
  });

  it('should calculate log churn for single file with additions and deletions', async () => {
    (git.getDiffStats as jest.Mock).mockResolvedValue('5\t3\tfile1.ts');

    const result = await logChurnCalculator.calculate();

    const expectedChurn = Math.log(1 + 5 + 3); // Math.log(9)
    expect(result).toBeCloseTo(expectedChurn, 5);
  });

  it('should calculate log churn for multiple files', async () => {
    const diffStats = [
      '10\t5\tfile1.ts',
      '3\t2\tfile2.js',
      '7\t1\tfile3.py'
    ].join('\n');

    (git.getDiffStats as jest.Mock).mockResolvedValue(diffStats);

    const result = await logChurnCalculator.calculate();

    const expectedTotal = 10 + 5 + 3 + 2 + 7 + 1; // 28
    const expectedChurn = Math.log(1 + expectedTotal); // Math.log(29)
    expect(result).toBeCloseTo(expectedChurn, 5);
  });

  it('should handle files with only additions', async () => {
    (git.getDiffStats as jest.Mock).mockResolvedValue('15\t0\tnew-file.ts');

    const result = await logChurnCalculator.calculate();

    const expectedChurn = Math.log(1 + 15);
    expect(result).toBeCloseTo(expectedChurn, 5);
  });

  it('should handle files with only deletions', async () => {
    (git.getDiffStats as jest.Mock).mockResolvedValue('0\t8\tdeleted-file.ts');

    const result = await logChurnCalculator.calculate();

    const expectedChurn = Math.log(1 + 8);
    expect(result).toBeCloseTo(expectedChurn, 5);
  });

  it('should handle zero changes in files', async () => {
    (git.getDiffStats as jest.Mock).mockResolvedValue('0\t0\tunchanged-file.ts');

    const result = await logChurnCalculator.calculate();

    expect(result).toBe(0); // Math.log(1) = 0
  });

  it('should ignore empty lines in diff stats', async () => {
    const diffStats = [
      '5\t3\tfile1.ts',
      '',
      '2\t1\tfile2.js',
      '   ',
      '4\t2\tfile3.py'
    ].join('\n');

    (git.getDiffStats as jest.Mock).mockResolvedValue(diffStats);

    const result = await logChurnCalculator.calculate();

    const expectedTotal = 5 + 3 + 2 + 1 + 4 + 2; // 17
    const expectedChurn = Math.log(1 + expectedTotal);
    expect(result).toBeCloseTo(expectedChurn, 5);
  });

  it('should handle malformed lines gracefully', async () => {
    const diffStats = [
      '5\t3\tfile1.ts',
      'invalid\tline\tfile2.js',
      '2\t1\tfile3.py'
    ].join('\n');

    (git.getDiffStats as jest.Mock).mockResolvedValue(diffStats);

    const result = await logChurnCalculator.calculate();

    const expectedTotal = 5 + 3 + 2 + 1; // Invalid line contributes 0
    const expectedChurn = Math.log(1 + expectedTotal);
    expect(result).toBeCloseTo(expectedChurn, 5);
  });

  it('should handle non-numeric values in diff stats', async () => {
    const diffStats = [
      '5\t3\tfile1.ts',
      '-\t-\tbinary-file.png',
      '2\t1\tfile3.py'
    ].join('\n');

    (git.getDiffStats as jest.Mock).mockResolvedValue(diffStats);

    const result = await logChurnCalculator.calculate();

    const expectedTotal = 5 + 3 + 2 + 1; // Binary file contributes 0
    const expectedChurn = Math.log(1 + expectedTotal);
    expect(result).toBeCloseTo(expectedChurn, 5);
  });

  it('should handle large numbers of changes', async () => {
    (git.getDiffStats as jest.Mock).mockResolvedValue('1000\t500\tlarge-file.ts');

    const result = await logChurnCalculator.calculate();

    const expectedChurn = Math.log(1 + 1500);
    expect(result).toBeCloseTo(expectedChurn, 5);
  });

  it('should handle diff stats with trailing whitespace', async () => {
    (git.getDiffStats as jest.Mock).mockResolvedValue('  5\t3\tfile1.ts  \n  ');

    const result = await logChurnCalculator.calculate();

    const expectedChurn = Math.log(1 + 8);
    expect(result).toBeCloseTo(expectedChurn, 5);
  });

  it('should return logarithmic value greater than linear sum for large changes', async () => {
    const diffStats = [
      '100\t50\tfile1.ts',
      '200\t75\tfile2.js'
    ].join('\n');

    (git.getDiffStats as jest.Mock).mockResolvedValue(diffStats);

    const result = await logChurnCalculator.calculate();
    const totalLines = 100 + 50 + 200 + 75; // 425
    expect(result).toBeLessThan(totalLines);
    expect(result).toBeCloseTo(Math.log(1 + totalLines), 5);
  });

  it('should handle mixed file types in diff stats', async () => {
    const diffStats = [
      '10\t5\tcomponent.tsx',
      '3\t2\tstyles.css',
      '7\t1\tscript.js',
      '5\t3\tREADME.md',
      '2\t0\tpackage.json'
    ].join('\n');

    (git.getDiffStats as jest.Mock).mockResolvedValue(diffStats);

    const result = await logChurnCalculator.calculate();

    const expectedTotal = 38; // 10 + 5 + 3 + 2 + 7 + 1 + 5 + 3 + 2 + 0
    const expectedChurn = Math.log(1 + expectedTotal);
    expect(result).toBeCloseTo(expectedChurn, 5);
  });
});
