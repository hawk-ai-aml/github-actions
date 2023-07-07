# kustomize-overlay-action
Usage
```
      - name: Update kustomize overlay
        uses: hawk-ai-aml/github-actions/kustomize-overlay@master
        with:
          component-name: ${{  }}
          component-tag: ${{  }}
          kustomize-repo: hawk-ai-aml/kustomize.git
          kustomize-access-token: ${{ secrets.REPO_ACCESS_PAT }}
          ecr-region: ${{  }}
          ecr-registry-code: ${{  }}
          overlay: ${{  }}
          module: ${{  }}
          metadata: ${{  }}
```
