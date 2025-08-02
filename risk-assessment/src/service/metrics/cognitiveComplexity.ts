import * as core from "@actions/core";
import fs from "node:fs";
import {getListOfChangedFiles} from "@/utils/git";
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

      // Update nesting level
      nestingLevel += openBraces - closeBraces;
      nestingLevel = Math.max(0, nestingLevel); // Prevent negative nesting
    }

    return Math.log(1 + complexity);
  }

  async calculate(): Promise<number> {
    const changedFiles = await getListOfChangedFiles();

    if (changedFiles.length === 0) {
      core.warning('Could not calculate cognitive complexity - no changed files found');
      return 0;
    }

    let totalComplexity = 0;
    let totalFiles = 0;

    const codeFiles = changedFiles.filter(file =>
      /\.(js|ts|jsx|tsx|py|java|cpp|c|cs|go|rs|php|rb)$/i.test(file)
    );

    for (const file of codeFiles) {
      try {
        if (!fs.existsSync(file)) {
          continue;
        }

        const content = fs.readFileSync(file, 'utf8');
        const complexity = this.calculateCognitiveComplexityForFile(content);
        totalComplexity += complexity;
        totalFiles++;

        core.info(`File ${file}: Cognitive complexity ${complexity.toFixed(2)}`);
      } catch (error) {
        core.warning(`Failed to analyze cognitive complexity for file ${file}: ${error}`);
      }
    }

    const averageComplexity = totalFiles > 0 ? totalComplexity / totalFiles : 0;
    core.info(`Cognitive complexity calculation: ${totalFiles} files analyzed, average complexity: ${averageComplexity.toFixed(2)}`);

    return averageComplexity;
  }
}

export const cognitiveComplexityCalculator = new CognitiveComplexity();
