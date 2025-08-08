#!/bin/bash
set -euo pipefail

send_metrics() {
    local current_labels="$1"
    local repo_sanitized="$2"
    local pushgateway_url="$3"
    local job_name="$4"
    local github_ref="$5"
    local github_run_id="$6"
    local job_status="$7"
    local end_time="$8"
    local duration="$9"
    local additional_metrics="${10}"

    local metrics
    metrics=$(cat <<EOF
# HELP workflow_completed_total Total number of completed workflow runs
# TYPE workflow_completed_total counter
workflow_completed_total{repository="${repo_sanitized}",ref="${github_ref}",status="${job_status}"${current_labels}} 1
# HELP workflow_completed Timestamp when workflow was completed
# TYPE workflow_completed gauge
workflow_completed{repository="${repo_sanitized}",workflow_run_id="${github_run_id}",ref="${github_ref}",status="${job_status}"${current_labels}} ${end_time}
# HELP workflow_duration_seconds Duration of workflow execution in seconds
# TYPE workflow_duration_seconds gauge
workflow_duration_seconds{repository="${repo_sanitized}",workflow_run_id="${github_run_id}",ref="${github_ref}",status="${job_status}"${current_labels}} ${duration}
EOF
    )

    if [ -n "$additional_metrics" ]; then
        metrics="$metrics"$'\n'"$additional_metrics"
    fi

    echo "=== Metrics to be sent to Prometheus ==="
    echo "$metrics"
    echo "========================================"

    local http_code
    http_code=$(echo "$metrics" | curl --data-binary @- "${pushgateway_url}/metrics/job/${job_name}/instance/${repo_sanitized}" --max-time 10 --silent --write-out '%{http_code}' || echo "000")
    echo "$http_code"
}

main() {
    local start_time end_time duration repo_sanitized additional_labels multi_value_labels

    start_time="$1"
    if [ -z "$start_time" ]; then
        start_time=$(date +%s)
        echo "Warning: Start time not available, using current time"
    fi
    echo "Start time: $start_time"

    end_time=$(date +%s)
    echo "End time: $end_time"
    duration=$((end_time - start_time))
    echo "Duration: $duration seconds"

    repo_sanitized=$(echo "$2" | tr '/' '_')
    echo "Repository sanitized: $repo_sanitized"

    additional_labels="$3"
    echo "Additional labels: $additional_labels"

    local formatted_additional_labels=""
    if [ -n "$additional_labels" ]; then
        IFS=',' read -ra label_pairs <<< "$additional_labels"
        for pair in "${label_pairs[@]}"; do
            if [ -n "$pair" ]; then
                local key value
                key=$(echo "$pair" | cut -d'=' -f1)
                value=$(echo "$pair" | cut -d'=' -f2- | sed 's/^"//;s/"$//')  # Remove existing quotes
                formatted_additional_labels="${formatted_additional_labels},${key}=\"${value}\""
            fi
        done
    fi

    multi_value_labels="$4"

    if [ -n "$multi_value_labels" ]; then
        local label_name label_values
        label_name=$(echo "$multi_value_labels" | cut -d'=' -f1)
        label_values=$(echo "$multi_value_labels" | cut -d'=' -f2)

        IFS=',' read -ra values <<< "$label_values"
        for value in "${values[@]}"; do
            local current_labels=",${label_name}=\"${value}\"${formatted_additional_labels}"

            local http_code
            http_code=$(send_metrics "$current_labels" "$repo_sanitized" "$5" "$6" "$7" "$8" "$9" "$end_time" "$duration" "${10}")
            echo "Completion metrics HTTP response code for $label_name=$value: $http_code"
        done
    else
        local http_code
        http_code=$(send_metrics "$formatted_additional_labels" "$repo_sanitized" "$5" "$6" "$7" "$8" "$9" "$end_time" "$duration" "${10}")
        echo "Completion metrics HTTP response code: $http_code"
    fi
}

main "$@"