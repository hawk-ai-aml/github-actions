#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No color

# Build and push Docker image
build_and_push() {
    local image_name=$1
    local build_args=$2

    echo -e "${GREEN} Building Docker image: ${image_name}${NC}"
    DOCKER_BUILDKIT=1 docker build $build_args --no-cache -t "${image_name}:${IMAGE_TAG}" .
    docker push "${image_name}:${IMAGE_TAG}"
}

# Tag and push Docker image to another registry
tag_and_push() {
    local source_image=$1
    local target_image=$2
    local target_tag=$3

    echo -e "${GREEN} Tagging and Pushing image: ${source_image} → ${target_image}${NC}"
    docker tag "${source_image}:${IMAGE_TAG}" "${target_image}:${target_tag}"
    docker push "${target_image}:${target_tag}"
}
