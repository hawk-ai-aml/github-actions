# Standardized Risk Assessment (SRA) System

A lightweight, automated risk assessment system for pull requests that helps maintain platform stability while enabling rapid development velocity.

## 🎯 Overview

The SRA system automatically evaluates the risk level of every pull request using a combination of developer-provided context and automated metrics. It provides transparent, deterministic risk scoring that helps teams make informed decisions about code changes before they reach production.

### Key Benefits

See [confluence](https://hawkai.atlassian.net/wiki/spaces/HAW/pages/4675665921/1.3.+Enhance+and+Standardize+PR+Risk+Assessment) for detailed benefits.

## 🏗️ Architecture

The SRA system integrates seamlessly into your GitHub workflow:

1. **PR Template**: Developer completes risk assessment checklist
2. **GitHub Action**: Automatically calculates risk score on PR events
3. **Risk Scoring**: Combines checklist responses with automated metrics
4. **Status Checks**: Updates PR status based on risk tier

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- GitHub repository with Actions enabled (use a private repo for testing)
- Admin access to configure branch protection (also easier to do on private repos)

### How to Build

1. **Install dependencies and build script**:
This step is optional, the built sources are committed in the repository.
But if you want to make changes to the action, you need to install dependencies and build the action.
   ```bash
   cd risk-assessment/
   npm install
   npm run build
   ```
2. **Test the system** by creating a pull request with the new template.

## 📋 Risk Assessment Checklist

The system evaluates key risk factors through a questionnaire.
The questionnaire can be found in [risk-assessment.md](../.github/workflows/risk-assessment.yml).

### Automated Metrics

- **Code Churn** (+1.5x log factor): Calculated from lines added/deleted

## 🎚️ Risk Tiers & Governance

The risk assessment system categorizes pull requests into four tiers based on their risk score, 
which is calculated from the checklist responses and automated metrics.
The risk score is a sum of weighted checklist items and code churn.
Based in the score, PRs can be blocked with option to override, require additional code owner review, or merge directly.
The weights and limits can be found in [index.ts](./src/index.ts).
