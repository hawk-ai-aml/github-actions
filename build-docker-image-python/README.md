# Build Docker image for Python
Usage
```
      - name: Build Docker image
        uses: hawk-ai-aml/github-actions/build-docker-image-python@master
        with:
          multiple-modules: "true/false"
          module: ${{ matrix.module }}
          image-tag: ${{ needs.init.outputs.image-tag }}
          ecr-repository-prefix: ${{ fromJson(needs.init.outputs.metadata).ecr.repository-prefix }}
          ecr-registry: ${{ steps.login-ecr.outputs.registry }}
          ecr-repository: ${{ fromJson(needs.init.outputs.metadata).ecr.repository }}
          hawk-platform-repository: "ecr-repo-name"
          aws-org-ecr-access-key-id: ${{ secrets.AWS_ORG_ECR_ACCESS_KEY_ID }}
          aws-org-ecr-secret-access-key: ${{ secrets.AWS_ORG_ECR_SECRET_ACCESS_KEY }}
          ecr-region: ${{ needs.init.outputs.ecr-region }}
          ecr-registry-code: ${{ needs.init.outputs.ecr-registry-code }}
          gradle-cache-username: ${{ secrets.GRADLE_CACHE_USERNAME }}
          gradle-cache-password: ${{ secrets.GRADLE_CACHE_PASSWORD }}
          artifactory-context-url: ${{ secrets.ARTIFACTORY_CONTEXT_URL }}
          artifactory-username: ${{ secrets.ARTIFACTORY_USERNAME }}
          artifactory-password: ${{ secrets.ARTIFACTORY_PASSWORD }}
```
