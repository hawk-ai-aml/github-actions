#!/bin/bash

################################################################################
# Code convention:
#
# function-namespace.primary-function-name.secondary-function-name
#
# Avoid using :: in names of functions or printing it, it is used as a magic separator by github and using it will break error messages and who knows what else
#  
################################################################################

################################################################################
# Basic primitives
################################################################################

# Low-level github failure
hawk.die() {
  (
    echo -n "::error title=stacktrace::"

    # beginning banner
    echo -n "--- 8< begin copy here "
    printf -- '-%.0s' {1..100}

    # Include original arguments into the stacktrace annotation
    # %0A because of https://github.com/actions/toolkit/issues/193
    echo -n "%0A${@}%0A%0AWorkflow: ${HAWK_WORKFLOW_ID}%0AStacktrace:%0A" | tee -a ${GITHUB_OUTPUT}

    # Include stacktrace
    local frame=0
    # https://wiki.bash-hackers.org/commands/builtin/caller
    while trace=$(caller $frame); do
      ((++frame));
      echo -n "  ${trace}%0A"
    done

    # end banner
    echo -n "--- >8 end copy here   "
    printf -- '-%.0s' {1..100}

  ) | tee -a ${GITHUB_OUTPUT}

  # Attempt to notify in Slack
  curl --silent -X POST --data-urlencode "payload={\"channel\": \"#github-workflow-death\", \"text\": \":skull_and_crossbones: <${HAWK_WORKFLOW_ID}|workflow in ${GITHUB_REPOSITORY}> died: ${@}\"}" ${CICD_MIGRATION_SLACK_WEBHOOK_URL}

  exit 1
}

# Fail if one-liner fails
hawk.assert-command-or-die() {
  local cmd=$1
  local error_message=$2

  set +e
  eval ${cmd} 2>&1 > /dev/null
  local exit_code=$?
  set -e

  if [[ "${exit_code}" != 0 ]]; then
    # https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-error-message
    hawk.die "${error_message}"
  fi
}

################################################################################
# Runnner initialization and prechecks
################################################################################

hawk.runner-prechecks() {
  yj -v || hawk.die "yj is missing"
  jq --version || hawk.die "jq is missing"
  locale | grep en_US.UTF-8 || hawk.die "locale should be en_US.UTF-8"
  hawk.get-component-metadata audit-trail hawk || hawk.die "cannot fetch component metadata during precheck"

  # Uncomment this in case you want to simulate failure on precheck
  # hawk.get-component-metadata audit-trail-3000 hawk || hawk.die "simulated: cannot fetch non-existing component metadata during precheck, probably someone is debugging something, otherwise contact your favourite sre"
  # false || hawk.die "this is a simulated failure, probably someone is debugging something, otherwise contact your favourite sre"
}

hawk.setup.locale() {
  sudo apt-get update -yyqq
  sudo apt-get install -yyqq locales-all
  export LC_ALL=en_US.UTF-8
  echo "LC_ALL=en_US.UTF-8" >> ${GITHUB_ENV}
}

hawk.setup.yj() {
  YJ_VERSION=5.1.0

  mkdir -p "${HOME}"/bin
  echo "PATH=${HOME}/bin:${PATH}" >> "${GITHUB_ENV}"

  yj -v || (
    echo "Installing yj ${YJ_VERSION}"
    sudo curl \
      --show-error \
      --silent \
      --location \
      --fail \
      --retry 3 \
      --connect-timeout 5 \
      --max-time 60 \
      --output "${HOME}/bin/yj" \
      "https://github.com/sclevine/yj/releases/download/v${YJ_VERSION}/yj-linux-amd64"
    sudo chmod +x "${HOME}"/bin/yj
  )
}

hawk.job-init() {
  # Make sure locale is set to en_US.UTF-8
  # https://hawkai.atlassian.net/browse/SRE-690
  # https://hawkai.atlassian.net/browse/SRE-734
  hawk.setup.locale

  # Make sure yj is installed, which may be not the case
  hawk.setup.yj

  BUILD_BRANCH=$(echo ${GITHUB_REF_NAME} | sed 's,\/,-,g; s,\#,,g')
  GIT_SHA_SHORT=${GITHUB_SHA:0:7}
  if [[ ${GITHUB_REF_TYPE} == "tag" ]]; then
    IMAGE_TAG=${BUILD_BRANCH}
  else
    IMAGE_TAG=${BUILD_BRANCH}-${GIT_SHA_SHORT}
  fi

  cat << EOF | tee -a ${GITHUB_ENV}
HAWK_METADATA_REPO=hawk-ai-aml/github-actions
HAWK_METADATA_SUBPATH=workflow-init/profile
HAWK_METADATA_DEFAULT_REF=master
HAWK_METADATA_DEFAULT_PROFILE=hawk

HAWK_BUILD_BRANCH=${BUILD_BRANCH}
HAWK_IMAGE_TAG=${IMAGE_TAG}
HAWK_GIT_SHA_SHORT=${GIT_SHA_SHORT}
EOF
}

