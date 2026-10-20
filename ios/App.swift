#if !targetEnvironment(simulator) && !LOCAL_DEVICE_VALIDATION && !KSTOCK_HTTPS_PREVIEW
#error("Device build requires an explicit local validation or HTTPS preview configuration.")
#endif
import UIKit
import WebKit

// Fixed HTTPS review: separate credential/optional-data Keychain services, no order bridge.
@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application:UIApplication,didFinishLaunchingWithOptions options:[UIApplication.LaunchOptionsKey:Any]?=nil)->Bool {
        #if KSTOCK_HTTPS_PREVIEW
        KStockMarketAlerts.register();KStockMarketAlerts.schedule();if KStockMarketAlerts.enabled{Task{_ = await KStockMarketAlerts.poll()}}
        #endif
        return true
    }
    func application(_ application: UIApplication, configurationForConnecting session: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "KStock", sessionRole: session.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    func sceneDidEnterBackground(_ scene:UIScene){
        #if KSTOCK_HTTPS_PREVIEW
        KStockMarketAlerts.schedule()
        #endif
    }
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: scene)
        window.rootViewController = ResearchController()
        window.makeKeyAndVisible()
        self.window = window
    }
}

final class ResearchController: UIViewController, WKNavigationDelegate {
    let web: WKWebView = {
        let configuration = WKWebViewConfiguration()
        #if KSTOCK_HTTPS_PREVIEW
        configuration.websiteDataStore = .nonPersistent()
        configuration.userContentController.addScriptMessageHandler(KStockTradingStorageBridge(),contentWorld:.page,name:"kstockTradingStorage")
        let storageScript="window.KStockTradingStorage=Object.freeze({getItem:async key=>await window.webkit.messageHandlers.kstockTradingStorage.postMessage({operation:'get',key}),setItem:async(key,value)=>await window.webkit.messageHandlers.kstockTradingStorage.postMessage({operation:'set',key,value}),removeItem:async key=>await window.webkit.messageHandlers.kstockTradingStorage.postMessage({operation:'remove',key})});"
        configuration.userContentController.addUserScript(WKUserScript(source:storageScript,injectionTime:.atDocumentStart,forMainFrameOnly:true))
        #endif
        return WKWebView(frame: .zero, configuration: configuration)
    }()
    let status = UILabel()
    #if KSTOCK_HTTPS_PREVIEW
    let home = KStockServerPolicy.previewURL
    #else
    let home = URL(string: Bundle.main.object(forInfoDictionaryKey: "KStockValidationURL") as? String ?? "http://localhost:3000/")!
    #endif
    var qaStarted = false
    var serverPageUnavailable = false
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        view.tintColor = UIColor { traits in traits.userInterfaceStyle == .dark ? UIColor(red:0.757,green:0.686,blue:0.965,alpha:1) : UIColor(red:0.396,green:0.314,blue:0.678,alpha:1) }
        #if KSTOCK_HTTPS_PREVIEW
        status.text = "HTTPS 연결 중 · 배포 전 검토용"
        #else
        status.text = "화면 연결 중 · 로컬 검증용"
        #endif
        status.font = .preferredFont(forTextStyle: .caption1)
        status.adjustsFontForContentSizeCategory = true
        status.numberOfLines = 0
        status.accessibilityIdentifier = "kstock.connection.status"
        status.accessibilityTraits = .updatesFrequently
        let retry = UIButton(type: .system)
        retry.accessibilityIdentifier = "kstock.connection.retry"
        retry.accessibilityHint = "검증 화면을 다시 불러옵니다. 현재 선택은 초기화될 수 있습니다."
        retry.setTitle("새로고침", for: .normal)
        retry.titleLabel?.font = .preferredFont(forTextStyle: .caption1)
        retry.titleLabel?.adjustsFontForContentSizeCategory = true
        retry.addTarget(self, action: #selector(reload), for: .touchUpInside)
        retry.heightAnchor.constraint(greaterThanOrEqualToConstant: 44).isActive = true
        let actions = UIStackView(arrangedSubviews: [retry])
        actions.axis = .horizontal
        actions.spacing = 12
        let toolbar = UIStackView(arrangedSubviews: [status, actions])
        toolbar.axis = traitCollection.preferredContentSizeCategory.isAccessibilityCategory ? .vertical : .horizontal
        toolbar.spacing = 12
        toolbar.alignment = .center
        status.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        let stack = UIStackView(arrangedSubviews: [toolbar, web])
        stack.axis = .vertical
        stack.spacing = 4
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            stack.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
        ])
        web.navigationDelegate = self
        web.allowsBackForwardNavigationGestures = true
        #if KSTOCK_HTTPS_PREVIEW
        let access = UIButton(type:.system); access.setTitle("인증 설정·삭제",for:.normal); access.titleLabel?.font = .preferredFont(forTextStyle:.caption1); access.heightAnchor.constraint(greaterThanOrEqualToConstant:44).isActive = true
        access.accessibilityIdentifier="kstock.access.settings"
        access.addTarget(self,action:#selector(accessSettings),for:.touchUpInside)
        actions.addArrangedSubview(access)
        let alerts=UIButton(type:.system);alerts.setTitle("알림",for:.normal);alerts.titleLabel?.font = .preferredFont(forTextStyle:.caption1);alerts.heightAnchor.constraint(greaterThanOrEqualToConstant:44).isActive=true;alerts.addTarget(self,action:#selector(marketAlertSettings),for:.touchUpInside);actions.addArrangedSubview(alerts)
        if ProcessInfo.processInfo.arguments.contains("--import-auth") {
            do { try KStockAccessCredential.importOnce() } catch { status.text="인증 설정을 불러오지 못했습니다. 다시 설정해 주세요." }
        }
        #endif
        reload()
    }
    #if KSTOCK_HTTPS_PREVIEW
    @objc private func marketAlertSettings(){KStockMarketAlerts.present(from:self)}
    @objc private func accessSettings() {
        let alert=UIAlertController(title:"운영 서버 인증",message:"토큰은 이 기기의 Keychain에 보관합니다. 삭제하면 자료 조회 인증이 해제됩니다.",preferredStyle:.alert)
        alert.addTextField { field in field.isSecureTextEntry=true;field.placeholder="외부접속 토큰";field.autocorrectionType = .no;field.autocapitalizationType = .none }
        alert.addAction(UIAlertAction(title:"취소",style:.cancel))
        alert.addAction(UIAlertAction(title:"저장 후 연결",style:.default) { [weak self,weak alert] _ in
            guard let token=alert?.textFields?.first?.text else {return};alert?.textFields?.first?.text=""
            do {try KStockAccessCredential.save(token);self?.reload()} catch {self?.status.text="인증 정보를 저장하지 못했습니다. 입력값과 기기 잠금을 확인하세요."}
        })
        alert.addAction(UIAlertAction(title:"저장 인증 삭제",style:.destructive) { [weak self] _ in
            do {try KStockAccessCredential.forget();self?.reload()} catch {self?.status.text="인증 삭제에 실패했습니다. 다시 시도하세요."}
        })
        present(alert,animated:true)
    }
    #endif
    @objc func reload() {
        serverPageUnavailable = false
        #if KSTOCK_HTTPS_PREVIEW
        status.text = "HTTPS 연결 중 · 배포 전 검토용"
        #else
        status.text = "화면 연결 중 · 로컬 검증용"
        #endif
        if web.url == nil { web.load(URLRequest(url: home)) } else { web.reload() }
    }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        #if KSTOCK_HTTPS_PREVIEW
        if url.scheme=="kstock",url.host=="market-alerts",action.navigationType == .linkActivated,let current=web.url,KStockServerPolicy.sameOrigin(current,home){KStockMarketAlerts.present(from:self);decisionHandler(.cancel);return}
        #endif
        if KStockServerPolicy.sameOrigin(url, home) {
            decisionHandler(.allow)
        } else {
            // External official evidence opens only on an explicit user link gesture.
            if action.navigationType == .linkActivated && KStockServerPolicy.externalEvidence(url) {
                UIApplication.shared.open(url)
            }
            decisionHandler(.cancel)
        }
    }
    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        #if KSTOCK_HTTPS_PREVIEW
        if response.isForMainFrame {
            let code = (response.response as? HTTPURLResponse)?.statusCode ?? 0
            let html = response.response.mimeType?.lowercased() == "text/html"
            if code != 200 || !html {
                serverPageUnavailable = true
                status.text = "앱 화면을 제공하지 않는 서버입니다. 운영 웹 배포 상태를 확인하세요."
                if ProcessInfo.processInfo.arguments.contains("--https-preview-check") {
                    let result: [String: Any] = ["kind": "IOS_HTTPS_PREVIEW_READ_ONLY", "checkedAt": ISO8601DateFormatter().string(from: Date()), "persistentWebsiteStorage": web.configuration.websiteDataStore.isPersistent, "serverPageStatus": "BLOCKED_WEB_ASSETS_NOT_DEPLOYED", "httpStatus": code, "mimeType": response.response.mimeType ?? "unknown"]
                    if let data = try? JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys]) {
                        let path = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("https-preview-check.json")
                        try? data.write(to: path, options: .atomic)
                    }
                }
                decisionHandler(.cancel); return
            }
        }
        #endif
        decisionHandler(.allow)
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        status.text = "화면 연결됨 · API 상태는 화면에서 확인"
        #if KSTOCK_HTTPS_PREVIEW
        Task { @MainActor in
            do {
                let token=try KStockAccessCredential.load()
                if !token.isEmpty && KStockServerPolicy.sameOrigin(web.url ?? home, home) {
                    _ = try await web.callAsyncJavaScript("for(let n=0;n<100 && simpleResearchLoading;n++)await new Promise(r=>setTimeout(r,50));sessionToken = credential; await refreshSimpleResearch(); return true;",arguments:["credential":token],in:nil,contentWorld:.page)
                    let code = try await js("return (await fetch('/api/v2/candidates',{headers:{Authorization:'Bearer '+sessionToken},cache:'no-store',redirect:'error'})).status;")
                    status.text=(code as? Int)==200 ? "운영 서버 인증됨" : (code as? Int)==401 ? "인증 만료·거절 · 인증 설정에서 갱신하세요" : "자료 서버 응답을 확인해 주세요"
                } else { status.text="운영 화면 연결됨 · 자료 조회는 인증 설정이 필요합니다" }
                if ProcessInfo.processInfo.arguments.contains("--live-workflow-check"), let source=Bundle.main.url(forResource:"LiveWorkflow",withExtension:"js") {
                    let script=try String(contentsOf:source,encoding:.utf8)
                    let result=try await js("return await " + script + ";")
                    let file=FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0].appendingPathComponent("live-workflow.json")
                    try JSONSerialization.data(withJSONObject:result).write(to:file,options:.atomic)
                }
                if ProcessInfo.processInfo.arguments.contains("--access-check") {
                    let result=try await web.callAsyncJavaScript("const r=await fetch('/api/v2/candidates',{headers:credential?{Authorization:'Bearer '+credential}:{},cache:'no-store'});return {status:r.status,origin:location.origin,appShellReady:!!document.getElementById('paper-portfolio'),credentialAvailable:!!credential};",arguments:["credential":token],in:nil,contentWorld:.page) ?? NSNull()
                    let file=FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0].appendingPathComponent("access-check.json")
                    try JSONSerialization.data(withJSONObject:result).write(to:file,options:.atomic)
                }
            } catch { status.text="인증 정보를 읽지 못했습니다. 기기를 잠금 해제하고 다시 시도하세요." }
        }
        if ProcessInfo.processInfo.arguments.contains("--https-preview-check"), !qaStarted {
            qaStarted = true
            Task { @MainActor in await runHTTPSPreviewCheck() }
        }
        return
        #else
        if ProcessInfo.processInfo.arguments.contains("--voiceover-ui-test") {
            status.accessibilityValue = UIAccessibility.isVoiceOverRunning ? "VOICEOVER_ENABLED" : "VOICEOVER_DISABLED"
        }
        if ProcessInfo.processInfo.arguments.contains("--paper-integration-qa"), !qaStarted {
            qaStarted = true
            Task { @MainActor in await runPaperIntegrationQA() }
        }
        if ProcessInfo.processInfo.arguments.contains("--qa"), !qaStarted {
            qaStarted = true
            Task { @MainActor in await runQA() }
        }
        #endif
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { failed() }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { failed() }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { failed() }
    private func failed() { if !serverPageUnavailable { status.text = "화면 연결 실패 · 다시 연결해 주세요" } }

    @MainActor private func js(_ code: String) async throws -> Any {
        try await web.callAsyncJavaScript(code, arguments: [:], in: nil, contentWorld: .page) ?? NSNull()
    }
    #if KSTOCK_HTTPS_PREVIEW
    @MainActor private func runHTTPSPreviewCheck() async {
        var evidence: [String: Any] = ["kind": "IOS_HTTPS_PREVIEW_READ_ONLY", "checkedAt": ISO8601DateFormatter().string(from: Date()), "persistentWebsiteStorage": web.configuration.websiteDataStore.isPersistent]
        do {
            evidence["result"] = try await js("""
                const response=await fetch('/api/v2/candidates',{credentials:'omit',cache:'no-store',redirect:'error'});
                return {origin:location.origin,secureContext:isSecureContext,anonymousApiStatus:response.status,title:document.title,appShellReady:!!document.getElementById('paper-portfolio')&&typeof loadPaperPerformance==='function'};
                """)
        } catch { evidence["error"] = String(describing: error) }
        if let data = try? JSONSerialization.data(withJSONObject: evidence, options: [.prettyPrinted, .sortedKeys]) {
            let path = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("https-preview-check.json")
            try? data.write(to: path, options: .atomic)
        }
    }
    #endif
    @MainActor private func runPaperIntegrationQA() async {
        #if targetEnvironment(simulator)
        let physicalDevice = false
        #else
        let physicalDevice = true
        #endif
        var evidence: [String: Any] = ["kind": "IOS_PAPER_INTEGRATION_QA", "physicalDevice": physicalDevice, "checkedAt": ISO8601DateFormatter().string(from: Date())]
        do {
            // The fixture supplies synthetic records; this mode never starts from normal launch.
            let result = try await js("""
                for(let attempt=0;attempt<120;attempt++){
                    if(window.KStockPaperMobileQAResult)return window.KStockPaperMobileQAResult;
                    await new Promise(resolve=>setTimeout(resolve,500));
                }
                throw Error('PAPER_FIXTURE_RESULT_TIMEOUT');
                """)
            evidence["result"] = result
        } catch { evidence["error"] = String(describing: error) }
        if let data = try? JSONSerialization.data(withJSONObject: evidence, options: [.prettyPrinted, .sortedKeys]) {
            let path = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("paper-integration-qa.json")
            try? data.write(to: path, options: .atomic)
        }
    }
    @MainActor private func runQA() async {
        #if targetEnvironment(simulator)
        let physicalDevice = false
        #else
        let physicalDevice = true
        #endif
        var evidence: [String: Any] = ["kind": "IOS_WKWEBVIEW_LOCAL_QA", "physicalDevice": physicalDevice, "checkedAt": ISO8601DateFormatter().string(from: Date()), "voiceOverEnabled": UIAccessibility.isVoiceOverRunning]
        do {
            evidence["viewport"] = try await js("return {width:innerWidth,height:innerHeight};")
            evidence["screens"] = try await js("""
                await refreshSimpleResearch();
                const ids=['research-home','investment-signals','global-influence','market-analysis','research-results','stock-analysis'];
                return ids.map(id=>{location.hash=id;applyResearchScreen();const node=document.getElementById(id);return {id,active:node.classList.contains('screen-active'),overflow:document.documentElement.scrollWidth>innerWidth};});
                """)
            evidence["currentTtm"] = try await js("""
                const data=await (await fetch('/api/v2/research/dashboard')).json();
                renderSimpleResearch(data);location.hash='investment-signals';applyResearchScreen();
                const text=document.getElementById('research-current-candidates').textContent;
                const rows=(data.currentResearch?.candidates||[]).flatMap(c=>Object.entries(c.detail?.ttm?.metrics||{}).filter(([k,v])=>v.status==='READY').map(([metric,v])=>({company:c.companyId,metric,value:v.value,rendered:text.includes(v.value.toLocaleString('ko-KR')+' USD')})));
                const fold=document.querySelector('[data-evidence-key="current:AAPL"]');if(fold)fold.open=true;
                await refreshSimpleResearch();
                const readiness=(data.currentResearch?.candidates||[]).map(c=>({company:c.companyId,confirmed:c.detail?.readiness?.confirmed||[],rendered:(c.detail?.readiness?.items||[]).filter(i=>i.status==='VERIFIED').every(i=>text.includes(i.label)),present:text.includes('자료 준비 요약')&&text.includes('다음에 필요한 자료')}));
                const valuations=(data.currentResearch?.candidates||[]).map(c=>({company:c.companyId,valuationDate:c.detail?.valuationReview?.evidence?.valuationDate,dateRendered:text.includes('평가 기준일 '+c.detail?.valuationReview?.evidence?.valuationDate),held:c.detail?.valuationReview?.marketCap===null,psrRendered:text.includes('PSR · 연구 보류')}));
                const observedShares=(data.currentResearch?.candidates||[]).map(c=>({company:c.companyId,share:c.detail?.observedShares?.[0]})).filter(r=>r.share).map(r=>({company:r.company,count:r.share.count,rendered:text.includes(r.share.count.toLocaleString('ko-KR')),unverified:r.share.shareClass==='UNVERIFIED'}));
                return {rows,valuations,readiness,observedShares,recommendationStatus:data.currentResearch?.recommendationStatus,foldPreserved:document.querySelector('[data-evidence-key="current:AAPL"]')?.open===true};
                """)
            evidence["tradeRecommendations"] = try await js("""
                await refreshTradeRecommendations();location.hash='trade-recommendations';applyResearchScreen();
                const api=await(await fetch('/api/v2/recommendations')).json();const text=document.getElementById('trade-cards').textContent;
                const rows=api.recommendations.map(r=>({company:r.companyId,action:r.action,rendered:text.includes(r.companyId)&&text.includes(tradeActionLabels[r.action])}));
                document.getElementById('trade-filter').value='SELL';document.getElementById('trade-filter').dispatchEvent(new Event('change'));
                const emptySell=document.getElementById('trade-cards').textContent.includes('이 상태에 해당하는 종목이 없습니다');
                document.getElementById('trade-filter').value='ALL';document.getElementById('trade-filter').dispatchEvent(new Event('change'));
                return {rows,emptySell,separate:!text.includes('가상 조건')&&document.getElementById('trade-examples').textContent.includes('실제 종목 아님'),orderBlocked:api.liveTradingEnabled===false&&api.policy.orderExecution===false,overflow:document.documentElement.scrollWidth>innerWidth};
                """)
            evidence["firstUse"] = try await js("""
                const guide=document.querySelector('.first-use-guide');guide.open=true;
                const rows=[];for(const link of guide.querySelectorAll('a')){link.click();await new Promise(r=>setTimeout(r,150));rows.push({id:link.hash.slice(1),active:document.getElementById(link.hash.slice(1)).classList.contains('screen-active')});}
                await refreshSimpleResearch();return {rows,foldPreserved:guide.open};
                """)
            evidence["workspace"] = try await js("""
                const api=await (await fetch('/api/v2/research/dashboard')).json();
                showCurrentCompany('NVDA');
                const selected=[...document.querySelectorAll('#research-current-candidates > article h3')].map(n=>n.textContent).join(' ');
                await refreshSimpleResearch();
                const retained=document.getElementById('research-candidate-search').value==='NVDA';
                document.getElementById('research-readiness-filter').value='TTM';
                document.getElementById('research-readiness-filter').dispatchEvent(new Event('change'));
                const empty=document.getElementById('research-current-candidates').textContent.includes('검색 조건에 맞는 후보가 없습니다');
                document.getElementById('research-filter-reset').click();
                const reset=document.getElementById('research-candidate-search').value==='';
                const report=document.getElementById('research-auto-stages').textContent;
                return {selected:selected.includes('NVDA')&&!selected.includes('Apple Inc.'),retained,empty,reset,report:!!api.automation?.runReport&&report.includes('최근 작업 보고')&&report.includes('회귀 테스트를 실행했다는 뜻은 아닙니다')};
                """)
            evidence["detail"] = try await js("""
                await loadCandidateDetail({ticker:'005930',market:'KR'});
                const folds=[...document.querySelectorAll('#candidate-detail details')];
                if(folds[0])folds[0].open=true;
                return {visible:!document.getElementById('candidate-detail').hidden,foldCount:folds.length,title:document.getElementById('candidate-detail-title')?.textContent,ttm:document.getElementById('candidate-detail').textContent.includes('TTM')};
                """)
            let rules = """
            [{"trigger":{"url-filter":".*api/v2/candidates/005930.*"},"action":{"type":"block"}}]
            """
            guard let list = try await WKContentRuleListStore.default().compileContentRuleList(forIdentifier: "kstock-local-qa", encodedContentRuleList: rules) else { throw NSError(domain: "KStockQA", code: 1) }
            web.configuration.userContentController.add(list)
            evidence["failure"] = try await js("""
                await loadCandidateDetail({ticker:'005930',market:'KR'});
                return {message:document.getElementById('candidate-detail-message').textContent,retained:!document.getElementById('candidate-detail').hidden,foldOpen:document.querySelector('#candidate-detail details')?.open};
                """)
            web.configuration.userContentController.remove(list)
            evidence["recovery"] = try await js("""
                await loadCandidateDetail({ticker:'005930',market:'KR'});
                return {message:document.getElementById('candidate-detail-message').textContent,foldOpen:document.querySelector('#candidate-detail details')?.open};
                """)
            evidence["largeText"] = try await js("""
                document.documentElement.style.fontSize='200%';
                return {overflow:document.documentElement.scrollWidth>innerWidth,buttonHeight:document.getElementById('candidate-detail-refresh').getBoundingClientRect().height};
                """)
            _ = try await js("document.documentElement.style.fontSize='';location.hash='overview';applyResearchScreen();return true;")
            evidence["accessibleControls"] = try await js("""
                const root=document.querySelector('.screen-active');
                return [...root.querySelectorAll('button,a')].filter(el=>el.getClientRects().length).map(el=>({name:(el.getAttribute('aria-label')||el.textContent||'').trim(),tag:el.tagName}));
                """)
            evidence["status"] = "EXECUTED"
        } catch {
            web.configuration.userContentController.removeAllContentRuleLists()
            evidence["status"] = "FAILED"
            evidence["error"] = String(describing: error)
        }
        if let data = try? JSONSerialization.data(withJSONObject: evidence, options: [.prettyPrinted, .sortedKeys]) {
            let path = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("qa-result.json")
            try? data.write(to: path, options: .atomic)
        }
    }
}
