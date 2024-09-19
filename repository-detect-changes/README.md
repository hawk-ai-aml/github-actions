# Detect changes for a repository
Usage
```
        name: Detect changes
        uses: hawk-ai-aml/github-actions/repository-detect-changes@master
        with:
          repository: {{ }}
          repository-ref: $GITHUB_REF_NAME
          repository-user: $RECREATE_DEVELOP_GITHUB_USER
          repository-access-token: $REPO_ACCESS_PAT
          modules-string: ${{ }}
```