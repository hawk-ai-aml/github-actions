import * as core from "@actions/core";
import fs from "node:fs";
import {getListOfChangedFiles, parseAddedLines} from "@/utils/git";
import {Metric} from "@/types";

class CognitiveComplexity implements Metric {
  name = 'Cognitive Complexity';

  calculateCognitiveComplexityForFile(content: string): number {
    // TODO Simplified implementation;
    //  We should get this from an external service like SonarQube and not build our own parser.

    let complexity = 0;
    let nestingLevel = 0;

    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Count opening braces (increase nesting)
      const openBraces = (trimmedLine.match(/{/g) || []).length;
      const closeBraces = (trimmedLine.match(/}/g) || []).length;

      // Control flow statements that increase complexity
      if (/\b(if|else if|while|for|do|switch|case|catch)\b/.test(trimmedLine)) {
        complexity += 1 + nestingLevel; // Base +1, plus nesting penalty
      }

      // Logical operators in conditions
      const logicalOps = (trimmedLine.match(/&&|\|\|/g) || []).length;
      complexity += logicalOps;

      // Ternary operators
      const ternaryOps = (trimmedLine.match(/\?.*:/g) || []).length;
      complexity += ternaryOps;

      // Lambda expressions
      const lambdaOps = (trimmedLine.match(/->/g) || []).length;
      complexity += lambdaOps;

      // Update nesting level
      nestingLevel += openBraces - closeBraces;
      nestingLevel = Math.max(0, nestingLevel); // Prevent negative nesting
    }

    return Math.log(1 + complexity);
  }

  calculateAddedCognitiveComplexity(addedLines: string[]): number {
    // Calculate complexity only for added lines
    const addedContent = addedLines.join('\n');
    return this.calculateCognitiveComplexityForFile(addedContent);
  }

  async calculate(): Promise<number> {
    const changedFiles = await getListOfChangedFiles();

    if (changedFiles.length === 0) {
      core.warning('Could not calculate cognitive complexity - no changed files found');
      return 0;
    }

    const addedLinesByFile = await parseAddedLines()
    let totalComplexity = 0;
    let totalFiles = 0;

    for (const file of changedFiles) {
      try {
        if (!fs.existsSync(file)) {
          continue;
        }

        const addedLines = addedLinesByFile.get(file) || [];
        if (addedLines.length === 0) {
          core.info(`File ${file}: No added lines to analyze`);
          continue;
        }

        const complexity = this.calculateAddedCognitiveComplexity(addedLines);
        totalComplexity += complexity;
        totalFiles++;

        core.info(`File ${file}: Cognitive complexity ${complexity.toFixed(2)} (from ${addedLines.length} added lines)`);
      } catch (error) {
        core.warning(`Failed to analyze cognitive complexity for file ${file}: ${error}`);
      }
    }

    const averageComplexity = totalFiles > 0 ? totalComplexity / totalFiles : 0;
    core.info(`Cognitive complexity calculation: ${totalFiles} files analyzed, average added complexity: ${averageComplexity.toFixed(2)}`);

    return averageComplexity;
  }
}

export const cognitiveComplexityCalculator = new CognitiveComplexity();
