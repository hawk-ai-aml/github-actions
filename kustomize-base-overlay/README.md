# kustomize-base-overlay-action
Usage
```
      - name: Update kustomize base overlay
        uses: hawk-ai-aml/github-actions/kustomize-base-overlay@master
        with:
          slack-access-token: ${{ secrets.SLACK_RELEASE_BOT_ACCESS_TOKEN }}
          github-users-access-token: ${{ secrets.USER_GITHUB_ACCESS }}
          overlays: ${{ needs.init.outputs.overlays }}
          modules: ${{ needs.init.outputs.kustomize-modules-string }}
          component-name: ${{ inputs.component }}
          component-tag: ${{ needs.init.outputs.image-tag }}
          kustomize-access-token: ${{ secrets.REPO_ACCESS_PAT }}
          ecr-region: ${{ needs.init.outputs.ecr-region }}
          ecr-registry-code: ${{ needs.init.outputs.ecr-registry-code }}
          metadata: ${{ needs.init.outputs.metadata }}
```
