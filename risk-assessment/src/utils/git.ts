import * as core from "@actions/core";
import simpleGit from "simple-git";

const git = simpleGit();

function getBranches() {
  const baseBranch = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null;
  const fallbackBranches = ['origin/main', 'origin/master'];
  return baseBranch ? [baseBranch, ...fallbackBranches] : fallbackBranches;
}

async function getSimpleLog(file: string) {
  const logResult = await git.log(['--oneline', '--follow', '--', file]);
  return logResult.all;
}

async function maybeGetDetailedLog(file: string) {
  const detailedLog = await git.log(['--format=%H|%ad', '--date=iso', '--follow', '--', file]);
  return detailedLog.latest?.hash ? await git.raw(['log', '--format=%H|%ad', '--date=iso', '--follow', '--', file]) : '';
}

async function getListOfChangedFiles() {
  const branchesToTry = getBranches();
  let changedFiles: string[] = [];
  for (const branch of branchesToTry) {
    try {
      const diff = await git.diff(['--name-only', `${branch}...HEAD`]);
      changedFiles = diff.trim().split('\n').filter(f => f.trim());
      break;
    } catch (error) { // NOSONAR
      core.warning(`Failed to get changed files against ${branch}, trying next branch`);
    }
  }
  return changedFiles;
}

async function getDiffStats() {
  let output = '';
  const branchesToTry = getBranches();

  for (const branch of branchesToTry) {
    try {
      output = await git.raw(['diff', '--numstat', `${branch}...HEAD`]);
      break;
    } catch (error) { // NOSONAR
      core.warning(`Failed to diff against ${branch}, trying next branch`);
    }
  }
  return output;
}

async function getCommitDetails(file: string) {
  const detailedLog = await maybeGetDetailedLog(file)
  return detailedLog.trim().split('\n')
    .filter(line => line.trim())
    .map(line => {
      const [hash, dateStr] = line.split('|');
      return {
        hash,
        date: new Date(dateStr)
      };
    });
}

export {getBranches, getSimpleLog, maybeGetDetailedLog, getDiffStats, getCommitDetails, getListOfChangedFiles};