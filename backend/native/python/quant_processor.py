import sys
import json
import numpy as np

def calculate_sharpe_ratio(returns, risk_free_rate=0.0):
    returns = np.array(returns)
    mean_return = np.mean(returns)
    std_return = np.std(returns)
    if std_return == 0:
        return 0.0
    sharpe = (mean_return - risk_free_rate) / std_return
    # Annualize (assuming daily returns)
    return sharpe * np.sqrt(365)

def monte_carlo_simulation(initial_price, mu, sigma, days=30, simulations=1000):
    dt = 1/365
    paths = []
    for _ in range(simulations):
        price = initial_price
        path = [price]
        for _ in range(days):
            shock = np.random.normal(0, 1)
            drift = (mu - 0.5 * sigma**2) * dt
            diffusion = sigma * np.sqrt(dt) * shock
            price = price * np.exp(drift + diffusion)
            path.append(price)
        paths.append(path)
    
    # Return 5th, 50th, 95th percentiles of final prices
    final_prices = [p[-1] for p in paths]
    return {
        "p05": np.percentile(final_prices, 5),
        "p50": np.percentile(final_prices, 50),
        "p95": np.percentile(final_prices, 95)
    }

def calculate_calmar_ratio(returns, period_days=365):
    """
    Calmar Ratio = CAGR / Max Drawdown
    """
    returns = np.array(returns)
    if len(returns) == 0: return 0.0
    
    # Calculate Cumulative Return
    cumulative_return = np.prod(1 + returns) - 1
    
    # Calculate CAGR (Compound Annual Growth Rate)
    # Assuming daily returns
    years = len(returns) / period_days
    if years == 0: return 0.0
    cagr = (1 + cumulative_return) ** (1 / years) - 1
    
    # Calculate Max Drawdown
    equity_curve = np.cumprod(1 + returns)
    peak = np.maximum.accumulate(equity_curve)
    drawdown = (peak - equity_curve) / peak
    max_drawdown = np.max(drawdown)
    
    if max_drawdown == 0: return 100.0 # Infinite/High
    
    return cagr / max_drawdown

def calculate_omega_ratio(returns, threshold=0.0):
    """
    Omega Ratio = Probability weighted ratio of gains vs losses above a threshold.
    Simplified: Sum(Returns > Threshold) / Abs(Sum(Returns < Threshold))
    """
    returns = np.array(returns)
    if len(returns) == 0: return 0.0
    
    returns_minus_threshold = returns - threshold
    
    positive_area = np.sum(returns_minus_threshold[returns_minus_threshold > 0])
    negative_area = np.abs(np.sum(returns_minus_threshold[returns_minus_threshold < 0]))
    
    if negative_area == 0: return 100.0 # Infinite
    
    return positive_area / negative_area

def detect_drift(recent_returns, baseline_returns, threshold_sigma=2.0):
    """
    Detects strategy drift by comparing recent performance distribution vs baseline.
    Uses basic Z-Score approach on Mean and Volatility since Scipy is unavailable.
    """
    recent = np.array(recent_returns)
    baseline = np.array(baseline_returns)
    
    if len(recent) < 10 or len(baseline) < 10:
        return {"drift_detected": False, "score": 0.0, "reason": "Insufficient data"}

    base_mean = np.mean(baseline)
    base_std = np.std(baseline)
    
    recent_mean = np.mean(recent)
    
    if base_std == 0:
        z_score = 0
    else:
        z_score = (recent_mean - base_mean) / (base_std / np.sqrt(len(recent)))
        
    drift_detected = abs(z_score) > threshold_sigma
    
    return {
        "drift_detected": bool(drift_detected),
        "z_score": float(z_score),
        "current_mean": float(recent_mean),
        "baseline_mean": float(base_mean),
        "reason": "Mean shift > {} sigma".format(threshold_sigma) if drift_detected else "Stable"
    }

def detect_market_regime(closes):
    """
    Identifies market regime (Trending/Ranging, Volatility Level)
    """
    closes = np.array(closes)
    if len(closes) < 20:
        return {"regime": "UNKNOWN", "volatility": "UNKNOWN"}
        
    # 1. Volatility (Annualized based on daily assumption for simplicity)
    returns = np.diff(closes) / closes[:-1]
    current_vol = np.std(returns) * np.sqrt(365)
    
    vol_tag = "NORMAL"
    if current_vol > 0.8: vol_tag = "EXTREME"
    elif current_vol > 0.5: vol_tag = "HIGH"
    elif current_vol < 0.2: vol_tag = "LOW"
    
    # 2. Trend (Linear Regression Slope)
    x = np.arange(len(closes))
    # Normalize prices to percentage change from start to avoid scale issues
    y = (closes - closes[0]) / closes[0]
    
    slope, _ = np.polyfit(x, y, 1)
    
    trend_tag = "RANGING"
    if slope > 0.001: trend_tag = "BULLISH" # Approx 0.1% per candle avg gain
    elif slope < -0.001: trend_tag = "BEARISH"
    
    return {
        "regime": f"{trend_tag}_{vol_tag}",
        "trend_strength": float(slope),
        "volatility_score": float(current_vol)
    }

def analyze_sentiment_correlation(sentiment_scores, price_returns):
    """
    Calculates Pearson correlation between sentiment and subsequent returns
    """
    scores = np.array(sentiment_scores)
    rets = np.array(price_returns)
    
    if len(scores) != len(rets) or len(scores) < 5:
        return {"correlation": 0.0, "significance": "low_data"}
    
    # Check for zero variance to avoid division by zero
    if np.std(scores) == 0 or np.std(rets) == 0:
        return {"correlation": 0.0, "significance": "no_variance"}
        
    correlation = np.corrcoef(scores, rets)[0, 1]
    
    # Handle NaN result (if any other edge case occurred)
    if np.isnan(correlation):
        correlation = 0.0
    
    return {
        "correlation": float(correlation),
        "strength": "strong" if abs(correlation) > 0.5 else "weak"
    }

def main():
    # Simple JSON-RPC like loop over stdin
    for line in sys.stdin:
        try:
            request = json.loads(line)
            command = request.get("command")
            payload = request.get("payload", {})
            
            result = None
            
            if command == "calculate_sharpe":
                returns = payload.get("returns", [])
                result = calculate_sharpe_ratio(returns)
            
            elif command == "calculate_calmar":
                returns = payload.get("returns", [])
                result = calculate_calmar_ratio(returns)
                
            elif command == "calculate_omega":
                returns = payload.get("returns", [])
                threshold = payload.get("threshold", 0.0)
                result = calculate_omega_ratio(returns, threshold)
            
            elif command == "detect_drift":
                recent = payload.get("recent_returns", [])
                baseline = payload.get("baseline_returns", [])
                sigma = payload.get("threshold_sigma", 2.0)
                result = detect_drift(recent, baseline, sigma)
                
            elif command == "detect_market_regime":
                closes = payload.get("closes", [])
                result = detect_market_regime(closes)
                
            elif command == "monte_carlo":
                price = payload.get("initial_price", 100)
                mu = payload.get("mu", 0.05)
                sigma = payload.get("sigma", 0.2)
                result = monte_carlo_simulation(price, mu, sigma)

            elif command == "analyze_sentiment":
                scores = payload.get("sentiment_scores", [])
                returns = payload.get("price_returns", [])
                result = analyze_sentiment_correlation(scores, returns)
                
            elif command == "ping":
                result = "pong"
                
            response = {"status": "ok", "result": result, "id": request.get("id")}
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
            
        except Exception as e:
            error_response = {"status": "error", "message": str(e)}
            sys.stdout.write(json.dumps(error_response) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    main()
