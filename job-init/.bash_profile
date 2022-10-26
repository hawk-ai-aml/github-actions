#!/bin/bash

####
# Code convention:
#
# function-namespace.primary-function-name.secondary-function-name
#
# Avoid using :: in names of functions, it is used as a magic separator by github and using it will break error messages
#  
###

hawk.fail() {
  echo ${@} | tee -a ${GITHUB_OUTPUT}
  exit 1
}

hawk.assert-command-or-fail() {
  local cmd=$1
  local error_message=$2

  set +e
  ${cmd} 2>&1
  local exit_code=$?
  set -e

  if [[ "${exit_code}" != 0 ]]; then
    # https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-error-message
    hawk.fail "::error file=${BASH_SOURCE[0]},line=${LINENO},title=${FUNCNAME[0]}::${error_message}"
  fi
}

hawk.runner-prechecks() {
  hawk.assert-command-or-fail "yj -v" "yj is missing"
  hawk.assert-command-or-fail "jq --version" "jq is missing"
  hawk.assert-command-or-fail "locale | grep en_US.UTF-8" "locale should be en_US.UTF-8"

  # Uncomment this in case you want to simulate failure on precheck
  # hawk.assert-command-or-fail "false" "test-failure" 
}

hawk.job-init() {
  BUILD_BRANCH=$(echo ${GITHUB_REF_NAME} | sed 's,\/,-,g; s,\#,,g')
  GIT_SHA_SHORT=${GITHUB_SHA:0:7}
  if [[ ${GITHUB_REF_TYPE} == "tag" ]]; then
    IMAGE_TAG=${BUILD_BRANCH}
  else
    IMAGE_TAG=${BUILD_BRANCH}-${GIT_SHA_SHORT}
  fi

  cat << EOF | tee -a ${GITHUB_ENV}
HAWK_BUILD_BRANCH=${BUILD_BRANCH}
HAWK_IMAGE_TAG=${IMAGE_TAG}
HAWK_GIT_SHA_SHORT=${GIT_SHA_SHORT}
EOF

  # Make sure locale is set to en_US.UTF-8
  # https://hawkai.atlassian.net/browse/SRE-690
  # https://hawkai.atlassian.net/browse/SRE-734
  sudo apt update -yyq
  sudo apt install -yyq locales-all
  export LC_ALL=en_US.UTF-8
  echo "LC_ALL=en_US.UTF-8" >> ${GITHUB_ENV}
}

# Source bashrc from the builder
source ${HOME}/.bashrc