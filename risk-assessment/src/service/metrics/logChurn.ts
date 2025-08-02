import * as core from "@actions/core";
import {getDiffStats} from "@/utils/git";
import {Metric} from "@/types";

class LogChurn implements Metric {
  name = 'Log Churn';

  async calculate(): Promise<number> {
    const output = await getDiffStats();

    if (!output) {
      core.warning('Could not calculate log churn - no diff stats found');
      return 0;
    }

    let totalLines = 0;
    const lines = output.trim().split('\n');

    for (const line of lines) {
      if (line.trim()) {
        const [added, deleted] = line.split('\t').map(num => parseInt(num) || 0);
        totalLines += added + deleted;
      }
    }

    return Math.log(1 + totalLines);
  }
}

export const logChurnCalculator = new LogChurn();
