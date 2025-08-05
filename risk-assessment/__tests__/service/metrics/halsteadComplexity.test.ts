// noinspection DuplicatedCode

import {halsteadComplexityCalculator} from '@/service/metrics/halsteadComplexity';
import {TestSetup} from '../../utils/test-helpers';
import * as core from '@actions/core';
import * as git from '@/utils/git';
import * as fs from 'node:fs';

jest.mock('@/utils/git');
jest.mock('node:fs');

describe('halsteadComplexity', () => {

  beforeEach(() => {
    new TestSetup();
    jest.clearAllMocks();
  });

  it('should return 0 when no changed files found', async () => {
    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue([]);

    const result = await halsteadComplexityCalculator.calculate();

    expect(result).toBe(0);
    expect(core.warning).toHaveBeenCalledWith('Could not calculate Halstead complexity - no changed files found');
  });

  it('should calculate complexity for simple code with operators and identifiers', async () => {
    const codeContent = `
      const x = 5;
      const y = 10;
      const sum = x + y;
    `;

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['test.js']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(codeContent);

    const result = await halsteadComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File test.js: Halstead complexity')
    );
  });

  it('should calculate complexity for code with functions and control structures', async () => {
    const codeContent = `
      function calculate(a, b) {
        if (a > b) {
          return a + b;
        } else {
          return a - b;
        }
      }
    `;

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['test.js']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(codeContent);

    const result = await halsteadComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File test.js: Halstead complexity')
    );
  });

  it('should handle code with various operators and keywords', async () => {
    const codeContent = `
      for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) {
          console.log("even");
        }
      }
      const arr = [1, 2, 3];
      const obj = { key: "value" };
    `;

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['test.js']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(codeContent);

    const result = await halsteadComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File test.js: Halstead complexity')
    );
  });

  it('should handle string and numeric literals', async () => {
    const codeContent = `
      const message = "Hello World";
      const template = \`Template \${variable}\`;
      const number = 42;
      const decimal = 3.14;
    `;

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['test.js']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(codeContent);

    const result = await halsteadComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File test.js: Halstead complexity')
    );
  });

  it('should return 0 for empty file content', async () => {
    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['empty.js']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('');

    const result = await halsteadComplexityCalculator.calculate();

    expect(result).toBe(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File empty.js: Halstead complexity 0.00')
    );
  });

  it('should return 0 for content with no operators or operands', async () => {
    const codeContent = '// Just a comment\n/* Another comment */';

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['comments.js']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(codeContent);

    const result = await halsteadComplexityCalculator.calculate();

    expect(result).toBe(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File comments.js: Halstead complexity 0.00')
    );
  });

  it('should calculate average complexity across multiple files', async () => {
    const simpleCode = 'const x = 1;';
    const complexCode = `
      function complex(a, b, c) {
        if (a > b && b > c) {
          return a + b * c;
        }
        return 0;
      }
    `;

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['simple.js', 'complex.js']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock)
      .mockReturnValueOnce(simpleCode)
      .mockReturnValueOnce(complexCode);

    const result = await halsteadComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('Halstead complexity calculation: 2 files analyzed')
    );
  });

  it('should skip non-existent files', async () => {
    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['missing.js', 'existing.js']);
    (fs.existsSync as jest.Mock)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('const x = 1;');

    const result = await halsteadComplexityCalculator.calculate();

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
      .mockReturnValueOnce('const x = 1;');

    const result = await halsteadComplexityCalculator.calculate();

    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('Failed to analyze Halstead complexity for file error.js')
    );
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('should handle all supported file extensions', async () => {
    const files = [
      'test.js', 'test.ts', 'test.jsx', 'test.tsx',
      'test.py', 'test.java', 'test.cpp', 'test.c',
      'test.cs', 'test.go', 'test.rs', 'test.php', 'test.rb'
    ];

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(files);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('const x = 1 + 2;');

    const result = await halsteadComplexityCalculator.calculate();

    expect(fs.readFileSync).toHaveBeenCalledTimes(files.length);
    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining(`Halstead complexity calculation: ${files.length} files analyzed`)
    );
  });

  it('should handle complex expressions with multiple operator types', async () => {
    const codeContent = `
      const result = (a && b) || (c > d) ? x * y : z / w;
      const bitwise = value & 0xFF | mask << 2;
      const comparison = alpha >= beta && gamma <= delta;
    `;

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['complex.js']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(codeContent);

    const result = await halsteadComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File complex.js: Halstead complexity')
    );
  });

  it('should handle class definitions and methods', async () => {
    const codeContent = `
      class Calculator {
        constructor(initial) {
          this.value = initial;
        }
        
        add(number) {
          return this.value + number;
        }
      }
    `;

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['class.js']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(codeContent);

    const result = await halsteadComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File class.js: Halstead complexity')
    );
  });
});
