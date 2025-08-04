import * as core from "@actions/core";
import {getCommitDetails, getListOfChangedFiles, getSimpleLog} from "@/utils/git";
import {Metric} from "@/types";

class CodeChurn implements Metric {
  name = 'Code Churn';

  async fileOnlyModifiedOnce(file: string): Promise<boolean> {
    const commits = await getSimpleLog(file);
    return commits.length <= 1;
  }

  getChangeFrequency(fileAge: number, commitDetails: { hash: string; date: Date }[]) {
    return fileAge === 0 ? commitDetails.length : commitDetails.length / fileAge;
  }

  getFileAge(now: Date, commitDetails: { hash: string; date: Date }[]) {
    return (now.getTime() - commitDetails[commitDetails.length - 1].date.getTime()) / (1000 * 60 * 60 * 24);
  }

  getRecentChangesWeighted(now: Date, commitDetails: { hash: string; date: Date }[]) {
    let recentChangesWeight = 0;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    for (const commit of commitDetails) {
      if (commit.date > thirtyDaysAgo) {
        recentChangesWeight += 3;
      } else if (commit.date > ninetyDaysAgo) {
        recentChangesWeight += 2;
      } else {
        recentChangesWeight += 1;
      }
    }
    return recentChangesWeight;
  }

  async calculate(): Promise<number> {
    const changedFiles = await getListOfChangedFiles();

    if (changedFiles.length === 0) {
      core.warning('Could not calculate code churn - no changed files found');
      return 0;
    }

    let totalChurnScore = 0;
    let totalFiles = 0;

    for (const file of changedFiles) {
      try {
        const commits = await getSimpleLog(file);
        const commitDetails = await getCommitDetails(file);
        const now = new Date();

        if (commits.length === 0) continue;

        if (await this.fileOnlyModifiedOnce(file)) {
          totalChurnScore += 0.1;
          totalFiles++;
          core.info(`File ${file}: 1 change (new file), churn score: 0.10`);
          continue;
        }

        const fileAge = this.getFileAge(now, commitDetails);
        const changeFrequency = this.getChangeFrequency(fileAge, commitDetails);
        const recentChangesWeighted = this.getRecentChangesWeighted(now, commitDetails);

        const fileChurnScore = Math.log(1 + changeFrequency * 365) + Math.log(1 + recentChangesWeighted);
        totalChurnScore += fileChurnScore;
        totalFiles++;

        core.info(`File ${file}: ${commitDetails.length} changes over ${Math.round(fileAge)} days, churn score: ${fileChurnScore.toFixed(2)}`);

      } catch (error) {
        core.warning(`Failed to analyze churn for file ${file}: ${error}`);
      }
    }

    const averageChurn = totalFiles > 0 ? totalChurnScore / totalFiles : 0;
    core.info(`Code churn calculation: ${totalFiles} files analyzed, average churn score: ${averageChurn.toFixed(2)}`);

    return averageChurn;
  }
}

export const codeChurnCalculator = new CodeChurn();