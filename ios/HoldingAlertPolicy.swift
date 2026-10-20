import Foundation

/// Daily-close condition checks, independent of storage, UI and OS scheduling.
enum KStockHoldingPolicy {
    static func instant(_ text: String) -> Date? {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: text) ?? ISO8601DateFormatter().date(from: text)
    }
    static func valid(_ rule: [String: Any], now: Date = Date()) -> Bool {
        guard let market = rule["market"] as? String,
              let exchange = rule["exchange"] as? String,
              let symbol = rule["symbol"] as? String,
              (market == "KR" ? exchange == "KRX" : market == "US" && ["NAS", "NYS", "AMS"].contains(exchange)),
              symbol.range(of: market == "KR" ? "^[0-9][A-Z0-9]{5}$" : "^[A-Z][A-Z0-9.]{0,9}$", options: .regularExpression) != nil,
              let stop = rule["stop"] as? Double, let target = rule["target"] as? Double,
              stop.isFinite, target.isFinite, stop > 0, target > stop,
              let text = rule["expires"] as? String, let expiry = instant(text),
              expiry > now, expiry.timeIntervalSince(now) <= 86401 else { return false }
        return true
    }
    static func action(_ rule: [String: Any], data: [String: Any], now: Date = Date()) -> String? {
        guard valid(rule, now: now), data["success"] as? Bool == true,
              let instrument = data["instrument"] as? [String: Any],
              ["market", "symbol", "exchange"].allSatisfy({ instrument[$0] as? String == rule[$0] as? String }),
              ["OBSERVED", "STORED_OBSERVATION"].contains(data["dataStatus"] as? String ?? ""),
              let strategy = data["strategy"] as? [String: Any],
              ["WAIT", "BUY_CONDITION_MET"].contains(strategy["action"] as? String ?? ""),
              let text = strategy["validUntil"] as? String, let until = instant(text), until > now,
              let quote = data["quote"] as? [String: Any], let close = quote["close"] as? Double,
              close.isFinite, close > 0,
              let metrics = strategy["metrics"] as? [String: Any], let sma = metrics["sma20"] as? Double,
              sma.isFinite, sma > 0, let stop = rule["stop"] as? Double, let target = rule["target"] as? Double else { return nil }
        return close <= stop ? "STOP" : close >= target ? "TARGET" : close < sma ? "TREND" : nil
    }
}
