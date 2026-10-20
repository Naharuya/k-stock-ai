import XCTest

@MainActor
final class KStockUITests: XCTestCase {
    var app: XCUIApplication!
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
        // Only dismiss the known VoiceOver tutorial, never permission/auth dialogs.
        let system = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        if system.staticTexts["VoiceOver 제스처"].exists && system.buttons["확인"].exists {
            system.buttons["확인"].tap()
        }
        let status = app.staticTexts["kstock.connection.status"]
        XCTAssertTrue(status.waitForExistence(timeout: 10))
        expectation(for: NSPredicate(format: "label CONTAINS %@", "화면 연결됨"), evaluatedWith: status)
        waitForExpectations(timeout: 30)
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 10))
    }
    override func tearDownWithError() throws {
        XCUIDevice.shared.orientation = .portrait
        app.terminate()
    }
    func testReconnectButtonAndHome() throws {
        let retry = app.buttons["kstock.connection.retry"]
        XCTAssertTrue(retry.isHittable)
        XCTAssertGreaterThanOrEqual(retry.frame.height, 44)
        retry.tap()
        let status = app.staticTexts["kstock.connection.status"]
        expectation(for: NSPredicate(format: "label CONTAINS %@", "화면 연결됨"), evaluatedWith: status)
        waitForExpectations(timeout: 30)
        XCTAssertTrue(app.buttons["전체 메뉴"].waitForExistence(timeout: 15))
    }
    func testLandscapeMenuNavigation() throws {
        XCUIDevice.shared.orientation = .landscapeLeft
        expectation(for: NSPredicate { _, _ in
            let frame = self.app.frame
            return frame.width > frame.height
        }, evaluatedWith: app)
        waitForExpectations(timeout: 10)
        let menu = app.buttons["전체 메뉴"]
        XCTAssertTrue(menu.waitForExistence(timeout: 15))
        XCTAssertTrue(menu.isHittable)
        menu.tap()
        let stock = app.links["종목 분석"].firstMatch
        XCTAssertTrue(stock.waitForExistence(timeout: 5))
        stock.tap()
        XCTAssertTrue(app.staticTexts["종목 상세 분석"].waitForExistence(timeout: 5))
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = "landscape-stock-navigation"
        shot.lifetime = .keepAlways
        add(shot)
    }
    func testAccessibleElementDescriptions() throws {
        try app.performAccessibilityAudit(for: [.sufficientElementDescription])
    }
}

@MainActor
final class KStockVoiceOverUITests: XCTestCase {
    func testVoiceOverMenuAndStockActivation() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["--voiceover-ui-test"]
        app.launch()
        defer { app.terminate() }
        let status = app.staticTexts["kstock.connection.status"]
        XCTAssertTrue(status.waitForExistence(timeout: 10))
        expectation(for: NSPredicate(format: "value == %@", "VOICEOVER_ENABLED"), evaluatedWith: status)
        waitForExpectations(timeout: 30)
        let menu = app.buttons["전체 메뉴"]
        XCTAssertTrue(menu.waitForExistence(timeout: 15))
        menu.tap()
        let stock = app.links["종목 분석"].firstMatch
        if !stock.isHittable { menu.doubleTap() }
        XCTAssertTrue(stock.isHittable)
        stock.tap()
        let title = app.staticTexts["종목 상세 분석"]
        if !title.waitForExistence(timeout: 2) { stock.doubleTap() }
        XCTAssertTrue(title.waitForExistence(timeout: 5))
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = "voiceover-stock-navigation"
        shot.lifetime = .keepAlways
        add(shot)
    }
}
