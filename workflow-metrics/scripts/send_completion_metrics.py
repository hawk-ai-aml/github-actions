import sys

from common import parse_script_input
from logger import setup_logger
from metrics_collector import MetricsCollector

logger = setup_logger()


def main() -> None:
    inputs = parse_script_input(sys.argv)

    collector = MetricsCollector(
        additional_metrics=inputs.additional_metrics,
        group_labels=inputs.group_labels,
        labels=inputs.labels
    )

    if inputs.start_time is None:
        logger.warning("Workflow start time not provided. Duration metrics will not be calculated.")
        collector.add_completion_metrics_without_duration()
    else:
        start_time_int = int(inputs.start_time)
        collector.add_completion_metrics(start_time_int)
        logger.info(f"Duration: {collector.base_metrics['workflow_duration_seconds']} seconds")

    collector.send_to_pushgateway()


if __name__ == "__main__":
    main()
