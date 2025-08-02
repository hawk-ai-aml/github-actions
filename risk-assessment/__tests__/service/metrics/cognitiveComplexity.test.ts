// noinspection DuplicatedCode

import {cognitiveComplexityCalculator} from '@/service/metrics/cognitiveComplexity';
import {TestSetup} from '../../utils/test-helpers';
import * as core from '@actions/core';
import * as git from '@/utils/git';
import * as fs from 'node:fs';

jest.mock('@/utils/git');
jest.mock('node:fs');

describe('cognitiveComplexity', () => {

  beforeEach(() => {
    new TestSetup();
    jest.clearAllMocks();
  });

  it('should return 0 when no changed files found', async () => {
    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue([]);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBe(0);
    expect(core.warning).toHaveBeenCalledWith('Could not calculate cognitive complexity - no changed files found');
  });

  it('should filter only code files', async () => {
    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue([
      'file.txt',
      'image.png',
      'config.json',
      'script.js',
      'component.tsx'
    ]);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('simple code');

    const result = await cognitiveComplexityCalculator.calculate();

    expect(fs.readFileSync).toHaveBeenCalledTimes(2); // Only .js and .tsx files
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('should calculate basic complexity for simple control structures', async () => {
    const codeContent = `
      if (condition) {
        doSomething();
      }
      for (let i = 0; i < 10; i++) {
        process(i);
      }
    `;

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['test.js']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(codeContent);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File test.js: Cognitive complexity')
    );
  });

  it('should calculate higher complexity for nested structures', async () => {
    const codeContent = `
      if (condition1) {
        if (condition2) {
          while (condition3) {
            if (condition4) {
              doSomething();
            }
          }
        }
      }
    `;

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['test.js']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(codeContent);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File test.js: Cognitive complexity')
    );
  });

  it('should handle logical operators complexity', async () => {
    const codeContent = `
      if (condition1 && condition2 || condition3) {
        doSomething();
      }
      const result = test1 && test2 || test3 && test4;
    `;

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['test.js']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(codeContent);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File test.js: Cognitive complexity')
    );
  });

  it('should handle ternary operators complexity', async () => {
    const codeContent = `
      const value = condition ? value1 : value2;
      const complex = test1 ? (test2 ? value1 : value2) : value3;
    `;

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['test.js']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(codeContent);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File test.js: Cognitive complexity')
    );
  });

  it('should handle switch statements and cases', async () => {
    const codeContent = `
      switch (value) {
        case 'a':
          doA();
          break;
        case 'b':
          doB();
          break;
        default:
          doDefault();
      }
    `;

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['test.js']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(codeContent);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File test.js: Cognitive complexity')
    );
  });

  it('should calculate average complexity across multiple files', async () => {
    const simpleCode = 'function simple() { return true; }';
    const complexCode = `
      if (condition) {
        for (let i = 0; i < 10; i++) {
          if (i % 2 === 0) {
            process(i);
          }
        }
      }
    `;

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['simple.js', 'complex.js']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock)
      .mockReturnValueOnce(simpleCode)
      .mockReturnValueOnce(complexCode);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('Cognitive complexity calculation: 2 files analyzed')
    );
  });

  it('should skip non-existent files', async () => {
    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['missing.js', 'existing.js']);
    (fs.existsSync as jest.Mock)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('simple code');

    const result = await cognitiveComplexityCalculator.calculate();

    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('should handle file read errors gracefully', async () => {
    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['error.js', 'good.js']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock)
      .mockImplementationOnce(() => {
        throw new Error('File read error');
      })
      .mockReturnValueOnce('simple code');

    const result = await cognitiveComplexityCalculator.calculate();

    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('Failed to analyze cognitive complexity for file error.js')
    );
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty file content', async () => {
    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['empty.js']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('');

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBe(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File empty.js: Cognitive complexity 0.00')
    );
  });

  it('should handle all supported file extensions', async () => {
    const files = [
      'test.js', 'test.ts', 'test.jsx', 'test.tsx',
      'test.py', 'test.java', 'test.cpp', 'test.c',
      'test.cs', 'test.go', 'test.rs', 'test.php', 'test.rb'
    ];

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(files);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('if (true) { doSomething(); }');

    const result = await cognitiveComplexityCalculator.calculate();

    expect(fs.readFileSync).toHaveBeenCalledTimes(files.length);
    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining(`Cognitive complexity calculation: ${files.length} files analyzed`)
    );
  });
});
