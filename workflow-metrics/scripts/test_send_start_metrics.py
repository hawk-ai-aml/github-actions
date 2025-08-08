import os
import unittest
from io import StringIO
from unittest.mock import patch, mock_open, MagicMock
from urllib.error import URLError

from send_start_metrics import send_metric, generate_combinations, main


class TestSendStartMetrics(unittest.TestCase):

    def test_generate_combinations_empty_multi_value_labels(self):
        """Test generate_combinations with empty multi-value labels"""
        formatted_additional_labels = ',tag="1.6.6",environment="fake-environment"'
        combinations = list(generate_combinations("", formatted_additional_labels))

        self.assertEqual(len(combinations), 1)
        self.assertEqual(combinations[0], ',tag="1.6.6",environment="fake-environment"')

    def test_generate_combinations_single_multi_value_label(self):
        """Test generate_combinations with single multi-value label"""
        multi_value_labels = 'jira_labels="test-service-1,test-service-2"'
        formatted_additional_labels = ',tag="1.6.6"'
        combinations = list(generate_combinations(multi_value_labels, formatted_additional_labels))

        self.assertEqual(len(combinations), 2)
        self.assertIn(',jira_labels="test-service-1",tag="1.6.6"', combinations)
        self.assertIn(',jira_labels="test-service-2",tag="1.6.6"', combinations)

    def test_generate_combinations_multiple_multi_value_labels(self):
        """Test generate_combinations with multiple multi-value labels"""
        multi_value_labels = 'jira_labels="test-service-1,test-service-2",fake_label="value1,value2,value3"'
        formatted_additional_labels = ',tag="1.6.6"'
        combinations = list(generate_combinations(multi_value_labels, formatted_additional_labels))

        self.assertEqual(len(combinations), 6)
        self.assertIn(',jira_labels="test-service-1",fake_label="value1",tag="1.6.6"', combinations)
        self.assertIn(',jira_labels="test-service-2",fake_label="value3",tag="1.6.6"', combinations)

    @patch('send_start_metrics.urlopen')
    def test_send_metric_success(self, mock_urlopen):
        """Test send_metric with successful HTTP response"""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_urlopen.return_value.__enter__.return_value = mock_response

        result = send_metric(
            ',tag="1.6.6"',
            'test_repo',
            'http://localhost:9091',
            'test_job',
            'refs/heads/main',
            '12345',
            1234567890
        )

        self.assertEqual(result, 200)

    @patch('send_start_metrics.urlopen')
    def test_send_metric_failure(self, mock_urlopen):
        """Test send_metric with URLError"""
        mock_urlopen.side_effect = URLError("Connection failed")

        with patch('sys.stdout', new_callable=StringIO):
            result = send_metric(
                ',tag="1.6.6"',
                'test_repo',
                'http://localhost:9091',
                'test_job',
                'refs/heads/main',
                '12345',
                1234567890
            )

        self.assertEqual(result, 0)

    @patch.dict(os.environ, {'GITHUB_OUTPUT': '/tmp/test_output'})
    @patch('builtins.open', new_callable=mock_open)
    @patch('send_start_metrics.send_metric')
    @patch('sys.argv', [
        'send_start_metrics.py',
        'test/repo',
        'tag="1.6.6",environment="fake-environment",dry_run="true"',
        'jira_labels="test-service-1,test-service-2",fake_label="value1,value2,value3"',
        'http://prometheus-pushgateway.monitoring:9091',
        'test_manual_argo_sync_release',
        'refs/heads/main',
        '12345'
    ])
    def test_main_with_example_input(self, mock_send_metric, mock_file):
        """Test main function with the example input provided"""
        mock_send_metric.return_value = 200

        with patch('sys.stdout', new_callable=StringIO) as mock_stdout:
            main()

        mock_file.assert_called_with('/tmp/test_output', 'a')
        self.assertEqual(mock_send_metric.call_count, 6)

        output = mock_stdout.getvalue()
        self.assertIn('Repository sanitized: test_repo', output)
        self.assertIn('Start metric HTTP response code', output)


if __name__ == '__main__':
    unittest.main()
