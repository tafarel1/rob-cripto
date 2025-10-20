class SentinelError(Exception):
    pass


class NetworkError(SentinelError):
    pass


class RateLimitError(SentinelError):
    pass


class AuthError(SentinelError):
    pass