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
