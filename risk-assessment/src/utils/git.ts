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
  core.info(`Log result: ${JSON.stringify(logResult, null, 2)}`);
  return logResult.all;
}

async function maybeGetDetailedLog(file: string) {
  const detailedLog = await git.log(['--format=%H|%ad', '--date=iso', '--follow', '--', file]);
  return detailedLog.latest?.hash ? await git.raw(['log', '--format=%H|%ad', '--date=iso', '--follow', '--', file]) : '';
}

function filterForRelevant(file: string) {
  const isCodeFile = /\.(js|ts|jsx|tsx|py|java|cpp|c|cs|go|rs|php|rb)$/i.test(file);

  const isTestFile = /\.(test|spec)\.(js|ts|jsx|tsx)$/i.test(file) ||
    /\/__tests__\//i.test(file) ||
    /\/tests?\//i.test(file) ||
    /^tests?\//i.test(file);

  const isGitignorePattern =
    /node_modules\//i.test(file) ||
    /\.git\//i.test(file) ||
    /dist\//i.test(file) ||
    /build\//i.test(file) ||
    /coverage\//i.test(file) ||
    /\.nyc_output\//i.test(file) ||
    /out\//i.test(file) ||
    /target\//i.test(file) ||
    /bin\//i.test(file) ||
    /obj\//i.test(file) ||
    /\.next\//i.test(file) ||
    /\.nuxt\//i.test(file) ||
    /\.cache\//i.test(file) ||
    /\.temp\//i.test(file) ||
    /\.tmp\//i.test(file) ||
    /logs?\//i.test(file) ||
    /\.log$/i.test(file) ||
    /\.env$/i.test(file) ||
    /\.env\./i.test(file) ||
    /\.DS_Store$/i.test(file) ||
    /Thumbs\.db$/i.test(file) ||
    /\.lock$/i.test(file) ||
    /package-lock\.json$/i.test(file) ||
    /yarn\.lock$/i.test(file) ||
    /pnpm-lock\.yaml$/i.test(file);

  return isCodeFile && !isTestFile && !isGitignorePattern;
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

  const relevantFiles = changedFiles.filter(filterForRelevant);
  core.info(`Relevant files: ${relevantFiles}`);
  return relevantFiles;
}

async function getCommitDetails(file: string) {
  const detailedLog = await maybeGetDetailedLog(file)
  core.debug(`Detailed Log: ${detailedLog}`)
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

async function getDetailedDiff(): Promise<string> {
  const git = simpleGit();
  const branchesToTry = getBranches();

  for (const branch of branchesToTry) {
    try {
      return await git.raw(['diff', `${branch}...HEAD`]);
    } catch (error) {
      core.warning(`Failed to get detailed diff against ${branch}, trying next branch`);
    }
  }
  return '';
}

async function parseAddedLines(): Promise<Map<string, string[]>> {
  const diffOutput = await getDetailedDiff();
  core.info(`Diff Output length: ${diffOutput.length}`);

  const fileChanges = new Map<string, string[]>();
  const lines = diffOutput.split('\n');
  let currentFile = '';

  for (const line of lines) {
    if (line.startsWith('+++ ')) {
      const match = line.match(/^\+{3}\s+[ab]\/(.+)$/);
      if (match) {
        currentFile = match[1];
        if (!fileChanges.has(currentFile)) {
          fileChanges.set(currentFile, []);
        }
        core.debug(`Found file: ${currentFile}`);
      }
    } else if (line.startsWith('+') && !line.startsWith('+++') && !line.startsWith('@@')) {
      if (currentFile && fileChanges.has(currentFile)) {
        const addedLine = line.substring(1); // Remove leading +
        fileChanges.get(currentFile)!.push(addedLine);
        core.debug(`Added line to ${currentFile}: ${addedLine}`);
      }
    }
  }

  core.info(`Parsed file changes: ${JSON.stringify(Object.fromEntries(fileChanges), null, 2)}`);
  return fileChanges;
}

export {getBranches, getSimpleLog, getCommitDetails, getListOfChangedFiles, parseAddedLines};
