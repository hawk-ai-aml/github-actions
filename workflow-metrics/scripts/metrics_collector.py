import time
from dataclasses import dataclass, field
from typing import Dict, Union, Optional, List


@dataclass
class MetricsCollector:
    base_metrics: Dict[str, Union[int, float]] = field(default_factory=dict)
    additional_metrics: Optional[Dict[str, Union[int, float]]] = None
    group_labels: Optional[Dict[str, List[str]]] = None
    labels: Optional[Dict[str, str]] = None

    def add_metric(self, name: str, value: Union[int, float]) -> None:
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

    def get_all_metrics(self) -> Dict[str, Union[int, float]]:
        metrics = self.base_metrics.copy()
        if self.additional_metrics:
            metrics.update(self.additional_metrics)
        return metrics

    def send_to_pushgateway(self) -> None:
        from common import send_metrics_to_pushgateway
        send_metrics_to_pushgateway(
            self.get_all_metrics(),
            self.group_labels,
            self.labels
        )
