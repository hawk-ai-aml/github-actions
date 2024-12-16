# workflow-init

This job will initialize some of the environment variables and embed some useful methods that will be used in your
workflow.

Call one time only from very beginning of your workflow and get all the outputs.

Usage:

```yaml
init:
  runs-on: [ "self-hosted", "builder" ]
  outputs:
    overlays: ${{ steps.init.outputs.overlays }}
    metadata: ${{ steps.init.outputs.metadata }}
    update-kustomize: ${{ steps.init.outputs.update-kustomize }}
    skip-tests: ${{ steps.init.outputs.skip-tests }}
    parameters: ${{ steps.init.outputs.parameters }}
    image-tag: ${{ steps.init.outputs.image-tag }}
    ecr-url: ${{ steps.init.outputs.ecr-url }}
  steps:
    - id: init
      name: Init Workflow
      uses: hawk-ai-aml/github-actions/workflow-init@master
      with:
        slack-notification-webhook: ${{ secrets.CICD_MIGRATION_SLACK_WEBHOOK_URL }}
        profile: ${{ inputs.profile }}
        component: ${{ inputs.component }}
        update-kustomize: ${{ inputs.updateKustomize }}
        overlays: ${{ inputs.kustomizeOverlays }}
        skip-tests: ${{ inputs.skipTests }}
        vulnerabilityCheck: ${{ inputs.vulnerabilityCheck }}
```
