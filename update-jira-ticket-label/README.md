# Update Jira ticket label by project module changes

Usage:

```yaml
name: Update Jira ticket labels
if: ${{ github.workflow == 'pr' }}
uses: hawk-ai-aml/github-actions/upload-jira-ticket-label@master
with:
  repository: ${{ inputs.component }}
  github-branch: ${{ github.head_ref }}
  pr-title: ${{ github.event.pull_request.title }}
  modules-string: ${{ steps.detect-changes.outputs.updated-modules-string }}
  multiple-modules: "true/false"
  label-prefix: ${{ inputs.jira-label-prefix }}
  jira-user: ${{ secrets.JIRA_ACCOUNT_NAME }}
  jira-token: ${{ secrets.JIRA_TOKEN }}

```
