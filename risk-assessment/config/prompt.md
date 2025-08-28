Risk assessment for PR. For each question, provide evidence and score (0 to max weight).

PR: ${{ steps.pr-context.outputs.pr-title }}
Description: 
```
${{ steps.pr-context.outputs.pr-body }}
```

Files (${{ steps.pr-context.outputs.selected-files }}/${{ steps.pr-context.outputs.total-files }} analyzed):
${{ steps.pr-context.outputs.file-summary }}

Key Changes:
${{ steps.pr-context.outputs.file-diffs }}

Questions:
${{ steps.load-config.outputs.questions }}

Response format: ${{ steps.load-config.outputs.json-structure }}

Rules:
- Evidence: Specific findings from code/PR. If no evidence found, respond with exactly "❌" and nothing else
- Score: 0 if not applicable/no evidence, otherwise 0 to max weight
- Use GitHub links: https://github.com/${{ github.repository }}/blob/${{ github.head_ref }}/{filepath}