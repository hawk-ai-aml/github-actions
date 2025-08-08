import os
import sys
import time
from itertools import product
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import urlopen, Request


def send_metric(current_labels, repo_sanitized, pushgateway_url, job_name, github_ref, github_run_id, start_time):
    metrics = f"""# HELP workflow_runs_total Total number of workflow runs started
# TYPE workflow_runs_total counter
workflow_runs_total{{repository="{repo_sanitized}",ref="{github_ref}"{current_labels}}} 1
# HELP workflow_started Timestamp when workflow was started
# TYPE workflow_started gauge
workflow_started{{repository="{repo_sanitized}",workflow_run_id="{github_run_id}",ref="{github_ref}"{current_labels}}} {start_time}
"""

    print("=== Metrics to be sent to Prometheus ===")
    print(metrics)
    print("========================================")

    try:
        url = f"{pushgateway_url}/metrics/job/{quote(job_name)}/instance/{quote(repo_sanitized)}"
        req = Request(url, data=metrics.encode('utf-8'), method='POST')
        with urlopen(req, timeout=10) as response:
            return response.status
    except (URLError, Exception) as e:
        print(f"Error: {e}")
        return 0


def generate_combinations(multi_value_labels, formatted_additional_labels):
    if not multi_value_labels.strip():
        yield formatted_additional_labels
        return

    # Parse multi-value labels - handle quoted values properly
    label_data = {}

    # Split by comma first, then reassemble pairs that belong together
    parts = []
    current_part = ""
    in_quotes = False

    for char in multi_value_labels:
        if char == '"':
            in_quotes = not in_quotes
        elif char == ',' and not in_quotes:
            if current_part.strip():
                parts.append(current_part.strip())
            current_part = ""
            continue
        current_part += char

    if current_part.strip():
        parts.append(current_part.strip())

    # Now parse each part as label=value1,value2,value3
    for part in parts:
        if '=' in part:
            name, values_str = part.split('=', 1)
            values_str = values_str.strip('"')
            label_data[name] = values_str.split(',')

    if not label_data:
        yield formatted_additional_labels
        return

    # Generate all combinations
    names = list(label_data.keys())
    value_lists = [label_data[name] for name in names]

    for combination in product(*value_lists):
        labels = ""
        for name, value in zip(names, combination):
            labels += f',{name}="{value}"'
        yield labels + formatted_additional_labels


def main():
    start_time = int(time.time())

    # Set GitHub Actions output
    with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
        f.write(f"start-time={start_time}\n")

    print(f"Start time: {start_time}")

    repo_sanitized = sys.argv[1].replace('/', '_')
    print(f"Repository sanitized: {repo_sanitized}")

    additional_labels = sys.argv[2]
    print(f"Additional labels: {additional_labels}")

    # Format additional labels
    formatted_additional_labels = ""
    if additional_labels:
        for pair in additional_labels.split(','):
            if pair:
                key, value = pair.split('=', 1)
                value = value.strip('"')
                formatted_additional_labels += f',{key}="{value}"'

    multi_value_labels = sys.argv[3]
    pushgateway_url = sys.argv[4]
    job_name = sys.argv[5]
    github_ref = sys.argv[6]
    github_run_id = sys.argv[7]

    for label_combination in generate_combinations(multi_value_labels, formatted_additional_labels):
        http_code = send_metric(
            label_combination, repo_sanitized, pushgateway_url,
            job_name, github_ref, github_run_id, start_time
        )
        print(f"Start metric HTTP response code for labels{label_combination}: {http_code}")


if __name__ == "__main__":
    main()
