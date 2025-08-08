#!/bin/bash
set -euo pipefail

send_metric() {
    local current_labels="$1"
    local repo_sanitized="$2"
    local pushgateway_url="$3"
    local job_name="$4"
    local github_ref="$5"
    local github_run_id="$6"
    local start_time="$7"

    local metrics
    metrics=$(cat <<EOF
# HELP workflow_runs_total Total number of workflow runs started
# TYPE workflow_runs_total counter
workflow_runs_total{repository="${repo_sanitized}",ref="${github_ref}"${current_labels}} 1
# HELP workflow_started Timestamp when workflow was started
# TYPE workflow_started gauge
workflow_started{repository="${repo_sanitized}",workflow_run_id="${github_run_id}",ref="${github_ref}"${current_labels}} ${start_time}
EOF
    )

    echo "=== Metrics to be sent to Prometheus ==="
    echo "$metrics"
    echo "========================================"

    local http_code
    http_code=$(echo "$metrics" | curl --data-binary @- "${pushgateway_url}/metrics/job/${job_name}/instance/${repo_sanitized}" --max-time 10 --silent --write-out '%{http_code}' || echo "000")
    echo "$http_code"
}

generate_combinations() {
    local multi_value_labels="$1"
    local formatted_additional_labels="$2"

    if [ -z "$multi_value_labels" ]; then
        echo "$formatted_additional_labels"
        return
    fi

    # Parse all multi-value label pairs
    declare -A label_names_to_values
    local label_names=()

    IFS=' ' read -ra pairs <<< "$multi_value_labels"
    for pair in "${pairs[@]}"; do
        if [ -n "$pair" ] && [[ "$pair" == *"="* ]]; then
            local label_name label_values
            label_name=$(echo "$pair" | cut -d'=' -f1)
            label_values=$(echo "$pair" | cut -d'=' -f2)

            label_names+=("$label_name")
            label_names_to_values["$label_name"]="$label_values"
        fi
    done

    # Convert arrays to string representation for recursive function
    local names_str="${label_names[*]}"
    local values_str=""
    for name in "${label_names[@]}"; do
        values_str="${values_str}${name}=${label_names_to_values[$name]} "
    done

    generate_combinations_recursive "" "$names_str" "$values_str" "$formatted_additional_labels"
}

generate_combinations_recursive() {
    local current_labels="$1"
    local names_str="$2"
    local values_str="$3"
    local formatted_additional_labels="$4"

    # Convert string back to array
    IFS=' ' read -ra names <<< "$names_str"

    if [ ${#names[@]} -eq 0 ]; then
        echo "${current_labels}${formatted_additional_labels}"
        return
    fi

    local first_name="${names[0]}"
    local remaining_names="${names[@]:1}"

    # Extract values for first name
    local label_values=""
    IFS=' ' read -ra value_pairs <<< "$values_str"
    for pair in "${value_pairs[@]}"; do
        if [[ "$pair" == "${first_name}="* ]]; then
            label_values="${pair#*=}"
            break
        fi
    done

    IFS=',' read -ra values <<< "$label_values"
    for value in "${values[@]}"; do
        local new_labels="${current_labels},${first_name}=\"${value}\""
        generate_combinations_recursive "$new_labels" "$remaining_names" "$values_str" "$formatted_additional_labels"
    done
}

main() {
    local start_time repo_sanitized additional_labels multi_value_labels

    start_time=$(date +%s)
    echo "start-time=$start_time" >> "$GITHUB_OUTPUT"
    echo "Start time: $start_time"

    repo_sanitized=$(echo "$1" | tr '/' '_')
    echo "Repository sanitized: $repo_sanitized"

    additional_labels="$2"
    echo "Additional labels: $additional_labels"

    local formatted_additional_labels=""
    if [ -n "$additional_labels" ]; then
        IFS=',' read -ra label_pairs <<< "$additional_labels"
        for pair in "${label_pairs[@]}"; do
            if [ -n "$pair" ]; then
                local key value
                key=$(echo "$pair" | cut -d'=' -f1)
                value=$(echo "$pair" | cut -d'=' -f2- | sed 's/^"//;s/"$//')
                formatted_additional_labels="${formatted_additional_labels},${key}=\"${value}\""
            fi
        done
    fi

    multi_value_labels="$3"

    while IFS= read -r label_combination; do
        local http_code
        http_code=$(send_metric "$label_combination" "$repo_sanitized" "$4" "$5" "$6" "$7" "$start_time")
        echo "Start metric HTTP response code for labels$label_combination: $http_code"
    done < <(generate_combinations "$multi_value_labels" "$formatted_additional_labels")
}

main "$@"
