import unittest

from input_parser import InputParser


class TestParseScriptInput(unittest.TestCase):
    def test_parse_script_input_all_args(self):
        argv = [
            'script.py',
            '--pushgateway-url', 'http://test.com',
            '--grouping-keys', 'env:dev,prod',
            '--labels', 'app:test',
            '--additional-metrics', 'count:10',
            '--start-time', '2023-01-01'
        ]

        result = InputParser.parse_script_input(argv)

        self.assertEqual(result.pushgateway_url, 'http://test.com')
        self.assertEqual(result.grouping_keys, {'env': ['dev', 'prod']})
        self.assertEqual(result.labels, {'app': 'test'})
        self.assertEqual(result.additional_metrics, {'count': 10.0})
        self.assertEqual(result.start_time, '2023-01-01')

    def test_parse_script_input_no_args(self):
        argv = ['script.py']

        result = InputParser.parse_script_input(argv)

        self.assertIsNone(result.pushgateway_url)
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

        result = InputParser.parse_script_input(argv)

        self.assertIsNone(result.pushgateway_url)
        self.assertIsNone(result.grouping_keys)
        self.assertEqual(result.labels, {'app': 'test'})
        self.assertIsNone(result.additional_metrics)
        self.assertEqual(result.start_time, '2023-01-01')

    def test_parse_grouping_keys_missing_colon(self):
        input_str = "env_without_colon"
        with self.assertRaises(ValueError):
            InputParser._parse_grouping_keys(input_str)

    def test_parse_grouping_keys_colon_in_value(self):
        input_str = "jira_label:backend,frontend,service/with/slashes"
        expected = {
            'jira_label': ['backend', 'frontend', 'service_with_slashes'],
        }
        result = InputParser._parse_grouping_keys(input_str)
        self.assertEqual(result, expected)

    def test_parse_grouping_keys_empty_lines_mixed(self):
        input_str = "env:dev,prod\n\n\nregion:us-east"
        expected = {
            'env': ['dev', 'prod'],
            'region': ['us-east']
        }
        result = InputParser._parse_grouping_keys(input_str)
        self.assertEqual(result, expected)

    def test_parse_metrics_missing_colon(self):
        input_str = "metric_without_colon"
        with self.assertRaises(ValueError):
            InputParser._parse_metrics(input_str)

    def test_parse_labels_missing_colon(self):
        input_str = "label_without_colon"
        with self.assertRaises(ValueError):
            InputParser._parse_labels(input_str)


if __name__ == '__main__':
    unittest.main()
