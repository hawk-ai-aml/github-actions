#!/usr/bin/env bash
set -euo pipefail

# Function to compare semantic versions
compare_versions() {
  # Returns 0 if $1 >= $2, otherwise returns 1
  [ "$(printf '%s\n' "$1" "$2" | sort -V | head -n 1)" != "$1" ]
}

get_tag() {
  local metadata="$1"
  local module="$2"
  local kustomize_overlays="$3"
  local custom_tags="$4"

  local module_ecr_repo
  module_ecr_repo=$(echo "$metadata" | jq -cr --arg MODULE "$module" '.modules[$MODULE].ecr.repository')
  echo "ECR_REPO=$module_ecr_repo" >&2

  local matched_tag
  if [[ "$kustomize_overlays" == "prod" ]]; then
    matched_tag=$(echo "$custom_tags" | tr ' ' '\n' | grep -E "(^|[-])$module_ecr_repo-[0-9]" | head -n 1 || true)
  else
    matched_tag=$(echo "$custom_tags" | tr ' ' '\n' | grep -E "(^|[-])${module_ecr_repo}([-]|$)" | head -n 1 || true)
  fi

  echo "$matched_tag"
}
