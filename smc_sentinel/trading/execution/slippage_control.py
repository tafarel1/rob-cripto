def apply_slippage_limit(requested_price: float, max_slippage_pct: float, reference_price: float) -> float:
    """Clamp requested price within max slippage percentage around reference price."""
    if reference_price <= 0:
        return requested_price
    max_dev = reference_price * max_slippage_pct
    lower = reference_price - max_dev
    upper = reference_price + max_dev
    return max(min(requested_price, upper), lower)