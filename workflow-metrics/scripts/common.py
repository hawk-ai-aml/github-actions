import argparse
import itertools
from dataclasses import dataclass
from typing import Dict, List
from typing import Union, Optional
from urllib.parse import quote
from urllib.request import urlopen, Request

from logger import setup_logger

logger = setup_logger()


@dataclass
class ScriptInputs:
    group_labels: Optional[Dict[str, List[str]]]
    labels: Optional[Dict[str, str]]
    additional_metrics: Optional[Dict[str, Union[int, float]]]
    start_time: Optional[str]


def _send_metrics_to_pushgateway(url: str, metrics: str) -> int:
    logger.info("=== Request Details ===")
    logger.info(f"URL: {url}")
    logger.info("Method: POST")
    logger.info("Content-Type: text/plain")
    logger.info("Timeout: 10 seconds")
    logger.info("========================")

    logger.info("=== Metrics to be sent to Prometheus ===")
    logger.info(f"\n{metrics}")
    logger.info("========================================")

    try:
        req = Request(url, data=metrics.encode('utf-8'), method='POST')
        with urlopen(req, timeout=10) as response:
            return response.status
    except Exception as e:
        logger.error(f"Failed to send metrics: {e}")
        return 0  # still return 0 to not fail the workflow


def send_metrics_to_pushgateway(
        metrics: Dict[str, Union[int, float]],
        group_labels: Optional[Dict[str, List[str]]],
        labels: Optional[Dict[str, str]]
) -> None:
    label_parts: List[str] = []
    if labels:
        label_parts = [f'{quote(key)}="{quote(value)}"' for key, value in labels.items()]

    if label_parts:
        label_string = '{' + ','.join(label_parts) + '}'
    else:
        label_string = ''

    metrics_with_labels: List[str] = []
    for metric_name, metric_value in metrics.items():
        metric_with_labels = f"{metric_name}{label_string} {metric_value}\n"
        metrics_with_labels.append(metric_with_labels)
    metrics_str = ''.join(metrics_with_labels)

    base_url = "http://prometheus-pushgateway.monitoring:9091/metrics"

    if not group_labels:
        logger.info(f"Sending metrics to: {base_url}")
        http_code = _send_metrics_to_pushgateway(base_url, metrics_str)
        logger.info(f"HTTP response code: {http_code}")
        if http_code != 200:
            logger.error(f"Failed to send metrics to {base_url}. HTTP code: {http_code}")
        return

    # Get all combinations of group label values
    keys: List[str] = list(group_labels.keys())
    value_lists: List[List[str]] = [group_labels[key] for key in keys]

    for combination in itertools.product(*value_lists):
        url_parts: List[str] = [base_url]
        for key, value in zip(keys, combination):
            key_encoded = quote(key)
            value_encoded = quote(value)
            url_parts.extend([key_encoded, value_encoded])

        url = '/'.join(url_parts)
        logger.info(f"Sending metrics to: {url}")
        http_code = _send_metrics_to_pushgateway(url, metrics_str)
        logger.info(f"HTTP response code: {http_code}")
        if http_code != 200:
            logger.error(f"Failed to send metrics to {url}. HTTP code: {http_code}")


def parse_group_labels(group_labels: str) -> Dict[str, List[str]]:
    parsed_labels: Dict[str, List[str]] = {}
    for line in group_labels.strip().splitlines():
        if line.strip():
            key, value = line.split(':', 1)
            parsed_labels[key.strip().replace('/', '_')] = [v.strip().replace('/', '_') for v in value.split(',')]
    logger.debug(f"Parsed group labels: {parsed_labels}")
    return parsed_labels


def parse_metrics(metrics: str) -> Dict[str, float]:
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


def parse_labels(labels: str) -> Dict[str, str]:
    parsed_labels: Dict[str, str] = {}
    for line in labels.strip().splitlines():
        if line.strip():
            key, value = line.split(':', 1)
            parsed_labels[key.strip()] = value.strip()
    logger.debug(f"Parsed labels: {parsed_labels}")
    return parsed_labels


def parse_script_input(argv: List[str]) -> ScriptInputs:
    parser = argparse.ArgumentParser(description='Send workflow metrics to Prometheus Pushgateway')

    parser.add_argument(
        '--group-labels',
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
        group_labels=parse_group_labels(args.group_labels) if args.group_labels else None,
        labels=parse_labels(args.labels) if args.labels else None,
        additional_metrics=parse_metrics(args.additional_metrics) if args.additional_metrics else None,
        start_time=args.start_time
    )

    logger.info(f"Parsed inputs: {inputs}")
    return inputs
