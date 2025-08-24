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
    (git.parseAddedLines as jest.Mock).mockResolvedValue(new Map());

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBe(0);
    expect(core.warning).toHaveBeenCalledWith('Could not calculate cognitive complexity - no changed files found');
  });

  it('should calculate basic complexity for simple control structures', async () => {
    const addedLines = [
      'if (condition) {',
      '  doSomething();',
      '}',
      'for (let i = 0; i < 10; i++) {',
      '  process(i);',
      '}'
    ];

    const addedLinesByFile = new Map();
    addedLinesByFile.set('test.js', addedLines);

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['test.js']);
    (git.parseAddedLines as jest.Mock).mockResolvedValue(addedLinesByFile);
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File test.js: Added cognitive complexity')
    );
  });

  it('should calculate higher complexity for nested structures', async () => {
    const addedLines = [
      'if (condition1) {',
      '  if (condition2) {',
      '    while (condition3) {',
      '      if (condition4) {',
      '        doSomething();',
      '      }',
      '    }',
      '  }',
      '}'
    ];

    const addedLinesByFile = new Map();
    addedLinesByFile.set('test.js', addedLines);

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['test.js']);
    (git.parseAddedLines as jest.Mock).mockResolvedValue(addedLinesByFile);
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File test.js: Added cognitive complexity')
    );
  });

  it('should handle logical operators complexity', async () => {
    const addedLines = [
      'if (condition1 && condition2 || condition3) {',
      '  doSomething();',
      '}',
      'const result = test1 && test2 || test3 && test4;'
    ];

    const addedLinesByFile = new Map();
    addedLinesByFile.set('test.js', addedLines);

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['test.js']);
    (git.parseAddedLines as jest.Mock).mockResolvedValue(addedLinesByFile);
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File test.js: Added cognitive complexity')
    );
  });

  it('should handle ternary operators complexity', async () => {
    const addedLines = [
      'const value = condition ? value1 : value2;',
      'const complex = test1 ? (test2 ? value1 : value2) : value3;'
    ];

    const addedLinesByFile = new Map();
    addedLinesByFile.set('test.js', addedLines);

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['test.js']);
    (git.parseAddedLines as jest.Mock).mockResolvedValue(addedLinesByFile);
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File test.js: Added cognitive complexity')
    );
  });

  it('should handle switch statements and cases', async () => {
    const addedLines = [
      'switch (value) {',
      '  case \'a\':',
      '    doA();',
      '    break;',
      '  case \'b\':',
      '    doB();',
      '    break;',
      '  default:',
      '    doDefault();',
      '}'
    ];

    const addedLinesByFile = new Map();
    addedLinesByFile.set('test.js', addedLines);

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['test.js']);
    (git.parseAddedLines as jest.Mock).mockResolvedValue(addedLinesByFile);
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File test.js: Added cognitive complexity')
    );
  });

  it('should calculate average complexity across multiple files', async () => {
    const simpleLines = ['function simple() { return true; }'];
    const complexLines = [
      'if (condition) {',
      '  for (let i = 0; i < 10; i++) {',
      '    if (i % 2 === 0) {',
      '      process(i);',
      '    }',
      '  }',
      '}'
    ];

    const addedLinesByFile = new Map();
    addedLinesByFile.set('simple.js', simpleLines);
    addedLinesByFile.set('complex.js', complexLines);

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['simple.js', 'complex.js']);
    (git.parseAddedLines as jest.Mock).mockResolvedValue(addedLinesByFile);
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('Added cognitive complexity calculation: 2 files analyzed')
    );
  });

  it('should skip non-existent files', async () => {
    const addedLinesByFile = new Map();
    addedLinesByFile.set('missing.js', ['simple code']);
    addedLinesByFile.set('existing.js', ['simple code']);

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['missing.js', 'existing.js']);
    (git.parseAddedLines as jest.Mock).mockResolvedValue(addedLinesByFile);
    (fs.existsSync as jest.Mock)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBeGreaterThanOrEqual(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('Added cognitive complexity calculation: 1 files analyzed')
    );
  });

  it('should handle file read errors gracefully', async () => {
    const addedLinesByFile = new Map();
    addedLinesByFile.set('error.js', ['simple code']);
    addedLinesByFile.set('good.js', ['simple code']);

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['error.js', 'good.js']);
    (git.parseAddedLines as jest.Mock).mockResolvedValue(addedLinesByFile);
    (fs.existsSync as jest.Mock)
      .mockImplementationOnce(() => {
        throw new Error('File read error');
      })
      .mockReturnValueOnce(true);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('Failed to analyze cognitive complexity for file error.js')
    );
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('should handle files with no added lines', async () => {
    const addedLinesByFile = new Map();
    addedLinesByFile.set('empty.js', []);

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['empty.js']);
    (git.parseAddedLines as jest.Mock).mockResolvedValue(addedLinesByFile);
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBe(0);
    expect(core.info).toHaveBeenCalledWith('File empty.js: No added lines to analyze');
  });

  it('should handle files not in parseAddedLines result', async () => {
    const addedLinesByFile = new Map();
    // Note: 'test.js' is not in the map

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['test.js']);
    (git.parseAddedLines as jest.Mock).mockResolvedValue(addedLinesByFile);
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBe(0);
    expect(core.info).toHaveBeenCalledWith('File test.js: No added lines to analyze');
  });

  it('should handle lambda expressions complexity', async () => {
    const addedLines = [
      'const mapper = items.map(item -> item.value);',
      'const filter = data.filter(x -> x > 0);'
    ];

    const addedLinesByFile = new Map();
    addedLinesByFile.set('test.js', addedLines);

    (git.getListOfChangedFiles as jest.Mock).mockResolvedValue(['test.js']);
    (git.parseAddedLines as jest.Mock).mockResolvedValue(addedLinesByFile);
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const result = await cognitiveComplexityCalculator.calculate();

    expect(result).toBeGreaterThan(0);
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('File test.js: Added cognitive complexity')
    );
  });
});