import urllib.request


def check_http_ok(url: str, timeout: int = 5) -> bool:
    """Return True if URL responds with HTTP 200."""
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return resp.status == 200
    except Exception:
        return False