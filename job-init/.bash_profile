
# Setup trap
set -e -o pipefail -T -E

# Source dynamic stuff
[[ -f ${HOME}/.bashrc.dynamic.inc.sh ]] && source ${HOME}/.bashrc.dynamic.inc.sh

# Source github lib
[[ -f ${HOME}/.bashrc.github.inc.sh ]] && source ${HOME}/.bashrc.github.inc.sh

# Source bashrc from the builder
[[ -f ${HOME}/.bashrc ]] && source ${HOME}/.bashrc

trap 'hawk.die ${LINENO} "${BASH_COMMAND}"' ERR
trap 'hawk.exit-trap ${LINENO} "${BASH_COMMAND}"' EXIT

# End of file
