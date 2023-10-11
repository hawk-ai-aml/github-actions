#!/bin/bash

# Check if a branch name is provided
if [ -z "$1" ]; then
    echo "Please provide the branch name you want to squash."
    exit 1
fi

BRANCH_NAME=$1

# Ensure the branch exists
if ! git rev-parse --verify $BRANCH_NAME > /dev/null 2>&1; then
    echo "The branch $BRANCH_NAME does not exist."
    exit 1
fi

# Switch to the branch
git checkout $BRANCH_NAME

# Count the number of commits
COMMIT_COUNT=$(git rev-list --count HEAD ^$(git merge-base HEAD master))

# Rebase and squash
git reset $(git merge-base HEAD master)
git add -A
git commit -m "Squashed all commits in $BRANCH_NAME into one"
echo "Successfully squashed $COMMIT_COUNT commits into one."

