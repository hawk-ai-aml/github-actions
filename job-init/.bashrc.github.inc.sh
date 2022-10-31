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
workflow.die() {
  # prevent multiple trap execution
  if [[ -f ${RUNNER_TEMP}/.untrap ]]; then
    echo "Extra trap suppressed"
    exit 1
  else
    touch ${RUNNER_TEMP}/.untrap
  fi
  # Prevent cluttering debugging, change this to -x to debug this function
  set +x

  # Prepare github error
  # %0A because of https://github.com/actions/toolkit/issues/193
  (
    echo -n "::error title=stacktrace::"

    # beginning banner
    echo -n "--- 8< begin copy here "
    printf -- '-%.0s' {1..100}

    # Include original arguments into the stacktrace annotation
    echo -en "%0A${@}%0A%0AWorkflow: ${HAWK_WORKFLOW_ID}%0AName: ${GITHUB_WORKFLOW}%0AAttempt: ${GITHUB_RUN_ATTEMPT}%0AStacktrace:%0A"

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

    # Make sure there are no new lines
  ) | tr -d '\n' | tee -a ${GITHUB_OUTPUT}
  
  # Exit early if slack was disabled
  if [[ ${DISABLE_SLACK} == "true" ]]; then
    exit 1
  fi

  # Prepare slack message
  (
    # Include original arguments into the stacktrace annotation
    echo -n "${@}\n\nWorkflow: ${HAWK_WORKFLOW_ID}\nName: ${GITHUB_WORKFLOW}\nAttempt: ${GITHUB_RUN_ATTEMPT}\nStacktrace:\n"

    # Include stacktrace
    local frame=0
    # https://wiki.bash-hackers.org/commands/builtin/caller
    while trace=$(caller $frame); do
      ((++frame));
      echo -n "  ${trace}\n"
    done
  ) >> ${RUNNER_TEMP}/.slack-failure-message

  # based on https://stackoverflow.com/a/67390352
  # Attempt to notify in Slack, but do not produce error
  fallback_message=":skull_and_crossbones: <${HAWK_WORKFLOW_ID}|workflow in ${GITHUB_REPOSITORY}> died"
  markdown_message=":skull_and_crossbones: <${HAWK_WORKFLOW_ID}|workflow in ${GITHUB_REPOSITORY}> died\n\`\`\`$(cat ${RUNNER_TEMP}/.slack-failure-message)\`\`\`"

  # Convert markdown message to correct format for jq parse
  printf -v markdown_message_unescaped %b "$markdown_message"

  # Create the json string
  json_string=$( jq -nr \
    --arg jq_fallback_message "$fallback_message" \
    --arg jq_channel "#github-workflow-death" \
    --arg jq_section_type "section" \
    --arg jq_markdown_type "mrkdwn" \
    --arg jq_markdown_message "$markdown_message_unescaped" \
    '{
        channel: $jq_channel,
        text: $jq_fallback_message, 
        blocks: [
            {
                type: $jq_section_type,
                text: {
                    type: $jq_markdown_type, 
                    text: $jq_markdown_message
                }
            }
        ]
    }')

  curl --silent -X POST -H 'Content-type: application/json' --data "$json_string" ${CICD_MIGRATION_SLACK_WEBHOOK_URL} || true

  exit 1
}

# Exit trap 
workflow.exit-trap() {
  [[ "$?" == 0 ]] && exit 0 || workflow.die "${@}"
}

# Error handling
workflow.errexit.disable() {
  shopt -u -o errexit
  trap - ERR EXIT
}

workflow.errexit.enable() {
  shopt -s -o errexit
  trap 'workflow.die ${LINENO} "${BASH_COMMAND}"' ERR
  trap 'workflow.exit-trap ${LINENO} "${BASH_COMMAND}"' EXIT
}

workflow.notice() {
  echo "::notice::${1}"
}

# Convert json array string to loopable string
util.ja2ba() {
  echo $1 | jq -cr  '. | join(" ")'
}

################################################################################
# Runnner initialization and prechecks
################################################################################

