import logging
import sys
from typing import Optional


def setup_logger(name: str = "workflow-metrics", level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger

    log_level = getattr(logging, level.upper(), logging.INFO)
    logger.setLevel(log_level)

    formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)

    logger.addHandler(console_handler)
    return logger


def get_logger(name: Optional[str] = None) -> logging.Logger:
    logger_name = name or "workflow-metrics"
    return logging.getLogger(logger_name)
