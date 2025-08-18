import sys

from input_parser import InputParser
from logger import setup_logger
from metrics_collector import MetricsCollector

logger = setup_logger()


def main() -> None:
    inputs = InputParser.parse_script_input(sys.argv)

    collector = MetricsCollector(
        pushgateway_url=inputs.pushgateway_url,
        additional_metrics=inputs.additional_metrics,
        grouping_keys=inputs.grouping_keys,
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