################################################################################
# Working with metadata and profiles
################################################################################

hawk.get-metadata-json() {
  local repo=${HAWK_METADATA_REPO}
  local subpath=${HAWK_METADATA_SUBPATH}
  local ref=${HAWK_METADATA_DEFAULT_REF}

  local profile=${1:-${HAWK_METADATA_DEFAULT_PROFILE}}

  [[ ! -z "${profile}" ]] || hawk.die "metadata profile should not be empty"
  [[ ! -z "${ref}" ]] || hawk.die "metadata ref should be not empty"
  [[ ! -z "${repo}" ]] || hawk.die "metadata repo should be not empty"
  [[ ! -z "${subpath}" ]] || hawk.die "metadata subpath should be not empty"

  local metadata_url="https://raw.githubusercontent.com/${repo}/${ref}/${subpath}/${profile}.yml"
  local metadata_workspace_path="${GITHUB_WORKSPACE}/.hawk/profile/${profile}.yml"
  
  # if there is profile folder in the repo we get profiles from there, otherwise we fetch it from github-actions
  # We pass it through both yj and jq to make sure there are no unexpected basic parsing errors
  if [[ -f ${metadata_workspace_path} ]]; then
    cat ${metadata_workspace_path} | yj -y | jq -Mcr .
  else
    curl --silent --fail --location --show-error ${metadata_url} | yj -y | jq -Mcr .
  fi
}

hawk.get-component-metadata() {
  local component=$1
  local profile=$2

  [[ ! -z "${component}" ]] || hawk.die "component should not be empty"
  [[ ! -z "${profile}" ]] || hawk.die "profile should not be empty"

  local metadata=$(hawk.get-metadata-json ${profile} | jq -Mcr --arg COMPONENT ${component} '.component[$COMPONENT]')

  [[ ${#metadata} -gt 10 ]] || hawk.die "metadata is too short: ${metadata}"

  echo ${metadata}
}

hawk.get-component-image() {
  local component=$1
  local profile=$2
  local module=${3:-}

  [[ ! -z "${component}" ]] || hawk.die "component profile should not be empty"
  [[ ! -z "${profile}" ]] || hawk.die "profile ref should be not empty"

  local metadata=$(hawk.get-component-metadata ${{ inputs.component }} ${{ inputs.profile }})

  if [[ "${module}" == "" ]]; then
    local registry=$(echo ${metadata} | jq -cr .ecr.registry)
    local region=$(echo ${metadata} | jq -cr .ecr.region)
    local repository=$(echo ${metadata} | jq -cr .ecr.repository)
  else
    local registry=$(echo ${metadata} | jq -cr .modules[env.MODULE].ecr.registry)
    local region=$(echo ${metadata} | jq -cr .modules[env.MODULE].ecr.region)
    local repository=$(echo ${metadata} | jq -cr .modules[env.MODULE].ecr.repository)
  fi

  [[ "${registry}" == "null" ]] && hawk.die "empty registry"
  [[ "${region}" == "null" ]] && hawk.die "empty region"
  [[ "${repository}" == "null" ]] && hawk.die "empty repository"

  echo "${registry}.dkr.ecr.${region}.amazonaws.com/${repository}"
}

hawk.get-component-kustomize-path() {
  local component=$1
  local profile=$2
  local module=${3:-}

  [[ ! -z "${component}" ]] || hawk.die "component profile should not be empty"
  [[ ! -z "${profile}" ]] || hawk.die "profile ref should be not empty"

  local metadata=$(hawk.get-component-metadata ${{ inputs.component }} ${{ inputs.profile }})

  if [[ "${module}" == "" ]]; then
    local kustomize_path=$(echo ${metadata} | jq -cr .kustomize.path)
  else
    local kustomize_path=$(echo ${metadata} | jq -cr .modules[env.MODULE].kustomize.path)
  fi

  [[ "${kustomize_path}" == "null" ]] && hawk.die "empty kustomize path"

  echo ${kustomize_path}
}

# Source bashrc from the builder
[[ -f ${HOME}/.bashrc ]] && source ${HOME}/.bashrc