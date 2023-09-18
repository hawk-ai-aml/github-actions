# Generate metadata for e2e tests
Usage
```
    - name: Generate e2e tests metadata
      id: e2e-metadata
      uses: hawk-ai-aml/github-actions/e2e-tests-metadata@master
      with:
        repository-access-token: ${{ secrets.REPO_ACCESS_PAT }}

```