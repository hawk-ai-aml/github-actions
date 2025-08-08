import os
import sys
import time

from common import send_metrics_to_pushgateway, parse_script_input


def main():
    inputs = parse_script_input(sys.argv)

    start_time = int(time.time())
    with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
        f.write(f"start-time={start_time}\n")
    print(f"Start time: {start_time}")

    metrics = {
        "workflow_last_start_timestamp": start_time
    }
    if inputs.additional_metrics:
        metrics.update(inputs.additional_metrics)

    send_metrics_to_pushgateway(
        metrics,
        inputs.group_labels,
        inputs.labels
    )


if __name__ == "__main__":
    main()
