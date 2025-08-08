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

    local http_code
    http_code=$(cat <<EOF | curl --data-binary @- "${pushgateway_url}/metrics/job/${job_name}/instance/${repo_sanitized}" --max-time 10 --silent --write-out '%{http_code}' || echo "000"
# HELP workflow_runs_total Total number of workflow runs started
# TYPE workflow_runs_total counter
workflow_runs_total{repository="${repo_sanitized}",ref="${github_ref}"${current_labels}} 1
# HELP workflow_started Timestamp when workflow was started
# TYPE workflow_started gauge
workflow_started{repository="${repo_sanitized}",workflow_run_id="${github_run_id}",ref="${github_ref}"${current_labels}} ${start_time}
EOF
    )
    echo "$http_code"
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

    multi_value_labels="$3"

    if [ -n "$multi_value_labels" ]; then
        local label_name label_values
        label_name=$(echo "$multi_value_labels" | cut -d'=' -f1)
        label_values=$(echo "$multi_value_labels" | cut -d'=' -f2)

        IFS=',' read -ra values <<< "$label_values"
        for value in "${values[@]}"; do
            local current_labels=",$label_name=$value"
            if [ -n "$additional_labels" ]; then
                current_labels="$current_labels$additional_labels"
            fi

            local http_code
            http_code=$(send_metric "$current_labels" "$repo_sanitized" "$4" "$5" "$6" "$7" "$start_time")
            echo "Start metric HTTP response code for $label_name=$value: $http_code"
        done
    else
        local http_code
        http_code=$(send_metric "$additional_labels" "$repo_sanitized" "$4" "$5" "$6" "$7" "$start_time")
        echo "Start metric HTTP response code: $http_code"
    fi
}

main "$@"