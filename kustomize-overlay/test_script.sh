### Use this script to test if comparing the git versions work or not
### Important to validate if an overlay version should be updated or not based on the numerical (chronological) order of the tags

# Extract the current tag from the overlay file
IMAGE_NAME="860641649575.dkr.ecr.eu-central-1.amazonaws.com/hawkai-case-manager-frontend"
TAG=4.2.1

# Get the current tag from kustomize rendered output
current_tag=$(kustomize build "./" | grep -E "${IMAGE_NAME}:" | awk -F':' '{print $NF}' | tr -d '[:space:]')

# Function to compare semantic versions
compare_versions() {
# Returns 0 if $1 >= $2, otherwise returns 1
[ "$(printf '%s\n' "$1" "$2" | sort -V | head -n 1)" != "$1" ]
}

# Check if the new tag is greater than the current tag
if compare_versions "$TAG" "$current_tag"; then
    kustomize edit set image ${IMAGE_NAME}:${TAG}
    echo "Updated overlay ${overlay} of ${ECR_REPOSITORY} from $current_tag to ${TAG}"
else
    echo "No update needed. Current tag '$current_tag' is equal to or newer than '$TAG'."
fi
