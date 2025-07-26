# Standardized Risk Assessment (SRA) System

A lightweight, automated risk assessment system for pull requests that helps maintain platform stability while enabling rapid development velocity.

## 🎯 Overview

The SRA system automatically evaluates the risk level of every pull request using the PR's changes and automated
metrics.
It is built to provide transparent, deterministic risk scoring that helps teams make informed decisions about code
changes before they reach production.
See [confluence](https://hawkai.atlassian.net/wiki/spaces/HAW/pages/4675665921/1.3.+Enhance+and+Standardize+PR+Risk+Assessment) for detailed benefits.

### Risk Assessment Checklist

The system evaluates key risk factors through a questionnaire.
The questionnaire can be found in [risk-assessment.md](../.github/workflows/risk-assessment.yml).

### Automated Metrics

The system also calculates automated metrics such as code churn and log churn to provide additional risk context.
The metrics can be found in the [metrics](./src/service/metrics) directory.

### Risk Scoring

The risk assessment system categorizes pull requests into four tiers based on their risk score,
which is calculated from the checklist responses and automated metrics.
The risk score is a sum of weighted checklist items and code churn.
Based in the score, PRs can be blocked with option to override, require additional code owner review, or merge directly.
The weights and limits can be found in [index.ts](./src/index.ts).

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- GitHub repository with Actions enabled. Ideally: Use a private repo for testing.
- Admin access to configure branch protection (also easier to do on private repos)

### Build

1. **Install dependencies and build script**:
This step is optional, the built sources are committed in the repository.
But if you want to make changes to the action, you need to install dependencies and build the action.
   ```bash
   cd risk-assessment/
   npm i
   npm run build
   ```
2. **Test the system** by creating a pull request with the new template.

### Run Tests

To ensure the system works as expected, you can run the tests:

```bash
npm run test
```

## How to integrate SRA into your repository

You can add the SRA system to your repository by adding this workflow file to your `.github/workflows` directory:

```yaml
name: Run Risk Assessment
on:
   pull_request:
      types: [ opened, synchronize, reopened, edited ]
      branches:
         - master

permissions:
   checks: write
   models: read
   pull-requests: write
   statuses: write
   contents: read

jobs:
   risk-assessment:
      uses: hawk-ai-aml/github-actions/.github/workflows/risk-assessment.yml@feature/DC-2142
      with:
         enforce-mode: false
         sra-enabled: true
      secrets:
         github-token: ${{ secrets.REPO_ACCESS_PAT }}
```

## 🔄 How to Disable SRA / Rollback Plan

The SRA system can be disabled by setting the `sra-enabled` input to `false` in the workflow file.
