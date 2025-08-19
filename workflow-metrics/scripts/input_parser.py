import argparse
from dataclasses import dataclass
from typing import Dict, List
from typing import Optional

from logger import setup_logger

logger = setup_logger()


@dataclass
class ScriptInputs:
    pushgateway_url: Optional[str]
    grouping_keys: Optional[Dict[str, List[str]]]
    labels: Optional[Dict[str, str]]
    additional_metrics: Optional[Dict[str, float]]
    start_time: Optional[str]


class InputParser:

    @staticmethod
    def _parse_grouping_keys(grouping_keys: str) -> Dict[str, List[str]]:
        parsed_labels: Dict[str, List[str]] = {}
        for line in grouping_keys.strip().splitlines():
            if line.strip():
                key, value = line.split(':', 1)
                parsed_labels[InputParser._sanitize_label(key)] = [InputParser._sanitize_label(v) for v in value.split(',')]
        logger.debug(f"Parsed group labels: {parsed_labels}")
        return parsed_labels

    @staticmethod
    def _sanitize_label(label: str) -> str:
        """This needs to be done for label keys and values so that prometheus does not get confused"""
        return label.strip().replace('/', '_')

    @staticmethod
    def _parse_metrics(metrics: str) -> Dict[str, float]:
        parsed_metrics: Dict[str, float] = {}
        for line in metrics.strip().splitlines():
            if line.strip():
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip()
                try:
                    parsed_metrics[key] = float(value)
                except ValueError:
                    logger.error(f"Invalid numeric value for metric '{key}': {value}")
                    raise
        logger.debug(f"Parsed metrics: {parsed_metrics}")
        return parsed_metrics

    @staticmethod
    def _parse_labels(labels: str) -> Dict[str, str]:
        parsed_labels: Dict[str, str] = {}
        for line in labels.strip().splitlines():
            if line.strip():
                key, value = line.split(':', 1)
                parsed_labels[key.strip()] = value.strip()
        logger.debug(f"Parsed labels: {parsed_labels}")
        return parsed_labels

    @staticmethod
    def parse_script_input(argv: List[str]) -> ScriptInputs:
        parser = argparse.ArgumentParser(description='Send workflow metrics to Prometheus Pushgateway')

        parser.add_argument(
            '--pushgateway-url',
            type=str,
            help='Prometheus Pushgateway URL, e.g. http://prometheus-pushgateway.monitoring:9091/metrics'
        )
        parser.add_argument(
            '--grouping-keys',
            type=str,
            help='Group labels in format "key1:val1,val2\\nkey2:val3,val4"'
        )
        parser.add_argument(
            '--labels',
            type=str,
            help='Labels in format "key1:value1\\nkey2:value2"'
        )
        parser.add_argument(
            '--additional-metrics',
            type=str,
            help='Additional metrics in format "metric1:value1\\nmetric2:value2"'
        )
        parser.add_argument(
            '--start-time',
            type=str,
            help='Start time for workflow metrics'
        )

        args = parser.parse_args(argv[1:])

        logger.info("=== Script Inputs ===")
        logger.info(f"Arguments: {vars(args)}")
        logger.info("=====================")

        inputs = ScriptInputs(
            pushgateway_url=args.pushgateway_url,
            grouping_keys=InputParser._parse_grouping_keys(args.grouping_keys) if args.grouping_keys else None,
            labels=InputParser._parse_labels(args.labels) if args.labels else None,
            additional_metrics=InputParser._parse_metrics(args.additional_metrics) if args.additional_metrics else None,
            start_time=args.start_time
        )

        logger.info(f"Parsed inputs: {inputs}")
        return inputs
