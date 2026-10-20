import Foundation
@main struct HoldingAlertPolicyTests {
 static func main() {
  let now=Date(timeIntervalSince1970:1800000000),expiry=ISO8601DateFormatter().string(from:now.addingTimeInterval(3600))
  let rule:[String:Any]=["market":"KR","exchange":"KRX","symbol":"005930","stop":90.0,"target":120.0,"expires":expiry]
  func data(_ close:Double)->[String:Any]{["success":true,"instrument":["market":"KR","exchange":"KRX","symbol":"005930"],"dataStatus":"OBSERVED","strategy":["action":"WAIT","validUntil":expiry,"metrics":["sma20":100.0]],"quote":["close":close,"date":"2027-01-15"]]}
  precondition(KStockHoldingPolicy.action(rule,data:data(89),now:now)=="STOP")
  precondition(KStockHoldingPolicy.action(rule,data:data(121),now:now)=="TARGET")
  precondition(KStockHoldingPolicy.action(rule,data:data(95),now:now)=="TREND")
  precondition(KStockHoldingPolicy.action(rule,data:data(105),now:now)==nil)
  var wrong=data(89);wrong["instrument"]=["market":"KR","exchange":"KRX","symbol":"000660"]
  precondition(KStockHoldingPolicy.action(rule,data:wrong,now:now)==nil)
  var blocked=data(89);blocked["dataStatus"]="UNAVAILABLE"
  precondition(KStockHoldingPolicy.action(rule,data:blocked,now:now)==nil)
  var bad=rule;bad["stop"]=Double.nan
  precondition(!KStockHoldingPolicy.valid(bad,now:now))
  precondition(KStockHoldingPolicy.action(rule,data:data(89),now:now.addingTimeInterval(3601))==nil)
  print("HOLDING_ALERT_POLICY: 8 PASS (synthetic, no notification delivery claim)")
 }
}
