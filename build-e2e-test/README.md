# Build e2e test
Usage
```
      - name: Build e2e test
        uses: hawk-ai-aml/github-actions/build-e2e-test@master
        with:
          environment: "test"
          test: ${{ matrix.test }}
          ref: "master"
          metadata: ${{ needs.metadata.outputs.metadata }}
          repository-access-token: $REPO_ACCESS_PAT
          auth0-dev-api-client-secret: $AUTH0_DEV_API_CLIENT_SECRET
          auth0-prod-api-client-secret: $AUTH0_PROD_API_CLIENT_SECRET
          auth0-prod-us-east-api-client-secret: $AUTH0_PROD_US_EAST_API_CLIENT_SECRET
          auth0-prod-ap-southeast-api-client-secret: $AUTH0_PROD_AP_SOUTHEAST_API_CLIENT_SECRET
          auth0-nab-qa-api-client-secret: $AUTH0_PROD_US_EAST_API_CLIENT_SECRET
          auth0-nab-prod-api-client-secret: $AUTH0_PROD_US_EAST_API_CLIENT_SECRET
          auth0-prod-ch-api-client-secret: $AUTH0_PROD_CH_API_CLIENT_SECRET
          artifactory-context-url: $ARTIFACTORY_CONTEXT_URL
          artifactory-username: $ARTIFACTORY_USERNAME
          artifactory-password: $ARTIFACTORY_PASSWORD
          gradle-cache-username: $GRADLE_CACHE_USERNAME
          gradle-cache-password: $GRADLE_CACHE_PASSWORD
          dev-redis-host: $DEV_REDIS_HOST
          dev-redis-port: $DEV_REDIS_PORT
          dev-redis-auth-token: $DEV_REDIS_AUTH_TOKEN
          aws-key-id: $AWS_DEV_ACCESS_KEY_ID
          aws-secret-access-key: $AWS_DEV_SECRET_ACCESS_KEY
```