# Auto tagging when PR is merged to master
Usage
```
        name: Create tag
        uses: hawk-ai-aml/github-actions/check-docker-tag-exists@master
        with:
          ecr-registry: ${{ steps.login-ecr.outputs.registry }}
          ecr-repository: ${{ steps.ecr-info.outputs.module_ecr }}
          image-tag: ${{ needs.init.outputs.image-tag }}
          ecr-registry-code: ${{ needs.init.outputs.ecr-registry-code }}

```

ecr-repository: needs to be in this format {"repository": <name>}

## Examples

can be found in: .github/workflows/build-java-muilti.yaml
