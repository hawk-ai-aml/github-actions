# Detect changes for a repository

Usage:

```yaml
name: Detect changes
uses: hawk-ai-aml/github-actions/repository-detect-changes@master
with:
  repository: {{ }}
  repository-ref: ${{ env.GITHUB_REF_NAME }}
  repository-user: ${{ secrets.RECREATE_DEVELOP_GITHUB_USER }}
  repository-access-token: ${{ secrets.REPO_ACCESS_PAT }}
  modules-string: ${{ }}
```
