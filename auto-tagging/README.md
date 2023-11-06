# Auto tagging when PR is merged to master
Usage
```
        name: Create tag
        uses: hawk-ai-aml/github-actions/auto-tagging@master
        with:
          repository-access-token: ${{ secrets.REPO_ACCESS_PAT }}

```

repository-access-token: is required to use the Github API
