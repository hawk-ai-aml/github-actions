
# Setup trap
set -e -o pipefail -T -E
trap 'hawk.die ${LINENO} "${BASH_COMMAND}"' ERR

# Source dynamic stuff
[[ -f ${HOME}/.bashrc.dynamic ]] && source ${HOME}/.bashrc.dynamic

# Source github lib
[[ -f ${HOME}/.bashrc.github.inc.sh ]] && source ${HOME}/.bashrc.github.inc.sh

# Source bashrc from the builder
[[ -f ${HOME}/.bashrc ]] && source ${HOME}/.bashrc