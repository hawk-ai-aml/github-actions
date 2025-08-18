import os
import sys
import unittest
from unittest.mock import patch, Mock
from urllib.error import URLError

# Add the scripts directory to the path to import the module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from common import (
    ScriptInputs,
    _send_metrics_to_pushgateway,
    send_metrics_to_pushgateway,
    parse_grouping_keys,
    parse_metrics,
    parse_labels,
    parse_script_input
)


class TestScriptInputs(unittest.TestCase):
    def test_script_inputs_creation(self):
        inputs = ScriptInputs(
            grouping_keys={'env': ['dev', 'prod']},
            labels={'app': 'test'},
            additional_metrics={'count': 10},
            start_time='2023-01-01'
        )
        self.assertEqual(inputs.grouping_keys, {'env': ['dev', 'prod']})
        self.assertEqual(inputs.labels, {'app': 'test'})
        self.assertEqual(inputs.additional_metrics, {'count': 10})
        self.assertEqual(inputs.start_time, '2023-01-01')

    def test_script_inputs_with_none_values(self):
        inputs = ScriptInputs(None, None, None, None)
        self.assertIsNone(inputs.grouping_keys)
        self.assertIsNone(inputs.labels)
        self.assertIsNone(inputs.additional_metrics)
        self.assertIsNone(inputs.start_time)


class TestSendMetricsToPushgateway(unittest.TestCase):
    @patch('common.urlopen')
    def test_send_metrics_success(self, mock_urlopen):
        mock_response = Mock()
        mock_response.status = 200
        mock_urlopen.return_value.__enter__.return_value = mock_response

        result = _send_metrics_to_pushgateway("http://test.com", "test_metric 1")
        self.assertEqual(result, 200)

    @patch('common.urlopen')
    @patch('common.time.sleep')
    def test_send_metrics_retry_success(self, mock_sleep, mock_urlopen):
        from unittest.mock import MagicMock

        mock_response = Mock()
        mock_response.status = 200

        # Create a proper context manager mock using MagicMock
        mock_context_manager = MagicMock()
        mock_context_manager.__enter__.return_value = mock_response
        mock_context_manager.__exit__.return_value = None

        # First call raises exception, second call returns the context manager
        mock_urlopen.side_effect = [URLError("Connection failed"), mock_context_manager]

        result = _send_metrics_to_pushgateway("http://test.com", "test_metric 1", max_retries=2)
        self.assertEqual(result, 200)
        mock_sleep.assert_called_once_with(1.0)

    @patch('common.urlopen')
    @patch('common.time.sleep')
    def test_send_metrics_all_retries_fail(self, mock_sleep, mock_urlopen):
        mock_urlopen.side_effect = URLError("Connection failed")

        result = _send_metrics_to_pushgateway("http://test.com", "test_metric 1", max_retries=1)
        self.assertEqual(result, 0)
        self.assertEqual(mock_sleep.call_count, 1)

    @patch('common.urlopen')
    def test_send_metrics_non_retryable_error(self, mock_urlopen):
        mock_urlopen.side_effect = ValueError("Invalid URL")

        result = _send_metrics_to_pushgateway("http://test.com", "test_metric 1")
        self.assertEqual(result, 0)


class TestSendMetricsToPushgatewayWrapper(unittest.TestCase):
    @patch('common._send_metrics_to_pushgateway')
    def test_send_metrics_no_grouping_keys(self, mock_send):
        mock_send.return_value = 200

        metrics = {'test_metric': 1.0}
        labels = {'app': 'test'}

        send_metrics_to_pushgateway(metrics, None, labels)

        mock_send.assert_called_once()
        args = mock_send.call_args
        self.assertIn('test_metric{app="test"} 1.0', args[0][1])

    @patch('common._send_metrics_to_pushgateway')
    def test_send_metrics_with_grouping_keys(self, mock_send):
        mock_send.return_value = 200

        metrics = {'test_metric': 1.0}
        grouping_keys = {'env': ['dev', 'prod'], 'region': ['us']}
        labels = {'app': 'test'}

        send_metrics_to_pushgateway(metrics, grouping_keys, labels)

        # Should be called twice for each combination
        self.assertEqual(mock_send.call_count, 2)

    @patch('common._send_metrics_to_pushgateway')
    def test_send_metrics_no_labels(self, mock_send):
        mock_send.return_value = 200

        metrics = {'test_metric': 1.0}

        send_metrics_to_pushgateway(metrics, None, None)

        mock_send.assert_called_once()
        args = mock_send.call_args
        self.assertIn('test_metric 1.0', args[0][1])


