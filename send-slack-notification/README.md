# Send Slack Notifications

It is able to notify both the author of the PR as well as a slack channel. For the slack channel, there is a mapping json file that needs to be adjusted for new slack channel because of their ID. Each slack notification can have their own slack message attached to it.

# How to use the slack notification within github actions
Usage
```
  slack-notification:
    if: always()
    runs-on: [ "self-hosted", "small-builder" ]

    steps:
      - name: Send slack notification to PR author
        uses: hawk-ai-aml/github-actions/send-slack-notification@master
        with:
          notify-pr-author: true
          notify-slack-channel-name: developers
          slack-message: "Write your message here"
          slack-access-token: $SLACK_RELEASE_BOT_ACCESS_TOKEN
          github-users-access-token: $USER_GITHUB_ACCESS

```

can be found in: .github/workflows/build-scripts.yaml

# How to add a new slack channel

1. You have to get the slack channel id
2. Map the name of the channel to its id in the slack_channel_mapping.json file
3. Go to your slack channel and add the release bot as an integration app to the channel. (can be done directly within Slack by anyone)
