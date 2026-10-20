import Foundation
import Security

// Credentials are scoped to this app and device, never stored in preferences or backups.
enum KStockAccessCredential {
    private static let service = "ai.kstock.https.access"
    private static let account = "https://kstock.ai.kr"
    private static var query: [String: Any] { [kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:service,kSecAttrAccount as String:account] }
    static func valid(_ token: String) -> Bool { !token.isEmpty && token.count <= 4096 && token.range(of:"^[A-Za-z0-9._~+/=-]+$",options:.regularExpression) != nil }
    static func load() throws -> String {
        var q=query; q[kSecReturnData as String]=true; q[kSecMatchLimit as String]=kSecMatchLimitOne
        var result: CFTypeRef?; let code=SecItemCopyMatching(q as CFDictionary,&result)
        if code==errSecItemNotFound { return "" }
        guard code==errSecSuccess,let data=result as? Data,let token=String(data:data,encoding:.utf8) else { throw NSError(domain:"KStockCredential",code:Int(code)) }
        return token
    }
    static func save(_ token: String) throws {
        guard valid(token) else { throw NSError(domain:"KStockCredential",code:1) }
        let data=Data(token.utf8)
        let code=SecItemUpdate(query as CFDictionary,[kSecValueData as String:data] as CFDictionary)
        if code==errSecItemNotFound {
            var q=query;q[kSecValueData as String]=data;q[kSecAttrAccessible as String]=kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            let added=SecItemAdd(q as CFDictionary,nil);guard added==errSecSuccess else { throw NSError(domain:"KStockCredential",code:Int(added)) }
        } else if code != errSecSuccess { throw NSError(domain:"KStockCredential",code:Int(code)) }
    }
    static func forget() throws { let code=SecItemDelete(query as CFDictionary);guard code==errSecSuccess || code==errSecItemNotFound else { throw NSError(domain:"KStockCredential",code:Int(code)) } }
    // Explicit operator provisioning only. Read once, delete before parsing, reject stale or wrong-origin input.
    static func importOnce() throws {
        let file=FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0].appendingPathComponent("kstock-auth-import.json")
        let data=try Data(contentsOf:file);try FileManager.default.removeItem(at:file)
        guard data.count<=8192,let value=try JSONSerialization.jsonObject(with:data) as? [String:Any],value["origin"] as? String==account,let at=value["issuedAt"] as? Double,abs(Date().timeIntervalSince1970-at)<300,let token=value["token"] as? String else {throw NSError(domain:"KStockCredential",code:2)}
        try save(token)
    }
}

// Public instrument/optional user-holding storage is separate from authentication.
import WebKit
final class KStockTradingStorageBridge: NSObject, WKScriptMessageHandlerWithReply {
    private static let service="ai.kstock.https.trading-storage"
    private static let allowed=["kstock-trading-watch-v1","kstock-user-holdings-v1"]
    static func valid(_ text:String,key:String)->Bool {
        guard allowed.contains(key),text.utf8.count<=50000,let data=text.data(using:.utf8),let rows=(try? JSONSerialization.jsonObject(with:data)) as? [[String:Any]],rows.count<=100 else{return false}
        return rows.allSatisfy { row in
            let holding=key=="kstock-user-holdings-v1"
            let fields:Set<String>=holding ? ["market","symbol","name","exchange","currency","quantity","averageCost"] : ["market","symbol","name","exchange","currency"]
            guard Set(row.keys).isSubset(of:fields),let market=row["market"] as? String,["KR","US"].contains(market),let symbol=row["symbol"] as? String,symbol.range(of:market=="KR" ? "^[0-9][A-Z0-9]{5}$":"^[A-Z][A-Z0-9.]{0,9}$",options:.regularExpression) != nil,let exchange=row["exchange"] as? String,(market=="KR" ? exchange=="KRX":["NAS","NYS","AMS"].contains(exchange)),row["currency"] as? String == (market=="KR" ? "KRW":"USD"),let name=row["name"] as? String,!name.isEmpty,name.count<=150 else{return false}
            if holding {
                for (key,limit) in [("quantity",1e9),("averageCost",1e12)] {
                    guard let n=row[key] as? NSNumber,CFGetTypeID(n) != CFBooleanGetTypeID(),n.doubleValue.isFinite,n.doubleValue>0,n.doubleValue<=limit else{return false}
                }
            }
            return true
        }
    }
    private func query(_ key:String)->[String:Any] {[kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:Self.service,kSecAttrAccount as String:"https://kstock.ai.kr/"+key]}
    func userContentController(_ userContentController:WKUserContentController,didReceive message:WKScriptMessage,replyHandler:@escaping(Any?,String?)->Void) {
        let origin=message.frameInfo.securityOrigin
        guard message.frameInfo.isMainFrame,origin.protocol=="https",origin.host=="kstock.ai.kr",[0,443].contains(origin.port),let body=message.body as? [String:Any],let key=body["key"] as? String,Self.allowed.contains(key),let operation=body["operation"] as? String else{replyHandler(nil,"STORAGE_SCOPE_REJECTED");return}
        var q=query(key)
        switch operation {
        case "get":
            q[kSecReturnData as String]=true;q[kSecMatchLimit as String]=kSecMatchLimitOne
            var result:CFTypeRef?;let code=SecItemCopyMatching(q as CFDictionary,&result)
            if code==errSecItemNotFound {replyHandler(NSNull(),nil);return}
            guard code==errSecSuccess,let data=result as? Data,let value=String(data:data,encoding:.utf8),Self.valid(value,key:key) else{replyHandler(nil,"STORAGE_READ_FAILED");return}
            replyHandler(value,nil)
        case "set":
            guard let value=body["value"] as? String,Self.valid(value,key:key) else{replyHandler(nil,"STORAGE_VALUE_REJECTED");return}
            let data=Data(value.utf8);var code=SecItemUpdate(q as CFDictionary,[kSecValueData as String:data] as CFDictionary)
            if code==errSecItemNotFound {q[kSecValueData as String]=data;q[kSecAttrAccessible as String]=kSecAttrAccessibleWhenUnlockedThisDeviceOnly;code=SecItemAdd(q as CFDictionary,nil)}
            replyHandler(code==errSecSuccess ? true:nil,code==errSecSuccess ? nil:"STORAGE_WRITE_FAILED")
        case "remove":
            let code=SecItemDelete(q as CFDictionary);let ok=code==errSecSuccess||code==errSecItemNotFound;replyHandler(ok ? true:nil,ok ? nil:"STORAGE_DELETE_FAILED")
        default:replyHandler(nil,"STORAGE_OPERATION_REJECTED")
        }
    }
}
