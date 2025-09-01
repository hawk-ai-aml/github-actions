import {RiskConfig, ValidationResult} from "@/types";
import * as core from "@actions/core";
import * as github from "@actions/github";

export class InputValidator {
  static async validate(): Promise<ValidationResult> {
    const token = core.getInput('github-token', {required: true});
    const configInput = core.getInput('config');

    const riskConfig = this.parseConfig(configInput);
    const prNumber = this.validatePRContext();

    return {token, riskConfig, prNumber};
  }

  private static parseConfig(configInput: string): RiskConfig {
    if (!configInput) {
      throw new Error('No config provided');
    }
    return JSON.parse(Buffer.from(configInput, 'base64').toString());
  }

  private static validatePRContext(): number {
    const prNumber = github.context.payload.pull_request?.number;
    if (!prNumber) {
      throw new Error('No pull request context found. This action must be run in a pull request.');
    }
    return prNumber;
  }
}