import sys
import time

from common import send_metrics_to_pushgateway, parse_script_input


def main():
    inputs = parse_script_input(sys.argv)
    if inputs.start_time is None:
        print("Workflow start time is required but not provided. Exiting.")
        sys.exit(1)

    end_time = int(time.time())
    print(f"End time: {end_time}")

    duration = end_time - int(inputs.start_time)
    print(f"Duration: {duration} seconds")
    metrics = {
        "workflow_last_completion_timestamp": end_time,
        "workflow_duration_seconds": duration
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
