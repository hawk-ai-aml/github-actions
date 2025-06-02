# Build Docker image for ReactJS project
Usage
```
      - name: Build Docker image
        uses: hawk-ai-aml/github-actions/build-docker-image-reactjs@master
        with:
          image-tag: ${{ needs.init.outputs.image-tag }}
          custom-image-tag: ${{ steps.ecr-info.outputs.matched_tag }}
          ecr-registry: ${{ steps.login-ecr.outputs.registry }}
          ecr-repository: ${{ fromJson(needs.init.outputs.metadata).ecr.repository }}
          hawk-platform-repository: "ecr-repo-name"
          aws-org-ecr-access-key-id: ${{ secrets.AWS_ORG_ECR_ACCESS_KEY_ID }}
          aws-org-ecr-secret-access-key: ${{ secrets.AWS_ORG_ECR_SECRET_ACCESS_KEY }}
          ecr-region: ${{ needs.init.outputs.ecr-region }}
          ecr-registry-code: ${{ needs.init.outputs.ecr-registry-code }}
```
