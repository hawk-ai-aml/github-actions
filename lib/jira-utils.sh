#!/usr/bin/env bash
set -euo pipefail

# --------------------------------------
# Function: Extract Jira ticket from branch name or PR title
# --------------------------------------
extract_jira_ticket() {
  local TEAMS="pe tm cmi nfr workflow cds dc crr gen"
  local GITHUB_BRANCH="$1"
  local PR_TITLE="$2"

  # Normalize to lowercase
  local branch_lower
  branch_lower=$(echo "$GITHUB_BRANCH" | tr '[:upper:]' '[:lower:]')
  local title_lower
  title_lower=$(echo "$PR_TITLE" | tr '[:upper:]' '[:lower:]')

  # Regex pattern for Jira ticket (prefix-number)
  local pattern='\b([a-z]+-[0-9]+)\b'

  local candidate=""
  if [[ $branch_lower =~ $pattern ]]; then
    candidate="${BASH_REMATCH[1]}"
  elif [[ $title_lower =~ $pattern ]]; then
    candidate="${BASH_REMATCH[1]}"
  else
    echo "No Jira ticket found" >&2
    return 1
  fi

  # Extract prefix (before '-')
  local prefix="${candidate%%-*}"

  # Validate against TEAMS
  for team in $TEAMS; do
    if [[ "$prefix" == "$team" ]]; then
      echo "$candidate"
      return 0
    fi
  done

  echo "Invalid Jira ticket prefix: $candidate (not in TEAMS list)" >&2
  return 1
}

# --------------------------------------
# Function: Update Jira labels for an issue
# --------------------------------------
update_jira_labels() {
  local JIRA_BASE_URL="https://hawkai.atlassian.net"
  local ISSUE_KEY="$1"
  local JIRA_USER="$2"
  local JIRA_API_TOKEN="$3"
  local LABELS_STRING="$4"

  if [[ -z "$ISSUE_KEY" || -z "$LABELS_STRING" ]]; then
    echo "Usage: update_jira_labels ISSUE_KEY JIRA_USER JIRA_API_TOKEN \"label1 label2 ...\"" >&2
    return 1
  fi

  # Split string into array
  IFS=' ' read -r -a LABELS <<< "$LABELS_STRING"

  # Build JSON array for appending
  local LABELS_JSON=""
  for label in "${LABELS[@]}"; do
    LABELS_JSON+="{\"add\":\"$label\"},"
  done
  LABELS_JSON="[${LABELS_JSON%,}]"

  echo "Appending labels for $ISSUE_KEY -> ${LABELS[*]}"

  curl -s -X PUT \
    -u "$JIRA_USER:$JIRA_API_TOKEN" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    --data "{
      \"update\": {
        \"labels\": $LABELS_JSON
      }
    }" \
    "$JIRA_BASE_URL/rest/api/3/issue/$ISSUE_KEY"
}

# --------------------------------------
# Example usage (uncomment to test)
# --------------------------------------
# GITHUB_BRANCH="feature/TM-767-awesome-change"
# PR_TITLE="Add feature for TM-767"
# JIRA_TICKET=$(extract_jira_ticket "$GITHUB_BRANCH" "$PR_TITLE")
# update_jira_labels "$JIRA_TICKET" "$JIRA_USER" "$JIRA_TOKEN" "ci github workflow"
