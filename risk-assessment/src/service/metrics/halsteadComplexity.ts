import * as core from "@actions/core";
import fs from "node:fs";
import {getListOfChangedFiles} from "@/utils/git";
import {Metric} from "@/types";

class HalsteadComplexity implements Metric {
  name = 'Halstead Complexity';

  calculateHalsteadForFile(content: string): number {
    // TODO Simplified implementation;
    //  We should get this from an external service like SonarQube and not build our own parser.
    const withoutComments = content
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
      .replace(/\/\/.*$/gm, '');        // Remove // comments

    const operators = withoutComments.match(/[+\-*/=<>!&|%^~?:;,(){}[\]]/g) || [];
    const keywords = withoutComments.match(/\b(if|else|for|while|do|switch|case|break|continue|return|function|class|const|let|var|import|export)\b/g) || [];
    const identifiers = withoutComments.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || [];
    const literals = withoutComments.match(/\b\d+(\.\d+)?\b|"[^"]*"|'[^']*'|`[^`]*`/g) || [];

    const uniqueOperators = new Set([...operators, ...keywords]);
    const uniqueOperands = new Set([...identifiers, ...literals]);

    const n1 = uniqueOperators.size;
    const n2 = uniqueOperands.size;
    const N1 = operators.length + keywords.length;
    const N2 = identifiers.length + literals.length;

    if (n1 === 0 || n2 === 0) return 0;

    const length = N1 + N2;
    const difficulty = (n1 / 2) * (N2 / n2);
    const effort = difficulty * length;

    return Math.log(1 + effort);
  }

  async calculate(): Promise<number> {
    const changedFiles = await getListOfChangedFiles();

    if (changedFiles.length === 0) {
      core.warning('Could not calculate Halstead complexity - no changed files found');
      return 0;
    }

    let totalComplexity = 0;
    let totalFiles = 0;

    for (const file of changedFiles) {
      try {
        if (!fs.existsSync(file)) {
          continue;
        }

        const content = fs.readFileSync(file, 'utf8');
        const complexity = this.calculateHalsteadForFile(content);
        totalComplexity += complexity;
        totalFiles++;

        core.info(`File ${file}: Halstead complexity ${complexity.toFixed(2)}`);
      } catch (error) {
        core.warning(`Failed to analyze Halstead complexity for file ${file}: ${error}`);
      }
    }

    const averageComplexity = totalFiles > 0 ? totalComplexity / totalFiles : 0;
    core.info(`Halstead complexity calculation: ${totalFiles} files analyzed, average complexity: ${averageComplexity.toFixed(2)}`);

    return averageComplexity;
  }
}

export const halsteadComplexityCalculator = new HalsteadComplexity();
