function validatePRTitle {
  echo Validating pull request title for "$1" with "$2"
}

function validatePRLabels {
  echo Validating pull request label for "$1" with "$2"
}

validatePRTitle "$REPOSITORY" "$TITLE"
validatePRLabels "$REPOSITORY" "$LABELS"