class TestParseGroupLabels(unittest.TestCase):
    def test_parse_grouping_keys_valid(self):
        input_str = "env:dev,prod\nregion:us-east,us-west"
        expected = {
            'env': ['dev', 'prod'],
            'region': ['us-east', 'us-west']
        }
        result = parse_grouping_keys(input_str)
        self.assertEqual(result, expected)

    def test_parse_grouping_keys_with_slashes(self):
        input_str = "env/type:dev/test,prod/live"
        expected = {
            'env_type': ['dev_test', 'prod_live']
        }
        result = parse_grouping_keys(input_str)
        self.assertEqual(result, expected)

    def test_parse_grouping_keys_empty(self):
        result = parse_grouping_keys("")
        self.assertEqual(result, {})

    def test_parse_grouping_keys_whitespace(self):
        input_str = "  env : dev , prod  \n  region : us-east , us-west  "
        expected = {
            'env': ['dev', 'prod'],
            'region': ['us-east', 'us-west']
        }
        result = parse_grouping_keys(input_str)
        self.assertEqual(result, expected)


class TestParseMetrics(unittest.TestCase):
    def test_parse_metrics_valid(self):
        input_str = "metric1:1.5\nmetric2:2\nmetric3:0.5"
        expected = {
            'metric1': 1.5,
            'metric2': 2.0,
            'metric3': 0.5
        }
        result = parse_metrics(input_str)
        self.assertEqual(result, expected)

    def test_parse_metrics_invalid_value(self):
        input_str = "metric1:invalid"
        with self.assertRaises(ValueError):
            parse_metrics(input_str)

    def test_parse_metrics_empty(self):
        result = parse_metrics("")
        self.assertEqual(result, {})

    def test_parse_metrics_whitespace(self):
        input_str = "  metric1 : 1.5  \n  metric2 : 2  "
        expected = {
            'metric1': 1.5,
            'metric2': 2.0
        }
        result = parse_metrics(input_str)
        self.assertEqual(result, expected)


class TestParseLabels(unittest.TestCase):
    def test_parse_labels_valid(self):
        input_str = "app:myapp\nversion:1.0"
        expected = {
            'app': 'myapp',
            'version': '1.0'
        }
        result = parse_labels(input_str)
        self.assertEqual(result, expected)

    def test_parse_labels_empty(self):
        result = parse_labels("")
        self.assertEqual(result, {})

    def test_parse_labels_whitespace(self):
        input_str = "  app : myapp  \n  version : 1.0  "
        expected = {
            'app': 'myapp',
            'version': '1.0'
        }
        result = parse_labels(input_str)
        self.assertEqual(result, expected)


class TestParseScriptInput(unittest.TestCase):
    def test_parse_script_input_all_args(self):
        argv = [
            'script.py',
            '--grouping-keys', 'env:dev,prod',
            '--labels', 'app:test',
            '--additional-metrics', 'count:10',
            '--start-time', '2023-01-01'
        ]

        result = parse_script_input(argv)

        self.assertEqual(result.grouping_keys, {'env': ['dev', 'prod']})
        self.assertEqual(result.labels, {'app': 'test'})
        self.assertEqual(result.additional_metrics, {'count': 10.0})
        self.assertEqual(result.start_time, '2023-01-01')

    def test_parse_script_input_no_args(self):
        argv = ['script.py']

        result = parse_script_input(argv)

        self.assertIsNone(result.grouping_keys)
        self.assertIsNone(result.labels)
        self.assertIsNone(result.additional_metrics)
        self.assertIsNone(result.start_time)

    def test_parse_script_input_partial_args(self):
        argv = [
            'script.py',
            '--labels', 'app:test',
            '--start-time', '2023-01-01'
        ]

        result = parse_script_input(argv)

        self.assertIsNone(result.grouping_keys)
        self.assertEqual(result.labels, {'app': 'test'})
        self.assertIsNone(result.additional_metrics)
        self.assertEqual(result.start_time, '2023-01-01')


if __name__ == '__main__':
    unittest.main()
