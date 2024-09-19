# Enforce labels for pull request
Usage
```
        name: Check required labels
        uses: hawk-ai-aml/github-actions/enforce-labels@master
        with:
          repository-ref: $GITHUB_REF_NAME
          repository-access-token: $REPO_ACCESS_PAT

```

repository-ref: is used to retrieve the PR reference to get the labels
repository-access-token: is required to use the Github API
