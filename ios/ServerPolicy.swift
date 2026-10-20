import Foundation

// Fixed HTTPS preview origin. This does not configure App Store distribution.
enum KStockServerPolicy {
    static let previewURL = URL(string: "https://kstock.ai.kr/")!
    static func validPreviewURL(_ url: URL) -> Bool {
        url.scheme == "https" && url.host == "kstock.ai.kr" &&
        (url.port == nil || url.port == 443) && url.user == nil && url.password == nil &&
        url.path == "/" && url.query == nil && url.fragment == nil
    }
    static func sameOrigin(_ url: URL, _ home: URL) -> Bool {
        func port(_ value: URL) -> Int? { value.port ?? (value.scheme == "https" ? 443 : value.scheme == "http" ? 80 : nil) }
        return url.user == nil && url.password == nil && url.scheme == home.scheme &&
            url.host == home.host && port(url) == port(home)
    }
    static func externalEvidence(_ url: URL) -> Bool {
        url.scheme == "https" && url.host != nil && url.user == nil && url.password == nil
    }
}
