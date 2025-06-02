# SonarQube check
Usage without inputs
```
      - name: SonarQube Cloud Scan
        uses: hawk-ai-aml/github-actions/sonarqube@master
```

Usage with inputs
```
      - name: SonarCloud scan
        if: inputs.skipTests != true && (success() || failure()) && inputs.useSonarCloud
        uses: hawk-ai-aml/github-actions/sonarqube@master
        with:
          args: >
            -Dsonar.python.version=${{ fromJson(needs.init.outputs.metadata).python-version }}
          projectBaseDir: ${{ matrix.module }}/
```
