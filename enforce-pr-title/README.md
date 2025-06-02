Enforce pull request title includes Jira Issue key
Usage
```
        - uses: hawk-ai-aml/github-actions/enforce-pr-title@master
        with:
          repository-access-token: ${{ secrets.REPO_ACCESS_PAT }}
          jira-account-name: ${{ secrets.JIRA_ACCOUNT_NAME }}
          jira-token: ${{ secrets.JIRA_TOKEN }}
```