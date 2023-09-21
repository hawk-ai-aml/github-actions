# Check kubernetes service status
Usage
```
        uses: hawk-ai-aml/github-actions/kube-service-status@master
        with:
          deployment: ${{ inputs.component }}
          tag: ${{ needs.init.outputs.image-tag }}
```