hawk.runner-prechecks() {
  yj -v || workflow.die "yj is missing"
  jq --version || workflow.die "jq is missing"
  locale | grep en_US.UTF-8 || workflow.die "locale should be en_US.UTF-8"
  hawk.get-component-metadata audit-trail hawk || workflow.die "cannot fetch component metadata during precheck"
  hawk.get-component-metadata backend hawk core || workflow.die "cannot fetch component module metadata during precheck"

  # Uncomment this in case you want to simulate failure on precheck
  # hawk.get-component-metadata audit-trail-3000 hawk || workflow.die "simulated: cannot fetch non-existing component metadata during precheck, probably someone is debugging something, otherwise contact your favourite sre"
  # false || workflow.die "this is a simulated failure, probably someone is debugging something, otherwise contact your favourite sre"
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

hawk.setup.ssh-known-hosts() {
  mkdir -p ${HOME}/.ssh
  cat <<EOF >> ${HOME}/.ssh/known_hosts
bitbucket.org ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAubiN81eDcafrgMeLzaFPsw2kNvEcqTKl/VqLat/MaB33pZy0y3rJZtnqwR2qOOvbwKZYKiEO1O6VqNEBxKvJJelCq0dTXWT5pbO2gDXC6h6QDXCaHo6pOHGPUy+YBaGQRGuSusMEASYiWunYN0vCAI8QaXnWMXNMdFP3jHAJH0eDsoiGnLPBlBp4TNm6rYI74nMzgz3B9IikW4WVK+dc8KZJZWYjAuORU3jc1c/NPskD2ASinf8v3xnfXeukU0sJ5N6m5E8VLjObPEO+mN2t/FZTMZLiFqPWc/ALSqnMnnhwrNi2rbfg/rd/IpL8Le3pSBne8+seeFVBoGqzHM9yXw==
github.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==
EOF
}

hawk.setup.git() {
  git config --global user.name "GitHub Actions"
  git config --global user.email "github-actions@hawk.ai"
}

hawk.job-init() {
  # Make sure locale is set to en_US.UTF-8
  # https://hawkai.atlassian.net/browse/SRE-690
  # https://hawkai.atlassian.net/browse/SRE-734
  hawk.setup.locale

  # Make sure yj is installed, which may be not the case
  hawk.setup.yj

  # Setup known hosts 
  hawk.setup.ssh-known-hosts

  # Prepar git for potential pushes
  hawk.setup.git

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

  [[ ! -z "${profile}" ]] || workflow.die "metadata profile should not be empty"
  [[ ! -z "${ref}" ]] || workflow.die "metadata ref should be not empty"
  [[ ! -z "${repo}" ]] || workflow.die "metadata repo should be not empty"
  [[ ! -z "${subpath}" ]] || workflow.die "metadata subpath should be not empty"

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

  [[ ! -z "${component}" ]] || workflow.die "component should not be empty"
  [[ ! -z "${profile}" ]] || workflow.die "profile should not be empty"

  local metadata=$(hawk.get-metadata-json ${profile} | jq -Mcr --arg COMPONENT ${component} '.component[$COMPONENT]')

  [[ ${#metadata} -gt 10 ]] || workflow.die "metadata is too short: ${metadata}"

  echo ${metadata}
}

hawk.get-component-image() {
  local component=$1
  local profile=$2
  local module=${3:-}

  [[ ! -z "${component}" ]] || workflow.die "component profile should not be empty"
  [[ ! -z "${profile}" ]] || workflow.die "profile ref should be not empty"

  local metadata=$(hawk.get-component-metadata ${component} ${profile})

  if [[ "${module}" == "" ]]; then
    local registry=$(echo ${metadata} | jq -cr .ecr.registry)
    local region=$(echo ${metadata} | jq -cr .ecr.region)
    local repository=$(echo ${metadata} | jq -cr .ecr.repository)
  else
    local registry=$(echo ${metadata} | jq -cr --arg MODULE ${module} '.modules[$MODULE].ecr.registry')
    local region=$(echo ${metadata} | jq -cr --arg MODULE ${module} '.modules[$MODULE].ecr.region')
    local repository=$(echo ${metadata} | jq -cr --arg MODULE ${module} '.modules[$MODULE].ecr.repository')
  fi

  [[ "${registry}" == "null" ]] && workflow.die "empty registry"
  [[ "${region}" == "null" ]] && workflow.die "empty region"
  [[ "${repository}" == "null" ]] && workflow.die "empty repository"

  echo "${registry}.dkr.ecr.${region}.amazonaws.com/${repository}"
}

hawk.get-component-kustomize-path() {
  local component=$1
  local profile=$2
  local module=${3:-}

  [[ ! -z "${component}" ]] || workflow.die "component profile should not be empty"
  [[ ! -z "${profile}" ]] || workflow.die "profile ref should be not empty"

  local metadata=$(hawk.get-component-metadata ${component} ${profile})

  if [[ "${module}" == "" ]]; then
    local kustomize_path=$(echo ${metadata} | jq -cr .kustomize.path)
  else
    local kustomize_path=$(echo ${metadata} | jq -cr --arg MODULE ${module} '.modules[$MODULE].kustomize.path')
  fi

  [[ "${kustomize_path}" == "null" ]] && workflow.die "empty kustomize path"

  echo ${kustomize_path}
}

# Push Docker image

hawk.push-docker-image() {
  local image_fqn=${1}

  [[ ! -z "${image}" ]] || workflow.die "image should be not empty"

  export DOCKER_CLI_EXPERIMENTAL=enabled

  workflow.errexit.disable
  docker manifest inspect ${image_fqn} 2>&1> /dev/null
  inspect_code=$?
  workflow.errexit.enable

  if [[ "${inspect_code}" != 0 ]]; then  
    docker push ${image_fqn}
  fi
}


# End of file
