Usage
```
    - name: Services are tagged with the platform tag
      uses: hawk-ai-aml/github-actions/services-with-platform-tag@master
      with:
        platform-tag: ${{ }}
        repository-access-user: ${{ secrets.RECREATE_DEVELOP_GITHUB_USER }}
        repository-access-token: ${{ secrets.REPO_ACCESS_PAT }}

```
