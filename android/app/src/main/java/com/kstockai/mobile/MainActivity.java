package com.kstockai.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.content.Context;
import android.net.Uri;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private static final String API_ROOT = "http://127.0.0.1:3002";
    private static final String API_URL = "http://127.0.0.1:3002/api/analyze";
    private static final String WATCHLIST_URL = "http://127.0.0.1:3002/api/watchlist";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private EditText symbolInput;
    private EditText nameInput;
    private EditText yearInput;
    private Button analyzeButton;
    private Button refreshReportsButton;
    private Button saveWatchlistButton;
    private LinearLayout reportList;
    private LinearLayout watchlistList;
    private TextView watchlistStatus;
    private TextView statusView;
    private TextView resultView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(19, 57, 64));
        getWindow().setNavigationBarColor(Color.rgb(19, 57, 64));
        getWindow().getDecorView().setSystemUiVisibility(0);
        setContentView(buildContent());
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (reportList != null) {
            loadRecentReports();
            loadWatchlist();
        }
    }

    private View buildContent() {
        int ink = Color.rgb(19, 57, 64);
        int muted = Color.rgb(91, 108, 110);
        int background = Color.rgb(244, 247, 244);
        int accent = Color.rgb(207, 91, 48);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(background);

        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setPadding(dp(22), dp(24), dp(22), dp(28));
        scroll.addView(page);

        TextView eyebrow = text("K-STOCK AI   /   RESEARCH", 12, muted);
        eyebrow.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        page.addView(eyebrow);

        TextView title = text("종목 분석", 29, ink);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        LinearLayout.LayoutParams titleParams = params(-1, -2);
        titleParams.topMargin = dp(8);
        page.addView(title, titleParams);

        statusView = text("Mac 서버 연결을 확인합니다", 14, muted);
        LinearLayout.LayoutParams statusParams = params(-1, -2);
        statusParams.topMargin = dp(8);
        page.addView(statusView, statusParams);

        symbolInput = input("종목코드", "005930", false);
        nameInput = input("종목명", "삼성전자", false);
        yearInput = input("재무연도", "2025", true);
        addField(page, "종목코드", symbolInput);
        addField(page, "종목명", nameInput);
        addField(page, "재무연도", yearInput);

        TextView watchlistTitle = text("관심종목  ·  최대 10개", 14, ink);
        watchlistTitle.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        LinearLayout.LayoutParams watchlistTitleParams = params(-1, -2);
        watchlistTitleParams.topMargin = dp(20);
        page.addView(watchlistTitle, watchlistTitleParams);

        watchlistStatus = text("관심종목을 불러오는 중입니다.", 12, muted);
        LinearLayout.LayoutParams watchlistStatusParams = params(-1, -2);
        watchlistStatusParams.topMargin = dp(6);
        page.addView(watchlistStatus, watchlistStatusParams);

        watchlistList = new LinearLayout(this);
        watchlistList.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams watchlistListParams = params(-1, -2);
        watchlistListParams.topMargin = dp(7);
        page.addView(watchlistList, watchlistListParams);

        saveWatchlistButton = new Button(this);
        saveWatchlistButton.setText("입력 종목을 관심종목에 추가");
        saveWatchlistButton.setTextColor(ink);
        saveWatchlistButton.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(221, 231, 226)));
        LinearLayout.LayoutParams saveWatchlistParams = params(-1, dp(46));
        saveWatchlistParams.topMargin = dp(7);
        page.addView(saveWatchlistButton, saveWatchlistParams);
        saveWatchlistButton.setOnClickListener(view -> addCurrentStockToWatchlist());

        analyzeButton = new Button(this);
        analyzeButton.setText("실데이터로 분석");
        analyzeButton.setTextColor(Color.WHITE);
        analyzeButton.setBackgroundTintList(android.content.res.ColorStateList.valueOf(accent));
        LinearLayout.LayoutParams buttonParams = params(-1, dp(54));
        buttonParams.topMargin = dp(18);
        page.addView(analyzeButton, buttonParams);
        analyzeButton.setOnClickListener(view -> submitAnalysis());

        TextView note = text("KIS · OpenDART · Mac 로컬 AI  |  읽기 전용", 12, muted);
        note.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams noteParams = params(-1, -2);
        noteParams.topMargin = dp(9);
        page.addView(note, noteParams);

        refreshReportsButton = new Button(this);
        refreshReportsButton.setText("최근 예약 분석 새로고침");
        refreshReportsButton.setTextColor(ink);
        refreshReportsButton.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(221, 231, 226)));
        LinearLayout.LayoutParams reportsButtonParams = params(-1, dp(48));
        reportsButtonParams.topMargin = dp(18);
        page.addView(refreshReportsButton, reportsButtonParams);
        refreshReportsButton.setOnClickListener(view -> loadRecentReports());

        reportList = new LinearLayout(this);
        reportList.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams reportListParams = params(-1, -2);
        reportListParams.topMargin = dp(8);
        page.addView(reportList, reportListParams);

        resultView = text("분석 결과가 여기에 표시됩니다.", 15, ink);
        resultView.setGravity(Gravity.TOP | Gravity.START);
        resultView.setPadding(dp(16), dp(16), dp(16), dp(18));
        resultView.setBackgroundColor(Color.WHITE);
        LinearLayout.LayoutParams resultParams = params(-1, -2);
        resultParams.topMargin = dp(20);
        page.addView(resultView, resultParams);

        return scroll;
    }

    private void addField(LinearLayout page, String label, EditText field) {
        TextView labelView = text(label, 13, Color.rgb(91, 108, 110));
        labelView.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        LinearLayout.LayoutParams labelParams = params(-1, -2);
        labelParams.topMargin = dp(16);
        page.addView(labelView, labelParams);
        LinearLayout.LayoutParams fieldParams = params(-1, dp(52));
        fieldParams.topMargin = dp(5);
        page.addView(field, fieldParams);
    }

    private EditText input(String hint, String value, boolean numeric) {
        EditText field = new EditText(this);
        field.setSingleLine(true);
        field.setTextSize(16);
        field.setHint(hint);
        field.setText(value);
        field.setPadding(dp(13), 0, dp(13), 0);
        field.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(183, 197, 195)));
        if (numeric) field.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        return field;
    }

    private void submitAnalysis() {
        final String symbol = symbolInput.getText().toString().trim();
        final String name = nameInput.getText().toString().trim();
        final String year = yearInput.getText().toString().trim();
        if (!symbol.matches("\\d{6}") || name.isEmpty() || !year.matches("\\d{4}")) {
            statusView.setText("종목코드 6자리, 종목명, 재무연도 4자리를 확인해 주세요.");
            return;
        }

        ((InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE))
                .hideSoftInputFromWindow(analyzeButton.getWindowToken(), 0);
        analyzeButton.setEnabled(false);
        statusView.setText("KIS·OpenDART 조회 후 로컬 AI가 분석 중입니다. 수 분 걸릴 수 있습니다.");
        resultView.setText("분석 중…");

        executor.execute(() -> {
            try {
                JSONObject result = requestAnalysis(symbol, name, year);
                runOnUiThread(() -> renderResult(result));
            } catch (Exception error) {
                runOnUiThread(() -> {
                    statusView.setText("연결 또는 분석에 실패했습니다.");
                    resultView.setText(error.getMessage() == null ? "Mac 서버 연결을 확인하세요." : error.getMessage());
                    analyzeButton.setEnabled(true);
                });
            }
        });
    }

    private JSONObject requestAnalysis(String symbol, String name, String year) throws Exception {
        JSONObject request = new JSONObject();
        request.put("symbol", symbol);
        request.put("name", name);
        request.put("year", year);
        JSONObject response = requestJson(API_URL, "POST", request, 600_000);
        if (!response.optBoolean("success")) {
            throw new IllegalStateException(response.optString("message", "API 요청이 실패했습니다."));
        }
        return response;
    }

    private JSONObject requestJson(String endpoint, String method, JSONObject body, int readTimeoutMs) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(10_000);
        connection.setReadTimeout(readTimeoutMs);
        if (body != null) {
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        }

        if (body != null) {
            try (OutputStream output = connection.getOutputStream()) {
                output.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
        }

        int status = connection.getResponseCode();
        InputStream stream = status >= 200 && status < 300
                ? connection.getInputStream()
                : connection.getErrorStream();
        StringBuilder responseText = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) responseText.append(line);
        } finally {
            connection.disconnect();
        }

        if (status < 200 || status >= 300) {
            JSONObject error = new JSONObject(responseText.toString());
            throw new IllegalStateException(error.optString("message", "API 요청이 실패했습니다."));
        }
        return new JSONObject(responseText.toString());
    }

    private void loadRecentReports() {
        refreshReportsButton.setEnabled(false);
        executor.execute(() -> {
            try {
                JSONObject response = requestJson(API_ROOT + "/api/reports?limit=10", "GET", null, 15_000);
                JSONArray reports = response.optJSONArray("reports");
                runOnUiThread(() -> showRecentReports(reports));
            } catch (Exception error) {
                runOnUiThread(() -> {
                    reportList.removeAllViews();
                    TextView unavailable = text("예약 분석 결과를 불러올 수 없습니다.", 13, Color.rgb(91, 108, 110));
                    reportList.addView(unavailable, params(-1, -2));
                    refreshReportsButton.setEnabled(true);
                });
            }
        });
    }

    private void loadWatchlist() {
        watchlistStatus.setText("관심종목을 불러오는 중입니다.");
        executor.execute(() -> {
            try {
                JSONObject response = requestJson(WATCHLIST_URL, "GET", null, 15_000);
                JSONArray stocks = response.optJSONArray("stocks");
                runOnUiThread(() -> showWatchlist(stocks));
            } catch (Exception error) {
                runOnUiThread(() -> watchlistStatus.setText("관심종목을 불러오지 못했습니다."));
            }
        });
    }

    private void showWatchlist(JSONArray stocks) {
        watchlistList.removeAllViews();
        int count = stocks == null ? 0 : stocks.length();
        watchlistStatus.setText(count + " / 10 종목  ·  항목을 누르면 삭제");
        for (int index = 0; index < count; index++) {
            JSONObject stock = stocks.optJSONObject(index);
            if (stock == null) continue;
            String symbol = stock.optString("symbol");
            String name = stock.optString("name");
            TextView row = text(symbol + "   ·   " + name, 14, Color.rgb(19, 57, 64));
            row.setPadding(dp(12), dp(9), dp(12), dp(9));
            row.setBackgroundColor(Color.WHITE);
            LinearLayout.LayoutParams rowParams = params(-1, -2);
            rowParams.bottomMargin = dp(4);
            watchlistList.addView(row, rowParams);
            row.setOnClickListener(view -> confirmRemoveStock(symbol, name, stocks));
        }
        saveWatchlistButton.setEnabled(true);
    }

    private void addCurrentStockToWatchlist() {
        String symbol = symbolInput.getText().toString().trim();
        String name = nameInput.getText().toString().trim();
        if (!symbol.matches("\\d{6}") || name.isEmpty()) {
            watchlistStatus.setText("종목코드 6자리와 종목명을 입력해 주세요.");
            return;
        }

        saveWatchlistButton.setEnabled(false);
        watchlistStatus.setText("관심종목을 저장하는 중입니다.");
        executor.execute(() -> {
            try {
                JSONObject current = requestJson(WATCHLIST_URL, "GET", null, 15_000);
                JSONArray previous = current.optJSONArray("stocks");
                JSONArray updated = new JSONArray();
                boolean replaced = false;
                if (previous != null) {
                    for (int index = 0; index < previous.length(); index++) {
                        JSONObject stock = previous.optJSONObject(index);
                        if (stock == null) continue;
                        if (symbol.equals(stock.optString("symbol"))) {
                            updated.put(new JSONObject().put("symbol", symbol).put("name", name));
                            replaced = true;
                        } else {
                            updated.put(stock);
                        }
                    }
                }
                if (!replaced) updated.put(new JSONObject().put("symbol", symbol).put("name", name));
                saveWatchlist(updated);
            } catch (Exception error) {
                runOnUiThread(() -> {
                    watchlistStatus.setText(error.getMessage() == null ? "저장하지 못했습니다." : error.getMessage());
                    saveWatchlistButton.setEnabled(true);
                });
            }
        });
    }

    private void confirmRemoveStock(String symbol, String name, JSONArray current) {
        new AlertDialog.Builder(this)
                .setTitle("관심종목 삭제")
                .setMessage(name + " (" + symbol + ")을 관심종목에서 삭제할까요?")
                .setNegativeButton("취소", null)
                .setPositiveButton("삭제", (dialog, which) -> {
                    JSONArray updated = new JSONArray();
                    for (int index = 0; index < current.length(); index++) {
                        JSONObject stock = current.optJSONObject(index);
                        if (stock != null && !symbol.equals(stock.optString("symbol"))) updated.put(stock);
                    }
                    saveWatchlistButton.setEnabled(false);
                    saveWatchlist(updated);
                })
                .show();
    }

    private void saveWatchlist(JSONArray stocks) {
        executor.execute(() -> {
            try {
                JSONObject body = new JSONObject().put("stocks", stocks);
                JSONObject response = requestJson(WATCHLIST_URL, "PUT", body, 15_000);
                runOnUiThread(() -> showWatchlist(response.optJSONArray("stocks")));
            } catch (Exception error) {
                runOnUiThread(() -> {
                    watchlistStatus.setText(error.getMessage() == null ? "저장하지 못했습니다." : error.getMessage());
                    saveWatchlistButton.setEnabled(true);
                });
            }
        });
    }

    private void showRecentReports(JSONArray reports) {
        reportList.removeAllViews();
        if (reports == null || reports.length() == 0) {
            statusView.setText("Mac 서버 연결됨  ·  예약 분석 결과 없음");
            TextView empty = text("저장된 예약 분석이 없습니다.", 13, Color.rgb(91, 108, 110));
            reportList.addView(empty, params(-1, -2));
            refreshReportsButton.setEnabled(true);
            return;
        }

        for (int index = 0; index < reports.length(); index++) {
            JSONObject report = reports.optJSONObject(index);
            if (report == null) continue;
            JSONObject summary = report.optJSONObject("summary");
            JSONArray results = report.optJSONArray("results");
            String completedAt = report.optString("completedAt", "").replace('T', ' ');
            if (completedAt.length() > 16) completedAt = completedAt.substring(0, 16);
            String title = completedAt + "  ·  "
                    + (summary == null ? 0 : summary.optInt("successful")) + "/"
                    + (summary == null ? 0 : summary.optInt("requested")) + " 성공";
            TextView row = text(title + "\n" + reportStatus(results), 14, Color.rgb(19, 57, 64));
            row.setPadding(dp(12), dp(10), dp(12), dp(10));
            row.setBackgroundColor(Color.WHITE);
            row.setOnClickListener(view -> loadReportDetail(report.optString("runId")));
            LinearLayout.LayoutParams rowParams = params(-1, -2);
            rowParams.bottomMargin = dp(6);
            reportList.addView(row, rowParams);
        }
        statusView.setText("Mac 서버 연결됨  ·  최근 예약 분석 " + reports.length() + "건");
        refreshReportsButton.setEnabled(true);
    }

    private String reportStatus(JSONArray results) {
        if (results == null || results.length() == 0) return "결과 없음";
        StringBuilder status = new StringBuilder();
        for (int index = 0; index < results.length(); index++) {
            JSONObject item = results.optJSONObject(index);
            if (item == null) continue;
            if (status.length() > 0) status.append("   ·   ");
            status.append(item.optString("name", item.optString("symbol")))
                    .append(' ')
                    .append(item.optString("committeeStatus", item.optBoolean("success") ? "완료" : "실패"));
        }
        return status.toString();
    }

    private void loadReportDetail(String runId) {
        statusView.setText("예약 분석 결과를 여는 중입니다.");
        executor.execute(() -> {
            try {
                JSONObject response = requestJson(API_ROOT + "/api/reports/" + Uri.encode(runId), "GET", null, 15_000);
                runOnUiThread(() -> renderScheduledReport(response.optJSONObject("report")));
            } catch (Exception error) {
                runOnUiThread(() -> statusView.setText("보고서를 불러오지 못했습니다."));
            }
        });
    }

    private void renderScheduledReport(JSONObject report) {
        if (report == null) {
            statusView.setText("보고서가 비어 있습니다.");
            return;
        }
        JSONArray results = report.optJSONArray("results");
        statusView.setText("예약 분석  ·  " + report.optString("mode", "local"));
        StringBuilder detail = new StringBuilder();
        if (results != null) {
            for (int index = 0; index < results.length(); index++) {
                JSONObject item = results.optJSONObject(index);
                if (item == null) continue;
                if (detail.length() > 0) detail.append("\n\n────────────\n\n");
                detail.append(item.optString("name", item.optString("symbol"))).append(" ( ")
                        .append(item.optString("symbol")).append(" )\n");
                if (!item.optBoolean("success")) {
                    detail.append("실패  ·  ").append(item.optString("error", "원인 확인 필요"));
                    continue;
                }
                detail.append("종합  ").append(item.optString("committeeStatus", "확인 필요"))
                    .append("  ·  ").append(formatScore(item, "totalScore")).append(" / 100\n")
                        .append("기업 점수  ").append(item.optInt("companyScore"))
                        .append("  ·  위험도  ").append(item.optString("riskLevel", "확인 필요"))
                        .append("  ·  중요 공시  ").append(item.optBoolean("importantDisclosure") ? "검토 필요" : "없음");
                if (item.optBoolean("riskOverride")) detail.append("\nRisk Hard Stop 적용");
                if (!item.optBoolean("dataValid", true)) detail.append("\n데이터 품질 검증 실패");
                if (item.optBoolean("disclosureTruncated")) detail.append("\n공시 조회 일부 잘림: 전체 확인 필요");
            }
        }
        String message = detail.length() == 0 ? "보고서에 표시할 결과가 없습니다." : detail.toString();
        resultView.setText(message);
        new AlertDialog.Builder(this)
                .setTitle("예약 분석 결과")
                .setMessage(message)
                .setPositiveButton("닫기", null)
                .show();
    }

    private String formatScore(JSONObject item, String key) {
        Object value = item.opt(key);
        if (!(value instanceof Number)) return "미산출";
        return String.valueOf(((Number) value).intValue());
    }

    private void renderResult(JSONObject response) {
        JSONObject result = response.optJSONObject("result");
        JSONObject committee = result == null ? null : result.optJSONObject("committee");
        JSONObject agents = result == null ? null : result.optJSONObject("agents");
        JSONObject company = agents == null ? null : agents.optJSONObject("company");
        JSONObject risk = agents == null ? null : agents.optJSONObject("risk");
        JSONObject dart = agents == null ? null : agents.optJSONObject("dart");

        String status = committee == null ? "결과 없음" : committee.optString("status", "결과 없음");
        statusView.setText("분석 완료  ·  " + status + "  ·  " + (result == null ? "" : result.optString("mode")));

        StringBuilder text = new StringBuilder();
        if (company != null) text.append("기업 점수  ").append(company.optInt("score", 0)).append(" / 100\n");
        if (risk != null) text.append("위험도  ").append(risk.optString("riskLevel", "확인 필요")).append("\n");
        if (dart != null) text.append("중요 공시  ").append(dart.optBoolean("important") ? "검토 필요" : "특이사항 없음").append("\n");
        if (committee != null) {
            text.append("\n종합  ").append(committee.optInt("totalScore", 0)).append(" / 100\n");
            text.append(committee.optString("summary", ""));
            appendList(text, "\n\n긍정", committee.optJSONArray("positiveReasons"));
            appendList(text, "\n부정", committee.optJSONArray("negativeReasons"));
            appendList(text, "\n위험", committee.optJSONArray("risks"));
            if (committee.optBoolean("riskOverride")) {
                text.append("\n\nRisk Hard Stop  ·  ").append(committee.optString("riskOverrideReason"));
            }
        }
        resultView.setText(text.toString());
        analyzeButton.setEnabled(true);
    }

    private void appendList(StringBuilder target, String title, JSONArray items) {
        if (items == null || items.length() == 0) return;
        target.append(title).append('\n');
        for (int index = 0; index < items.length(); index++) {
            target.append("• ").append(items.optString(index)).append('\n');
        }
    }

    private TextView text(String value, int size, int color) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        return view;
    }

    private LinearLayout.LayoutParams params(int width, int height) {
        return new LinearLayout.LayoutParams(width, height);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }
}