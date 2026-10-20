import Foundation
@main struct PolicyTests {
 static func main() {
  let home=KStockServerPolicy.previewURL
  precondition(KStockServerPolicy.validPreviewURL(home))
  for raw in ["http://kstock.ai.kr/","https://evil.invalid/","https://user:password@kstock.ai.kr/","https://kstock.ai.kr:444/","https://kstock.ai.kr/?token=secret","https://kstock.ai.kr/#test","https://kstock.ai.kr/other","file:///tmp/test"] {precondition(!KStockServerPolicy.validPreviewURL(URL(string:raw)!))}
  precondition(KStockServerPolicy.sameOrigin(URL(string:"https://kstock.ai.kr:443/api/v2/candidates")!,home))
  for raw in ["https://kstock.ai.kr.evil.invalid/","http://kstock.ai.kr/","https://user:pass@kstock.ai.kr/","https://kstock.ai.kr:444/"] {precondition(!KStockServerPolicy.sameOrigin(URL(string:raw)!,home))}
  precondition(!KStockServerPolicy.externalEvidence(URL(string:"https://user:pass@example.org/")!))
  precondition(KStockServerPolicy.externalEvidence(URL(string:"https://www.sec.gov/Archives/")!))
  print("SERVER_POLICY_PASS")
 }
}
