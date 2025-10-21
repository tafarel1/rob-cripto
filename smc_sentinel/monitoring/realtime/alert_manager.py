import logging


class AlertManager:
    """Basic alert manager that logs events; extend for email/telegram later."""

    def __init__(self):
        self.logger = logging.getLogger("smc_sentinel.alerts")

    def info(self, msg: str) -> None:
        self.logger.info(msg)

    def warn(self, msg: str) -> None:
        self.logger.warning(msg)

    def error(self, msg: str) -> None:
        self.logger.error(msg)