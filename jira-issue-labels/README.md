Usage
```
      - name: Collect all the labels of Jira issues
        id: service-label
        uses: hawk-ai-aml/github-actions/jira-issue-labels@master
        with:
          jira-issues: ${{ steps.jira-issues-number.outputs.issues }} #Sample: "ERS-627 NFR-1063 NFR-1062 NFR-1055"
          jira-user: $JIRA_ACCOUNT_NAME
          jira-token: $JIRA_TOKEN

```