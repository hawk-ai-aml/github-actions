import os
import sys

from common import parse_script_input
from logger import setup_logger
from metrics_collector import MetricsCollector

logger = setup_logger()


def main() -> None:
    inputs = parse_script_input(sys.argv)

    collector = MetricsCollector(
        additional_metrics=inputs.additional_metrics,
        grouping_keys=inputs.grouping_keys,
        labels=inputs.labels
    )

    start_time = collector.add_start_metrics()

    with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
        f.write(f"start-time={start_time}\n")
    logger.info(f"Start time: {start_time}")

    collector.send_to_pushgateway()


if __name__ == "__main__":
    main()
