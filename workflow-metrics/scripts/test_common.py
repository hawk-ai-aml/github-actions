import unittest
from unittest.mock import patch, MagicMock
from urllib.error import URLError

from common import (
    ScriptInputs,
    _send_metrics_to_pushgateway,
    send_metrics_to_pushgateway,
    parse_group_labels,
    parse_metrics,
    parse_labels,
    parse_script_input
)


class TestCommonModule(unittest.TestCase):

    def test_script_inputs_dataclass(self):
        """Test ScriptInputs dataclass creation."""
        inputs = ScriptInputs(
            group_labels={'env': ['prod', 'dev']},
            labels={'service': 'api'},
            additional_metrics={'duration': 123.45},
            start_time='2023-01-01T00:00:00Z'
        )

        self.assertEqual(inputs.group_labels, {'env': ['prod', 'dev']})
        self.assertEqual(inputs.labels, {'service': 'api'})
        self.assertEqual(inputs.additional_metrics, {'duration': 123.45})
        self.assertEqual(inputs.start_time, '2023-01-01T00:00:00Z')

    @patch('scripts.common.urlopen')
    @patch('scripts.common.logger')
    def test_send_metrics_to_pushgateway_success(self, mock_logger, mock_urlopen):
        """Test successful metrics sending."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_urlopen.return_value.__enter__.return_value = mock_response

        result = _send_metrics_to_pushgateway('http://test.com', 'metric 1')

        self.assertEqual(result, 200)
        mock_urlopen.assert_called_once()

    @patch('scripts.common.urlopen')
    @patch('scripts.common.logger')
    def test_send_metrics_to_pushgateway_failure(self, mock_logger, mock_urlopen):
        """Test metrics sending with exception."""
        mock_urlopen.side_effect = URLError('Connection failed')

        result = _send_metrics_to_pushgateway('http://test.com', 'metric 1')

        self.assertEqual(result, 0)
        mock_logger.error.assert_called_once()

    @patch('scripts.common._send_metrics_to_pushgateway')
    @patch('scripts.common.logger')
    def test_send_metrics_to_pushgateway_without_group_labels(self, mock_logger, mock_send):
        """Test sending metrics without group labels."""
        mock_send.return_value = 200

        metrics = {'test_metric': 42}
        labels = {'service': 'test'}

        send_metrics_to_pushgateway(metrics, None, labels)

        mock_send.assert_called_once()
        args = mock_send.call_args[0]
        self.assertIn('test_metric{service="test"} 42', args[1])

    @patch('scripts.common._send_metrics_to_pushgateway')
    @patch('scripts.common.logger')
    def test_send_metrics_to_pushgateway_with_group_labels(self, mock_logger, mock_send):
        """Test sending metrics with group labels."""
        mock_send.return_value = 200

        metrics = {'test_metric': 42}
        group_labels = {'env': ['prod', 'dev'], 'region': ['us']}
        labels = {'service': 'test'}

        send_metrics_to_pushgateway(metrics, group_labels, labels)

        # Should be called twice for combinations: (prod, us) and (dev, us)
        self.assertEqual(mock_send.call_count, 2)

    def test_parse_group_labels_valid_input(self):
        """Test parsing valid group labels."""
        input_str = "env:prod,dev\nregion:us-east,us-west"
        expected = {
            'env': ['prod', 'dev'],
            'region': ['us-east', 'us-west']
        }

        result = parse_group_labels(input_str)

        self.assertEqual(result, expected)

    def test_parse_group_labels_with_slashes(self):
        """Test parsing group labels with forward slashes."""
        input_str = "env/type:prod/main,dev/feature"
        expected = {
            'env_type': ['prod_main', 'dev_feature']
        }

        result = parse_group_labels(input_str)

        self.assertEqual(result, expected)

    def test_parse_metrics_valid_input(self):
        """Test parsing valid metrics."""
        input_str = "duration:123.45\ncount:10"
        expected = {'duration': 123.45, 'count': 10.0}

        result = parse_metrics(input_str)

        self.assertEqual(result, expected)

    def test_parse_metrics_invalid_value(self):
        """Test parsing metrics with invalid numeric value."""
        input_str = "duration:invalid"

        with self.assertRaises(ValueError):
            parse_metrics(input_str)

    def test_parse_labels_valid_input(self):
        """Test parsing valid labels."""
        input_str = "service:api\nversion:1.0.0"
        expected = {'service': 'api', 'version': '1.0.0'}

        result = parse_labels(input_str)

        self.assertEqual(result, expected)

    def test_parse_script_input_all_arguments(self):
        """Test parsing script input with all arguments."""
        argv = [
            'script.py',
            '--group-labels', 'env:prod,dev',
            '--labels', 'service:api',
            '--additional-metrics', 'duration:123.45',
            '--start-time', '2023-01-01T00:00:00Z'
        ]

        result = parse_script_input(argv)

        self.assertEqual(result.group_labels, {'env': ['prod', 'dev']})
        self.assertEqual(result.labels, {'service': 'api'})
        self.assertEqual(result.additional_metrics, {'duration': 123.45})
        self.assertEqual(result.start_time, '2023-01-01T00:00:00Z')

    def test_parse_script_input_minimal_arguments(self):
        """Test parsing script input with minimal arguments."""
        argv = ['script.py']

        result = parse_script_input(argv)

        self.assertIsNone(result.group_labels)
        self.assertIsNone(result.labels)
        self.assertIsNone(result.additional_metrics)
        self.assertIsNone(result.start_time)

    def test_parse_empty_strings(self):
        """Test parsing functions with empty strings."""
        self.assertEqual(parse_group_labels(""), {})
        self.assertEqual(parse_metrics(""), {})
        self.assertEqual(parse_labels(""), {})

    def test_parse_whitespace_only_strings(self):
        """Test parsing functions with whitespace-only strings."""
        self.assertEqual(parse_group_labels("   \n  \n  "), {})
        self.assertEqual(parse_metrics("   \n  \n  "), {})
        self.assertEqual(parse_labels("   \n  \n  "), {})


if __name__ == '__main__':
    unittest.main()
