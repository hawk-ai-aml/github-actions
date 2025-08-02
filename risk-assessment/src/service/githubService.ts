import * as github from "@actions/github";
import * as core from "@actions/core";

export class GithubService {
  static async upsertComment(token: string, prNumber: number, comment: string): Promise<void> {
    const octokit = github.getOctokit(token);
    const {context} = github;

    const comments = await this.getExistingComments(octokit, context, prNumber);
    const existingComment = this.findRiskAssessmentComment(comments);

    if (existingComment) {
      await this.updateExistingComment(octokit, context, existingComment.id, comment);
    } else {
      await this.createNewComment(octokit, context, prNumber, comment);
    }
  }

  private static async getExistingComments(octokit: any, context: any, prNumber: number) {
    const {data: comments} = await octokit.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber
    });
    core.info(`Found ${comments.length} existing comments on PR #${prNumber}`);
    return comments;
  }

  private static findRiskAssessmentComment(comments: any[]) {
    return comments.find(c => c.body?.includes('Risk Assessment'));
  }

  private static async updateExistingComment(octokit: any, context: any, commentId: number, comment: string) {
    await octokit.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: commentId,
      body: comment
    });
  }

  private static async createNewComment(octokit: any, context: any, prNumber: number, comment: string) {
    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body: comment
    });
  }
}