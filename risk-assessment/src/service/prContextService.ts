import * as core from '@actions/core';
import * as github from '@actions/github';

export interface PRContext {
  title: string;
  body: string;
  fileSummary: string;
  fileDiffs: string;
  selectedFiles: number;
  totalFiles: number;
  headRef: string;
}

export class PRContextService {
  private static readonly MAX_PATCH_SIZE = 4000;
  private static readonly MAX_FILES = 15;

  static async gatherContext(token: string, prNumber: number): Promise<PRContext> {
    const startTime = Date.now();
    core.info('📊 Starting PR context gathering...');

    const octokit = github.getOctokit(token);
    const {context} = github;

    const pr = context.payload.pull_request;
    if (!pr) {
      throw new Error('No pull request context found');
    }

    // Get PR details
    const title = pr.title || '';
    const body = pr.body ? pr.body.substring(0, 1000) : ''; // note: May be unnecessarily low, we need to find a proper limit for the PR body
    const headRef = pr.head.ref || '';

    // Get changed files with performance tracking
    const filesStartTime = Date.now();
    const files = await octokit.rest.pulls.listFiles({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: prNumber
    });
    const filesApiDuration = Date.now() - filesStartTime;

    core.info(`📂 Fetched ${files.data.length} files in ${filesApiDuration}ms`);

    // Log file stats
    const fileStats = files.data.map(f => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patchSize: f.patch ? f.patch.length : 0
    }));

    core.info('File change statistics:');
    core.info(JSON.stringify(fileStats, null, 2));

    // Calculate total patch size
    const totalPatchSize = files.data.reduce((sum, f) => sum + (f.patch ? f.patch.length : 0), 0);
    core.info(`📏 Total patch size: ${totalPatchSize} characters`);

    // Smart file selection and summarization with performance tracking
    const processingStartTime = Date.now();
    const {selectedFiles, fileDiffs} = this.selectAndProcessFiles(files.data);
    const fileSummary = this.generateFileSummary(files.data);
    const processingDuration = Date.now() - processingStartTime;

    const totalDuration = Date.now() - startTime;

    core.info(`✅ PR context gathering complete - Processing: ${processingDuration}ms, Total: ${totalDuration}ms`);
    core.info(`📊 Selected ${selectedFiles.length} files for analysis`);
    core.info(`📋 Summarized ${selectedFiles.filter(f => f.isSummary).length} large files`);

    return {
      title,
      body,
      fileSummary,
      fileDiffs,
      selectedFiles: selectedFiles.length,
      totalFiles: files.data.length,
      headRef
    };
  }

  private static selectAndProcessFiles(files: any[]) {
    let accumulatedSize = 0;
    const selectedFiles: any[] = [];

    // Sort by importance: new files first, then by change size
    const sortedFiles = files.sort((a, b) => {
      if (a.status === 'added' && b.status !== 'added') return -1;
      if (b.status === 'added' && a.status !== 'added') return 1;
      return b.changes - a.changes;
    });

    for (const file of sortedFiles) {
      const patchSize = file.patch ? file.patch.length : 0;

      if (accumulatedSize + patchSize <= this.MAX_PATCH_SIZE) {
        selectedFiles.push(file);
        accumulatedSize += patchSize;
      } else {
        // For large files, create a summary instead of full diff
        const summary = `File: ${file.filename} (${file.status})
Changes: +${file.additions}/-${file.deletions}
Summary: ${file.status === 'added' ? 'New file' :
          file.status === 'removed' ? 'Deleted file' :
            `Modified with ${file.changes} changes`}`;

        selectedFiles.push({
          ...file,
          patch: summary,
          isSummary: true
        });
      }

      if (selectedFiles.length >= this.MAX_FILES) break;
    }

    // Generate concise file changes
    const fileDiffs = selectedFiles.map(f => {
      if (f.isSummary) {
        return f.patch; // Already a summary
      }

      const patch = f.patch || `${f.status} file: ${f.filename}`;
      return `--- ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})
${patch}`;
    }).join('\n\n');

    return {selectedFiles, fileDiffs};
  }

  private static generateFileSummary(files: any[]): string {
    return files.map(f =>
      `${f.filename}: ${f.status} (+${f.additions}/-${f.deletions})`
    ).join('\n');
  }
}
