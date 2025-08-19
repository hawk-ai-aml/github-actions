import unittest
from unittest.mock import patch, Mock

from metrics_collector import MetricsCollector


class TestMetricsCollector(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.pushgateway_url = "http://pushgateway:9091/metrics/job/test_job"
        self.collector = MetricsCollector(self.pushgateway_url)

    def test_metrics_collector_creation_default(self):
        """Test MetricsCollector creation with default values."""
        collector = MetricsCollector("http://test.com")
        self.assertEqual(collector.pushgateway_url, "http://test.com")
        self.assertEqual(collector.base_metrics, {})
        self.assertIsNone(collector.additional_metrics)
        self.assertIsNone(collector.grouping_keys)
        self.assertIsNone(collector.labels)

    def test_metrics_collector_creation_with_values(self):
        """Test MetricsCollector creation with custom values."""
        base_metrics = {'metric1': 1.0}
        additional_metrics = {'metric2': 2.0}
        grouping_keys = {'env': ['dev', 'prod']}
        labels = {'app': 'test'}

        collector = MetricsCollector(
            pushgateway_url="http://test.com",
            base_metrics=base_metrics,
            additional_metrics=additional_metrics,
            grouping_keys=grouping_keys,
            labels=labels
        )

        self.assertEqual(collector.pushgateway_url, "http://test.com")
        self.assertEqual(collector.base_metrics, base_metrics)
        self.assertEqual(collector.additional_metrics, additional_metrics)
        self.assertEqual(collector.grouping_keys, grouping_keys)
        self.assertEqual(collector.labels, labels)

    def test_add_metric(self):
        """Test adding a metric to base_metrics."""
        self.collector.add_metric("test_metric", 42.5)
        self.assertEqual(self.collector.base_metrics["test_metric"], 42.5)

    def test_add_metric_overwrites_existing(self):
        """Test that adding a metric overwrites existing value."""
        self.collector.add_metric("test_metric", 10)
        self.collector.add_metric("test_metric", 20)
        self.assertEqual(self.collector.base_metrics["test_metric"], 20)

    def test_add_metric_multiple(self):
        """Test adding multiple metrics."""
        self.collector.add_metric("metric1", 1)
        self.collector.add_metric("metric2", 2.5)
        self.collector.add_metric("metric3", 0)

        expected = {
            "metric1": 1,
            "metric2": 2.5,
            "metric3": 0
        }
        self.assertEqual(self.collector.base_metrics, expected)

    @patch('time.time')
    def test_add_start_metrics_default_time(self, mock_time):
        """Test add_start_metrics with default timestamp."""
        mock_time.return_value = 1642723200

        result = self.collector.add_start_metrics()

        self.assertEqual(result, 1642723200)
        self.assertEqual(self.collector.base_metrics["workflow_last_start_timestamp"], 1642723200)

    def test_add_start_metrics_custom_time(self):
        """Test add_start_metrics with custom timestamp."""
        custom_time = 1642723200

        result = self.collector.add_start_metrics(custom_time)

        self.assertEqual(result, custom_time)
        self.assertEqual(self.collector.base_metrics["workflow_last_start_timestamp"], custom_time)

    @patch('time.time')
    def test_add_completion_metrics_default_end_time(self, mock_time):
        """Test add_completion_metrics with default end time."""
        start_time = 1642723200
        mock_time.return_value = 1642723260  # 60 seconds later

        self.collector.add_completion_metrics(start_time)

        self.assertEqual(self.collector.base_metrics["workflow_last_completion_timestamp"], 1642723260)
        self.assertEqual(self.collector.base_metrics["workflow_duration_seconds"], 60)

    def test_add_completion_metrics_custom_end_time(self):
        """Test add_completion_metrics with custom end time."""
        start_time = 1642723200
        end_time = 1642723320  # 120 seconds later

        self.collector.add_completion_metrics(start_time, end_time)

        self.assertEqual(self.collector.base_metrics["workflow_last_completion_timestamp"], end_time)
        self.assertEqual(self.collector.base_metrics["workflow_duration_seconds"], 120)

    def test_add_completion_metrics_zero_duration(self):
        """Test add_completion_metrics with same start and end time."""
        timestamp = 1642723200

        self.collector.add_completion_metrics(timestamp, timestamp)

        self.assertEqual(self.collector.base_metrics["workflow_last_completion_timestamp"], timestamp)
        self.assertEqual(self.collector.base_metrics["workflow_duration_seconds"], 0)

    @patch('time.time')
    def test_add_completion_metrics_without_duration_default_time(self, mock_time):
        """Test add_completion_metrics_without_duration with default timestamp."""
        mock_time.return_value = 1642723200

        self.collector.add_completion_metrics_without_duration()

        self.assertEqual(self.collector.base_metrics["workflow_last_completion_timestamp"], 1642723200)
        self.assertNotIn("workflow_duration_seconds", self.collector.base_metrics)

    def test_add_completion_metrics_without_duration_custom_time(self):
        """Test add_completion_metrics_without_duration with custom timestamp."""
        end_time = 1642723200

        self.collector.add_completion_metrics_without_duration(end_time)

        self.assertEqual(self.collector.base_metrics["workflow_last_completion_timestamp"], end_time)
        self.assertNotIn("workflow_duration_seconds", self.collector.base_metrics)

    def test_get_all_metrics_base_only(self):
        """Test get_all_metrics with only base metrics."""
        self.collector.add_metric("metric1", 1.0)
        self.collector.add_metric("metric2", 2.0)

        result = self.collector.get_all_metrics()

        expected = {"metric1": 1.0, "metric2": 2.0}
        self.assertEqual(result, expected)

    def test_get_all_metrics_with_additional(self):
        """Test get_all_metrics with both base and additional metrics."""
        self.collector.add_metric("base_metric", 1.0)
        self.collector.additional_metrics = {"additional_metric": 2.0}

        result = self.collector.get_all_metrics()

        expected = {"base_metric": 1.0, "additional_metric": 2.0}
        self.assertEqual(result, expected)

    def test_get_all_metrics_additional_overwrites_base(self):
        """Test that additional metrics overwrite base metrics with same key."""
        self.collector.add_metric("metric", 1.0)
        self.collector.additional_metrics = {"metric": 2.0}

        result = self.collector.get_all_metrics()

        expected = {"metric": 2.0}
        self.assertEqual(result, expected)

    def test_get_all_metrics_no_additional(self):
        """Test get_all_metrics when additional_metrics is None."""
        self.collector.add_metric("metric", 1.0)
        self.collector.additional_metrics = None

        result = self.collector.get_all_metrics()

        expected = {"metric": 1.0}
        self.assertEqual(result, expected)

    def test_get_all_metrics_empty_additional(self):
        """Test get_all_metrics when additional_metrics is empty dict."""
        self.collector.add_metric("metric", 1.0)
        self.collector.additional_metrics = {}

        result = self.collector.get_all_metrics()

        expected = {"metric": 1.0}
        self.assertEqual(result, expected)

    def test_get_all_metrics_does_not_modify_base(self):
        """Test that get_all_metrics doesn't modify the original base_metrics."""
        self.collector.add_metric("metric", 1.0)
        self.collector.additional_metrics = {"additional": 2.0}

        result = self.collector.get_all_metrics()
        result["new_metric"] = 3.0

        # Original base_metrics should be unchanged
        self.assertNotIn("new_metric", self.collector.base_metrics)
        self.assertNotIn("additional", self.collector.base_metrics)

    @patch('metrics_collector.MetricsCollector._send_metrics_to_pushgateway')
    def test_send_to_pushgateway_no_grouping_keys(self, mock_send):
        """Test send_to_pushgateway without grouping keys."""
        mock_send.return_value = 200
        self.collector.add_metric("test_metric", 1.0)

        self.collector.send_to_pushgateway()

        expected_metrics = "test_metric 1.0\n"
        mock_send.assert_called_once_with(self.pushgateway_url, expected_metrics)

    @patch('metrics_collector.MetricsCollector._send_metrics_to_pushgateway')
    def test_send_to_pushgateway_with_labels(self, mock_send):
        """Test send_to_pushgateway with labels."""
        mock_send.return_value = 200
        self.collector.add_metric("test_metric", 1.0)
        self.collector.labels = {"app": "test", "version": "1.0"}

        self.collector.send_to_pushgateway()

        expected_metrics = 'test_metric{app="test",version="1.0"} 1.0\n'
        mock_send.assert_called_once_with(self.pushgateway_url, expected_metrics)

    @patch('metrics_collector.MetricsCollector._send_metrics_to_pushgateway')
    def test_send_to_pushgateway_with_grouping_keys(self, mock_send):
        """Test send_to_pushgateway with grouping keys."""
        mock_send.return_value = 200
        self.collector.add_metric("test_metric", 1.0)
        self.collector.grouping_keys = {"env": ["dev", "prod"]}

        self.collector.send_to_pushgateway()

        # Should be called twice, once for each env value
        self.assertEqual(mock_send.call_count, 2)

        # Check the URLs called
        calls = mock_send.call_args_list
        expected_urls = [
            f"{self.pushgateway_url}/env/dev",
            f"{self.pushgateway_url}/env/prod"
        ]
        actual_urls = [call[0][0] for call in calls]
        self.assertEqual(set(actual_urls), set(expected_urls))

    @patch('metrics_collector.MetricsCollector._send_metrics_to_pushgateway')
    def test_send_to_pushgateway_with_multiple_grouping_keys(self, mock_send):
        """Test send_to_pushgateway with multiple grouping keys."""
        mock_send.return_value = 200
        self.collector.add_metric("test_metric", 1.0)
        self.collector.grouping_keys = {"env": ["dev", "prod"], "region": ["us", "eu"]}

        self.collector.send_to_pushgateway()

        # Should be called 4 times (2 * 2 combinations)
        self.assertEqual(mock_send.call_count, 4)

    @patch('metrics_collector.urlopen')
    def test_send_metrics_to_pushgateway_success(self, mock_urlopen):
        """Test _send_metrics_to_pushgateway successful request."""
        mock_response = Mock()
        mock_response.status = 200
        mock_urlopen.return_value.__enter__.return_value = mock_response

        result = MetricsCollector._send_metrics_to_pushgateway(
            "http://test.com", "test_metric 1.0\n"
        )

        self.assertEqual(result, 200)
        mock_urlopen.assert_called_once()

    @patch('metrics_collector.urlopen')
    @patch('time.sleep')
    def test_send_metrics_to_pushgateway_retry_on_failure(self, mock_sleep, mock_urlopen):
        """Test _send_metrics_to_pushgateway retries on failure."""
        from urllib.error import URLError

        mock_urlopen.side_effect = [URLError("Connection failed"), URLError("Still failing")]

        result = MetricsCollector._send_metrics_to_pushgateway(
            "http://test.com", "test_metric 1.0\n", max_retries=1
        )

        self.assertEqual(result, 0)
        self.assertEqual(mock_urlopen.call_count, 2)
        mock_sleep.assert_called_once()

    def test_workflow_integration_scenario(self):
        """Test a complete workflow scenario."""
        # Setup collector with labels
        collector = MetricsCollector(
            pushgateway_url=self.pushgateway_url,
            grouping_keys={"env": ["prod"]},
            labels={"workflow": "test", "version": "1.0"},
            additional_metrics={"custom_metric": 42}
        )

        # Add start metrics
        start_time = collector.add_start_metrics(1642723200)

        # Add some custom metrics
        collector.add_metric("jobs_count", 5)
        collector.add_metric("files_processed", 100)

        # Add completion metrics
        collector.add_completion_metrics(start_time, 1642723320)

        # Get all metrics
        all_metrics = collector.get_all_metrics()

        expected = {
            "workflow_last_start_timestamp": 1642723200,
            "workflow_last_completion_timestamp": 1642723320,
            "workflow_duration_seconds": 120,
            "jobs_count": 5,
            "files_processed": 100,
            "custom_metric": 42
        }

        self.assertEqual(all_metrics, expected)


if __name__ == '__main__':
    unittest.main()
