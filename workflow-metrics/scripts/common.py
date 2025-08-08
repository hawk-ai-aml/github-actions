import itertools
from dataclasses import dataclass
from urllib.parse import quote
from urllib.request import urlopen, Request


@dataclass
class ScriptInputs:
    """Dataclass to hold script inputs."""
    group_labels: dict[str, list[str]] | None
    labels: dict[str, str] | None
    additional_metrics: dict[str, int | float] | None
    start_time: str | None


def _send_metrics_to_pushgateway(url, metrics):
    """Send metrics to Pushgateway and return HTTP status code."""

    print("=== Request Details ===")
    print(f"URL: {url}")
    print("Method: POST")
    print("Content-Type: text/plain")
    print("Timeout: 10 seconds")
    print("========================")

    print("=== Metrics to be sent to Prometheus ===")
    print(metrics)
    print("========================================")

    try:
        req = Request(url, data=metrics.encode('utf-8'), method='POST')
        with urlopen(req, timeout=10) as response:
            return response.status
    except Exception as e:
        print(f"Error: {e}")
        return 0


def send_metrics_to_pushgateway(
        metrics: dict[str, int | float],
        group_labels: dict[str, list[str]],
        labels: dict[str, str]
):
    """Sends metrics to the Pushgateway with specified group labels and additional labels. If multiple values are provided for a group label, they will be sent as separate metrics."""
    label_parts = [f'{quote(key)}="{quote(value)}"' for key, value in labels.items()]
    if label_parts:
        label_string = '{' + ','.join(label_parts) + '}'
    else:
        label_string = ''

    metrics_with_labels = []
    for metric_name, metric_value in metrics.items():
        metric_with_labels = f"{metric_name}{label_string} {metric_value}\n"
        metrics_with_labels.append(metric_with_labels)
    metrics_str = ''.join(metrics_with_labels)

    base_url = "http://prometheus-pushgateway.monitoring:9091/metrics"

    if not group_labels:
        print(f"Sending metrics to: {base_url}")
        http_code = _send_metrics_to_pushgateway(base_url, metrics_str)
        print(f"HTTP response code: {http_code}")
        if http_code != 200:
            print(f"Failed to send metrics to {base_url}. HTTP code: {http_code}")
        return

    # Get all combinations of group label values
    keys = list(group_labels.keys())
    value_lists = [group_labels[key] for key in keys]

    for combination in itertools.product(*value_lists):
        url_parts = [base_url]
        for key, value in zip(keys, combination):
            key_encoded = quote(key)
            value_encoded = quote(value)
            url_parts.extend([key_encoded, value_encoded])

        url = '/'.join(url_parts)
        print(f"Sending metrics to: {url}")
        http_code = _send_metrics_to_pushgateway(url, metrics_str)
        print(f"HTTP response code: {http_code}")
        if http_code != 200:
            print(f"Failed to send metrics to {url}. HTTP code: {http_code}")


def parse_group_labels(group_labels):
    """
    Parse string of group labels into a dictionary. Values may be comma-separated lists.
    Example:
        github_actions_ref: refs/heads/main
        jira_labels: backend,frontend
    """
    parsed_labels = {}
    for line in group_labels.strip().splitlines():
        if line.strip():
            key, value = line.split(':', 1)
            parsed_labels[key.strip().replace('/', '_')] = [v.strip().replace('/', '_') for v in value.split(',')]
    return parsed_labels


def parse_metrics(metrics: str) -> dict[str, int | float]:
    """
    Parse string of metric names into a list.
    Example:
        workflow_started_total: 1
        workflow_duration_seconds: 120.5
    """
    parsed_metrics = {}
    for line in metrics.strip().splitlines():
        if line.strip():
            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip()
            if '.' in value:
                parsed_metrics[key] = float(value)
            else:
                parsed_metrics[key] = int(value)
    return parsed_metrics


def parse_labels(labels):
    """Parse string of labels into a dictionary.
    Example:
        sra_enabled: true
        enforce_mode: false
        tier: HIGH
    """
    parsed_labels = {}
    for line in labels.strip().splitlines():
        if line.strip():
            key, value = line.split(':', 1)
            parsed_labels[key.strip()] = value.strip()
    return parsed_labels


def parse_script_input(argv):
    """Parse script inputs from key=value format arguments."""
    print("=== Script Inputs ===")
    print(f"sys.argv: {argv}")
    print("=====================")

    group_labels_str = ""
    labels_str = ""
    additional_metrics_str = ""
    start_time = None

    for arg in argv[1:]:
        if arg.startswith("group_labels="):
            group_labels_str = arg.split("=", 1)[1]
        elif arg.startswith("labels="):
            labels_str = arg.split("=", 1)[1]
        elif arg.startswith("additional_metrics="):
            additional_metrics_str = arg.split("=", 1)[1]
        elif arg.startswith("start_time="):
            start_time = arg.split("=", 1)[1]

    inputs = ScriptInputs(
        group_labels=parse_group_labels(group_labels_str) if group_labels_str else None,
        labels=parse_labels(labels_str) if labels_str else None,
        additional_metrics=parse_metrics(additional_metrics_str) if additional_metrics_str else None,
        start_time=start_time
    )
    print(f"Parsed inputs: {inputs}")
    return inputs
