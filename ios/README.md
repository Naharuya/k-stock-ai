# K-Stock iOS local validation

UIKit + WKWebView local validation app. It displays the same local Web/API as Android and Safari. Simulator and explicit existing-profile device builds are separate; neither is an App Store release.

Requirements: Apple silicon Mac, existing Xcode/iOS Simulator, K-Stock server already available at `http://localhost:3000`. No dependencies are downloaded and no Apple account, provisioning profile or secret is used. The local-only ATS exception is not a production networking policy.

```sh
python3 ios/build-simulator.py
xcrun simctl install <SIMULATOR_UDID> ios/build/KStockLocal.app
xcrun simctl launch <SIMULATOR_UDID> ai.kstock.ios.localvalidation
```

Run WebKit integration checks with `--qa` on a fresh app launch. If the app is running, terminate **only** `ai.kstock.ios.localvalidation` first. Do not uninstall or clear user data.

```sh
xcrun simctl terminate <SIMULATOR_UDID> ai.kstock.ios.localvalidation
xcrun simctl launch <SIMULATOR_UDID> ai.kstock.ios.localvalidation --qa
python3 ios/verify-result.py <SIMULATOR_UDID> data/v2/verification/ios-result.json
```

Wait for `Documents/qa-result.json` before verification. The verifier rejects receipts older than ten minutes. The QA harness uses the actual local API and a temporary WebKit content rule to block the Samsung detail request; it removes that rule on success or error. It checks six screens, detail/TTM visibility, stale-data retention, recovery/fold state and 200% Web text. `EXECUTED` alone does not mean PASS; the verifier evaluates assertions separately.

The native header describes document loading only. API status and stale-data warnings remain in the Web screen. No credential entry/storage or native order bridge is added. External HTTPS evidence opens only from an explicit user link. Other top-level origins/schemes are blocked. WebKit standard website data persists across restarts; navigation selections remain tab memory and are not promised to survive process termination.

Remaining: production HTTPS endpoint/authentication design and signed release target, app icon/assets, complete VoiceOver reading-order/gesture and physical-device follow-up QA, privacy/store declarations matching the final implementation. Do not use the simulator app as a production release.

## Physical-device local validation

`build-device.py` is an explicit development-only path. It uses exactly one **existing**, unexpired wildcard/K-Stock provisioning profile containing the selected device, and a matching existing signing identity. It refuses missing/ambiguous profiles and never creates profiles, registers devices or changes Apple accounts. The standard simulator build remains independent.

```sh
python3 ios/build-device.py --device <IPHONE_UDID> --url http://<PRIVATE_MAC_IPV4>:3104/
xcrun devicectl device install app --device <IPHONE_UDID> ios/build/device/KStockLocal.app
```

The physical device cannot reach the Mac via `localhost`. `validation-relay.mjs` prepares a 15-minute LAN preview, bound to one explicit private IPv4 address, port3104. It forwards only a small GET allowlist of public research views to fixed loopback port3000; account/watchlist/order paths and every write method are denied. Incoming authentication/cookies are never forwarded. The app may request iOS Local Network permission, which requires the device user.

**LAN authorization history:** automatic review initially rejected the relay because endpoint/payload consent was not explicit. The user subsequently approved the stated 15-minute preview at `192.168.0.16:3104`, and the relay was started for that validation only. Account/watchlist/write requests remain blocked. Do not broaden this approval to a permanent service, other addresses, production deployment or other data. Installation success is separate from connection success; a locked physical device still requires its owner to unlock it.

`node --test ios/relay.test.mjs` checks the relay boundaries without starting a LAN server. Signed device artifacts and profile/entitlement copies remain in ignored `ios/build/` and must never be committed. Production HTTPS/authentication and App Store setup remain separate work.


Physical iPhone15 validation on 2026-10-19 succeeded after the owner unlocked the device: six WebKit screens, real Samsung detail/TTM, temporary request-block failure retention, recovery/fold state, and 200% Web text. This is not a full VoiceOver gesture or all-fields financial audit. The approved LAN relay was shut down after validation; the installed app therefore does not have a permanent server connection.

A receipt copied from the physical app container can be checked without treating it as a simulator receipt:

```sh
python3 ios/verify-result.py <IPHONE_UDID> data/v2/verification/ios-physical.json --receipt <COPIED_QA_JSON>
```

