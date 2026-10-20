import UIKit
import BackgroundTasks
import UserNotifications
import Security

// Explicit opt-in background credential, isolated from the foreground access item.
enum KStockBackgroundCredential {
    static let service="ai.kstock.https.market-alert-access"
    static var query:[String:Any] {[kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:service,kSecAttrAccount as String:"https://kstock.ai.kr"]}
    static func save(_ token:String)throws {
        guard KStockAccessCredential.valid(token) else{throw NSError(domain:"MarketAlert",code:1)}
        var q=query;q[kSecValueData as String]=Data(token.utf8);q[kSecAttrAccessible as String]=kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let updated=SecItemUpdate(query as CFDictionary,[kSecValueData as String:Data(token.utf8),kSecAttrAccessible as String:kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly] as CFDictionary)
        if updated==errSecItemNotFound {guard SecItemAdd(q as CFDictionary,nil)==errSecSuccess else{throw NSError(domain:"MarketAlert",code:2)}}else if updated != errSecSuccess{throw NSError(domain:"MarketAlert",code:3)}
    }
    static func load()throws->String {var q=query;q[kSecReturnData as String]=true;var result:CFTypeRef?;let code=SecItemCopyMatching(q as CFDictionary,&result);guard code==errSecSuccess,let data=result as? Data,let token=String(data:data,encoding:.utf8),KStockAccessCredential.valid(token)else{throw NSError(domain:"MarketAlert",code:4)};return token}
    static func remove(){SecItemDelete(query as CFDictionary)}
}
final class KStockNoRedirectSession:NSObject,URLSessionTaskDelegate {
    func urlSession(_ session:URLSession,task:URLSessionTask,willPerformHTTPRedirection response:HTTPURLResponse,newRequest request:URLRequest,completionHandler:@escaping(URLRequest?)->Void){completionHandler(nil)}
}
private final class KStockRefreshFinish:@unchecked Sendable {
    private let lock=NSLock();private var finished=false;private let task:BGTask
    init(_ task:BGTask){self.task=task}
    func complete(_ success:Bool){lock.lock();if finished{lock.unlock();return};finished=true;lock.unlock();task.setTaskCompleted(success:success)}
}
enum KStockMarketAlerts {
    static let defaults=UserDefaults.standard
    private static let pollLock=NSLock();private static var polling=false;private static var activeSession:URLSession?
    private static func beginPoll()->Bool{pollLock.lock();defer{pollLock.unlock()};if polling{return false};polling=true;return true}
    private static func endPoll(){pollLock.lock();polling=false;activeSession=nil;pollLock.unlock()}
    private static func attach(_ session:URLSession){pollLock.lock();activeSession=session;pollLock.unlock()}
    private static func cancelPoll(){pollLock.lock();let session=activeSession;pollLock.unlock();session?.invalidateAndCancel()}
    static var identifier:String{(Bundle.main.bundleIdentifier ?? "ai.kstock.ios.localvalidation")+".market-alerts"}
    static var enabled:Bool{defaults.bool(forKey:"market-alerts.enabled")}
    static func writeStatus(){UNUserNotificationCenter.current().getNotificationSettings{settings in BGTaskScheduler.shared.getPendingTaskRequests{requests in let value:[String:Any]=["enabled":enabled,"authorization":settings.authorizationStatus.rawValue,"scheduled":requests.contains{$0.identifier==identifier},"threshold":defaults.integer(forKey:"market-alerts.threshold"),"lastCheckedAt":defaults.double(forKey:"market-alerts.lastCheckedAt"),"state":defaults.string(forKey:"market-alerts.state") ?? "NOT_CHECKED","checkedAt":Date().timeIntervalSince1970];if let data=try? JSONSerialization.data(withJSONObject:value){let file=FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0].appendingPathComponent("market-alert-status.json");try? data.write(to:file,options:.atomic)}}}}
    static func register(){BGTaskScheduler.shared.register(forTaskWithIdentifier:identifier,using:nil){task in
        guard let refresh=task as? BGAppRefreshTask else{task.setTaskCompleted(success:false);return}
        schedule();let finish=KStockRefreshFinish(refresh);let work=Task{let success=await poll();finish.complete(success && !Task.isCancelled)}
        refresh.expirationHandler={work.cancel();finish.complete(false)}
    }}
    static func schedule(){guard enabled else{return};let request=BGAppRefreshTaskRequest(identifier:identifier);request.earliestBeginDate=Date(timeIntervalSinceNow:15*60);do{try BGTaskScheduler.shared.submit(request);writeStatus()}catch{defaults.set("SCHEDULE_FAILED",forKey:"market-alerts.state");writeStatus()}}
    static func disable(){KStockHoldingAlert.remove();defaults.set(false,forKey:"market-alerts.enabled");cancelPoll();BGTaskScheduler.shared.cancel(taskRequestWithIdentifier:identifier);for key in ["threshold","up","down","seen","state","lastCheckedAt"]{defaults.removeObject(forKey:"market-alerts."+key)};KStockBackgroundCredential.remove();UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers:["kstock-market-alert","kstock-market-test"]);UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers:["kstock-market-alert","kstock-market-test"])}
    static func instant(_ text:String)->Date?{let f=ISO8601DateFormatter();f.formatOptions=[.withInternetDateTime,.withFractionalSeconds];return f.date(from:text) ?? ISO8601DateFormatter().date(from:text)}
    static func poll()async->Bool {
        guard beginPoll()else{return false};defer{endPoll()}
        guard enabled,!Task.isCancelled,let token=try? KStockBackgroundCredential.load()else{return false}
        let settings=await UNUserNotificationCenter.current().notificationSettings();guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else{return false}
        let config=URLSessionConfiguration.ephemeral;config.httpShouldSetCookies=false;config.httpCookieStorage=nil;config.timeoutIntervalForRequest=15;config.timeoutIntervalForResource=30
        let session=URLSession(configuration:config,delegate:KStockNoRedirectSession(),delegateQueue:nil);attach(session);defer{session.invalidateAndCancel()}
        await KStockHoldingAlert.poll(session,token:token)
        let now=Date().timeIntervalSince1970;var seen=(defaults.dictionary(forKey:"market-alerts.seen") as? [String:Double] ?? [:]).filter{now-$0.value<3600};var up=0,down=0,observed=0
        let threshold=defaults.integer(forKey:"market-alerts.threshold");guard (1...30).contains(threshold)else{return false}
        for attempt in 0..<6 {
            guard !Task.isCancelled,enabled else{return false}
            var warm=URLRequest(url:URL(string:"https://kstock.ai.kr/api/v2/trading/movers?market=ALL")!);warm.setValue("Bearer "+token,forHTTPHeaderField:"Authorization")
            do{let(data,response)=try await session.data(for:warm);if (response as? HTTPURLResponse)?.statusCode==200,data.count<400000,let value=try JSONSerialization.jsonObject(with:data) as? [String:Any],let markets=value["markets"] as? [[String:Any]],markets.count==2,markets.allSatisfy({$0["dataStatus"] as? String=="OBSERVED"}){break}}catch{}
            if attempt<5{do{try await Task.sleep(nanoseconds:4_000_000_000)}catch{return false}}
        }
        for market in ["KR","US"] {
            if Task.isCancelled || !enabled{return false}
            var request=URLRequest(url:URL(string:"https://kstock.ai.kr/api/v2/trading/movers?market="+market)!);request.setValue("Bearer "+token,forHTTPHeaderField:"Authorization");request.setValue("application/json",forHTTPHeaderField:"Accept")
            do{let (data,response)=try await session.data(for:request);guard !Task.isCancelled,enabled,(response as? HTTPURLResponse)?.statusCode==200,data.count<200000,let value=try JSONSerialization.jsonObject(with:data) as? [String:Any],value["success"] as? Bool==true,value["market"] as? String==market,value["dataStatus"] as? String=="OBSERVED",let text=value["receivedAt"] as? String,let received=instant(text),received<=Date(),Date().timeIntervalSince(received)<600 else{continue};observed+=1
                for side in ["gainers","losers"] {let rising=side=="gainers";guard defaults.bool(forKey:"market-alerts."+(rising ? "up":"down")),let rows=value[side] as? [[String:Any]],rows.count<=10 else{continue};for row in rows{guard let symbol=row["symbol"] as? String,symbol.range(of:market=="KR" ? "^[0-9][A-Z0-9]{5}$":"^[A-Z][A-Z0-9.]{0,9}$",options:.regularExpression) != nil,let exchange=row["exchange"] as? String,let rate=row["changePct"] as? Double,rate.isFinite,(rising ? rate>=Double(threshold):rate<=Double(-threshold))else{continue};let key=market+":"+exchange+":"+symbol+":"+side;if seen[key] != nil{continue};seen[key]=now;if rising{up+=1}else{down+=1}}}
            }catch{continue}
        }
        guard !Task.isCancelled,enabled else{return false}
        if up+down>0{let content=UNMutableNotificationContent();content.title="급상승·급하락 관측";content.body="상승 \(up)개 · 하락 \(down)개가 설정 기준에 도달했습니다. 공급자 순위이며 실시간 보장이 아닙니다.";content.sound = .default;content.userInfo=["kstock-route":"market-movers"];do{try await UNUserNotificationCenter.current().add(UNNotificationRequest(identifier:"kstock-market-alert",content:content,trigger:nil));if !enabled{UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers:["kstock-market-alert"]);return false};defaults.set(Dictionary(uniqueKeysWithValues:seen.sorted{$0.value>$1.value}.prefix(40).map{($0.key,$0.value)}),forKey:"market-alerts.seen")}catch{return false}}
        if up+down==0{defaults.set(Dictionary(uniqueKeysWithValues:seen.sorted{$0.value>$1.value}.prefix(40).map{($0.key,$0.value)}),forKey:"market-alerts.seen")}
        defaults.set(Date().timeIntervalSince1970,forKey:"market-alerts.lastCheckedAt");defaults.set(observed>0 ? "CHECKED":"DATA_UNAVAILABLE",forKey:"market-alerts.state");writeStatus();return observed>0
    }
    @MainActor static func present(from controller:UIViewController){
        writeStatus();let current=defaults.integer(forKey:"market-alerts.threshold");let alert=UIAlertController(title:"화면 꺼짐 알림 설정",message:"상태: \(enabled ? "예약됨":"꺼짐")\n국내·미국 공급자 상위10개 중 설정 등락률을 알립니다. iOS가 허용할 때 백그라운드 조회하며 15분 후부터 예약하지만 실행 시각은 보장되지 않습니다. 강제종료·절전 중에는 실행되지 않을 수 있습니다. 켜면 기존 인증값의 별도 기기 전용 사본을 최초 잠금해제 후 접근 가능한 Keychain에 보관합니다. 끄기·인증 삭제 시 사본도 삭제합니다.",preferredStyle:.alert)
        alert.addTextField{field in field.placeholder="등락률 기준 1~30 (%)";field.keyboardType = .numberPad;field.text=String((1...30).contains(current) ? current:5)}
        alert.addAction(UIAlertAction(title:"상승·하락 알림 켜기",style:.default){_ in let value=Int(alert.textFields?.first?.text ?? "") ?? 0;guard (1...30).contains(value)else{return};Task{@MainActor in let center=UNUserNotificationCenter.current();do{let allowed=try await center.requestAuthorization(options:[.alert,.sound,.badge]);guard allowed,let token=try? KStockAccessCredential.load(),!token.isEmpty else{return};try KStockBackgroundCredential.save(token);defaults.set(value,forKey:"market-alerts.threshold");defaults.set(true,forKey:"market-alerts.up");defaults.set(true,forKey:"market-alerts.down");defaults.set(true,forKey:"market-alerts.enabled");schedule();_ = await poll()}catch{}}})
        alert.addAction(UIAlertAction(title:"보유종목 기준만 삭제",style:.destructive){_ in KStockHoldingAlert.remove()})
        alert.addAction(UIAlertAction(title:"알림 끄기·기록 삭제",style:.destructive){_ in disable()})
        alert.addAction(UIAlertAction(title:"10초 뒤 테스트 알림",style:.default){_ in Task{let center=UNUserNotificationCenter.current();guard (try? await center.requestAuthorization(options:[.alert,.sound]))==true else{return};let c=UNMutableNotificationContent();c.title="[테스트] K-Stock";c.body="화면 꺼짐 상태의 OS 알림 확인용입니다. 실제 급등락 신호가 아닙니다.";c.sound = .default;try? await center.add(UNNotificationRequest(identifier:"kstock-market-test",content:c,trigger:UNTimeIntervalNotificationTrigger(timeInterval:10,repeats:false)))}})
        alert.addAction(UIAlertAction(title:"닫기",style:.cancel));controller.present(alert,animated:true)
    }
}

