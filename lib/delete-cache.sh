function deleteCache {
  ROOT_REPO="hawk-ai-aml"
  echo Deleting cache by key "$2" on "$1"
  CACHE_ID=$(curl H "Accept: application/vnd.github+json" "https://api.github.com/repos/$ROOT_REPO/$1/actions/caches" -u "$USER:$TOKEN" -s | jq '.actions_caches | map(select(.key == '\"$2\"')) | .[0].id')
  checkLastCommand

  echo Deleting cache id "$CACHE_ID"
  STATUS_CODE=$(curl --silent --output /dev/stderr --write-out "%{http_code}" -H "Accept: application/vnd.github.v3+json" -i -X "DELETE" "https://api.github.com/repos/$ROOT_REPO/$1/actions/caches/$CACHE_ID" -u "$USER:$TOKEN")
  checkCommandStatus "$STATUS_CODE"
  checkLastCommand
}

function checkLastCommand {
    if [ $? -ne 0 ]; then
      echo "Problem in the command. Exiting."
      exit 1
    fi
}

function checkCommandStatus {
  if [ $1 -eq 404 ]
  then
    exit 1
  else
    if [ $1 -ne 404 ]; then
      echo "Command status code: $1"
    fi
  fi
}

deleteCache "$REPOSITORY" "$CACHE_KEY"