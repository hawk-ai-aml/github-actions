import itertools
import time
from dataclasses import dataclass, field
from typing import Dict, Optional, List
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import urlopen, Request

from logger import setup_logger

logger = setup_logger()


@dataclass
class MetricsCollector:
    pushgateway_url: str
    base_metrics: Dict[str, float] = field(default_factory=dict)
    additional_metrics: Optional[Dict[str, float]] = None
    grouping_keys: Optional[Dict[str, List[str]]] = None
    labels: Optional[Dict[str, str]] = None

    def add_metric(self, name: str, value: float) -> None:
        self.base_metrics[name] = value

    def add_start_metrics(self, start_time: Optional[int] = None) -> int:
        timestamp = start_time or int(time.time())
        self.add_metric("workflow_last_start_timestamp", timestamp)
        return timestamp

    def add_completion_metrics(self, start_time: int, end_time: Optional[int] = None) -> None:
        timestamp = end_time or int(time.time())
        duration = timestamp - start_time

        self.add_metric("workflow_last_completion_timestamp", timestamp)
        self.add_metric("workflow_duration_seconds", duration)

    def add_completion_metrics_without_duration(self, end_time: Optional[int] = None) -> None:
        timestamp = end_time or int(time.time())
        self.add_metric("workflow_last_completion_timestamp", timestamp)

    def get_all_metrics(self) -> Dict[str, float]:
        metrics = self.base_metrics.copy()
        if self.additional_metrics:
            metrics.update(self.additional_metrics)
        return metrics

    def send_to_pushgateway(self) -> None:
        metrics = self.get_all_metrics()
        grouping_keys = self.grouping_keys
        labels = self.labels

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

        if not self.grouping_keys:
            http_code = self._send_metrics_to_pushgateway(self.pushgateway_url, metrics_str)  # Use instance attribute
            logger.info(f"HTTP response code: {http_code}")
            if http_code != 200:
                logger.error(f"Failed to send metrics. HTTP code: {http_code}")
            return

        # Get all combinations of group label values
        keys: List[str] = list(grouping_keys.keys())
        value_lists: List[List[str]] = [grouping_keys[key] for key in keys]

        for combination in itertools.product(*value_lists):
            url_parts: List[str] = [self.pushgateway_url]
            for key, value in zip(keys, combination):
                key_encoded = quote(key)
                value_encoded = quote(value)
                url_parts.extend([key_encoded, value_encoded])

            url = '/'.join(url_parts)
            logger.info(f"Sending metrics to: {url}")
            http_code = self._send_metrics_to_pushgateway(url, metrics_str)
            logger.info(f"HTTP response code: {http_code}")
            if http_code != 200:
                logger.error(f"Failed to send metrics to {url}. HTTP code: {http_code}")

    @staticmethod
    def _send_metrics_to_pushgateway(url: str, metrics: str, max_retries: int = 2,
                                     retry_delay: float = 1.0) -> int:
        logger.info("=== Request Details ===")
        logger.info(f"URL: {url}")
        logger.info("Method: POST")
        logger.info("Content-Type: text/plain")
        logger.info("Timeout: 10 seconds")
        logger.info(f"Max retries: {max_retries}")
        logger.info("========================")

        logger.info("=== Metrics to be sent to Prometheus ===")
        logger.info(f"\n{metrics}")
        logger.info("========================================")

        for attempt in range(max_retries + 1):
            try:
                req = Request(url, data=metrics.encode('utf-8'), method='POST')
                with urlopen(req, timeout=10) as response:
                    if attempt > 0:
                        logger.info(f"Request succeeded on attempt {attempt + 1}")
                    return response.status
            except (URLError, TimeoutError) as e:
                if attempt < max_retries:
                    logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    logger.error(f"All {max_retries + 1} attempts failed. Last error: {e}")
            except Exception as e:
                logger.error(f"Non-retryable error on attempt {attempt + 1}: {e}")
                break
        return 0  # still return 0 to not fail the workflow