// Single explicit fixed-level rule, separate from ordinary holdings and authentication.
enum KStockHoldingAlert {
    private static let ruleLock=NSRecursiveLock()
    static let service="ai.kstock.https.holding-alert"
    static var query:[String:Any]{[kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:service,kSecAttrAccount as String:"rule"]}
    static func remove(){ruleLock.lock();defer{ruleLock.unlock()};SecItemDelete(query as CFDictionary);UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers:["kstock-holding-alert"])}
    static func removeIfCurrent(_ rule:[String:Any]){ruleLock.lock();defer{ruleLock.unlock()};if load()?["id"] as? String==rule["id"] as? String{remove()}}
    static func load()->[String:Any]?{ruleLock.lock();defer{ruleLock.unlock()};var q=query;q[kSecReturnData as String]=true;var result:CFTypeRef?;guard SecItemCopyMatching(q as CFDictionary,&result)==errSecSuccess,let data=result as? Data,data.count<8192 else{return nil};return (try? JSONSerialization.jsonObject(with:data)) as? [String:Any]}
    static func valid(_ r:[String:Any])->Bool{KStockHoldingPolicy.valid(r)}
    static func save(_ r:[String:Any])throws{ruleLock.lock();defer{ruleLock.unlock()};if r["seen"] != nil && load()?["id"] as? String != r["id"] as? String {throw NSError(domain:"HoldingAlert",code:4)};guard valid(r),KStockMarketAlerts.enabled else{throw NSError(domain:"HoldingAlert",code:1)};let data=try JSONSerialization.data(withJSONObject:r);var q=query;q[kSecValueData as String]=data;q[kSecAttrAccessible as String]=kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly;let code=SecItemUpdate(query as CFDictionary,[kSecValueData as String:data] as CFDictionary);if code==errSecItemNotFound{guard SecItemAdd(q as CFDictionary,nil)==errSecSuccess else{throw NSError(domain:"HoldingAlert",code:2)}}else if code != errSecSuccess{throw NSError(domain:"HoldingAlert",code:3)}}
    @MainActor static func present(_ url:URL,from controller:UIViewController){guard let components=URLComponents(url:url,resolvingAgainstBaseURL:false)else{return};var rule:[String:Any]=[:];for k in ["market","symbol","exchange","expires"]{rule[k]=components.queryItems?.first{$0.name==k}?.value};rule["id"]=UUID().uuidString;for k in ["stop","target"]{rule[k]=Double(components.queryItems?.first{$0.name==k}?.value ?? "")};guard valid(rule)else{return};guard KStockMarketAlerts.enabled else{KStockMarketAlerts.present(from:controller);return};let a=UIAlertController(title:"보유종목 종가 조건 알림",message:"\(rule["symbol"] ?? "") · 손절 \(rule["stop"] ?? "") · 목표 \(rule["target"] ?? "")\n1종목 기준을 기기 전용 Keychain에 보관합니다. 기존 기준은 교체됩니다. 수량·평균가를 전송하지 않고 공개 일봉 종가로 확인합니다. 실시간 도달 알림이 아닙니다. 유효기한 뒤 삭제됩니다.",preferredStyle:.alert);a.addAction(UIAlertAction(title:"이 기준으로 알림 켜기",style:.default){_ in try? save(rule)});a.addAction(UIAlertAction(title:"이 기준 삭제",style:.destructive){_ in remove()});a.addAction(UIAlertAction(title:"취소",style:.cancel));controller.present(a,animated:true)}
    static func poll(_ session:URLSession,token:String)async{
        guard var rule=load()else{return};guard valid(rule)else{removeIfCurrent(rule);return};var c=URLComponents(string:"https://kstock.ai.kr/api/v2/trading/detail")!;c.queryItems=["market","symbol","exchange"].map{URLQueryItem(name:$0,value:rule[$0] as? String)};guard let url=c.url else{return};var req=URLRequest(url:url);req.setValue("Bearer "+token,forHTTPHeaderField:"Authorization")
        do {
            let (data,response)=try await session.data(for:req)
            guard !Task.isCancelled,KStockMarketAlerts.enabled,load()?["id"] as? String==rule["id"] as? String,
                  (response as? HTTPURLResponse)?.statusCode==200,data.count<200000,
                  let d=try JSONSerialization.jsonObject(with:data) as? [String:Any],
                  let action=KStockHoldingPolicy.action(rule,data:d),let quote=d["quote"] as? [String:Any] else{return}
            let fingerprint=action+":"+(quote["date"] as? String ?? "")
            guard rule["seen"] as? String != fingerprint else{return}
            let content=UNMutableNotificationContent();content.title="보유종목 종가 조건 확인"
            content.body="저장한 손절·목표 또는 추세 이탈 조건이 관측됐습니다. 앱에서 재확인하세요. 실시간 시세가 아닙니다."
            content.sound = .default;content.userInfo=["kstock-route":"my-stocks"]
            try await UNUserNotificationCenter.current().add(UNNotificationRequest(identifier:"kstock-holding-alert",content:content,trigger:nil))
            guard KStockMarketAlerts.enabled,load()?["id"] as? String==rule["id"] as? String else{
                UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers:["kstock-holding-alert"]);return
            }
            rule["seen"]=fingerprint;try save(rule)
        }catch{}
    }
}