The verifier requires physicalDevice=true and a recent checkedAt for copied physical receipts. The relay accepts an optional maximum-duration argument in seconds (1–900) so a resumed validation cannot exceed the remaining approved exposure budget. Expiry/termination closes active preview connections too.

## Reproducible Xcode UI tests

Open `ios/KStockLocal.xcodeproj` for the simulator-only product and UI test target. It has no Apple team, account changes, downloads or LAN listener. Keep the existing K-Stock loopback server at port3000 available.

```sh
python3 ios/run-ui-tests.py <SIMULATOR_UDID>
python3 ios/run-ui-tests.py <SIMULATOR_UDID> --voiceover
```

The regular scheme runs three actual UI tests: reconnect-button activation/44pt height, landscape menu→stock navigation, and Apple's sufficient-element-description accessibility audit. The VoiceOver scheme runs one separate menu→stock activation test and verifies VoiceOver is enabled inside the app. These checks do **not** certify every spoken label, reading order, gesture or financial field.

The runner reads the original VoiceOver state, sets the requested test state, and restores/queries it in `finally`. UI tests return orientation to portrait. It rejects zero/skipped/unexpected test counts even when xcodebuild returns0. Unique `ios/build/ui-*/` directories retain xcresult bundles, logs and executed receipts; source code and shared schemes stay outside the ignored build directory. A known VoiceOver tutorial may be dismissed by exact title/button matching; authentication and permission prompts are not accepted automatically.

This simulator Xcode target does not replace the separate signed physical-device validation build or production release/signing setup. Test runs terminate only the K-Stock test app. Existing physical-device installations are not automatically updated.

## Fixed HTTPS review target

`python3 ios/build-https-preview.py` builds a separately identified simulator app (`ai.kstock.ios.httpspreview`). `--device` builds an **unsigned** device artifact only; it does not obtain a profile, create an account, install on a phone or create an App Store archive.

This mode fixes the start page to `https://kstock.ai.kr/`, has no ATS/HTTP exception, uses a nonpersistent WKWebView data store and blocks other top-level origins. HTTPS evidence leaves the app only after an explicit user link, and URLs containing credentials are rejected. Authentication uses the existing Web screen's memory-only token entry; there is no native persistent credential store or token automatically injected into requests. Valid-token authentication and session expiration still need a dedicated check before release.

The local validation target and its data remain separate. Fixture QA launch arguments are disabled in the HTTPS preview. To collect a read-only connection receipt in the simulator, launch the preview with `--https-preview-check`: it records HTTPS origin, secure-context status, nonpersistent storage and the unauthenticated candidates API response in `Documents/https-preview-check.json`. No token or order request is sent. A valid connection should report API401; a page load alone is not authentication success.

Foundation policy checks: `swiftc -module-cache-path /tmp/kstock-swift-policy-cache ios/ServerPolicy.swift ios/ServerPolicyTests.swift -o /tmp/kstock-ios-server-policy-tests` then run the resulting executable. This covers HTTP, wrong hosts/ports, credential URLs, query/fragment start pages, same-origin navigation and explicit external HTTPS links. Local builders and the Xcode project include the shared policy source.

The bounded runner `python3 ios/run-https-preview-check.py <SIMULATOR_UDID>` installs the already-built, separately identified preview app, launches its explicit check and terminates only that preview app afterward. Each simctl command has a timeout; it never resets Simulator or removes app data. Results live under ignored `ios/build/https-check-*/receipt.json`. The verifier requires a fresh (≤10 minutes), error-free receipt, HTTPS origin, secure context, nonpersistent storage and anonymous API401. Missing/old/future receipts and API200/403 do not count as PASS. Run verifier tests with `python3 ios/verify_https_preview_test.py`. This check confirms unauthenticated rejection, not successful login or session expiration.

2026-10-20 follow-up: connection-only checks initially passed, but the deployed `/` was JSON and the three static assets were404. The native preview now rejects non-HTML/non200 main-frame responses and keeps a specific missing-Web-deployment message. The verifier also requires the real paper-portfolio element and performance function (`appShellReady`); HTTPS+401 alone no longer passes. A missing shell returns `BLOCKED_WEB_ASSETS_NOT_DEPLOYED`, not a successful app launch. The read-only `node scripts/verify-web-release.mjs` checks root HTML, app.js, paper-backup.js and styles.css before a deploy can be called verified. Existing deploy verification calls this check after health/auth/trading checks. No production deployment was performed during this diagnostic work.
