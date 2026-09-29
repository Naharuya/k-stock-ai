import assert from "node:assert/strict";
import { test } from "node:test";
import { createLeaderDisclosureService } from "../src/services/leader_disclosures.js";

function makeSubmissions() {
  return {
    filings: {
      recent: {
        form: ["4", "13F-HR", "13F-HR/A"],
        filingDate: ["2026-09-25", "2026-08-14", "2026-05-15"],
        reportDate: ["", "2026-06-30", "2026-03-31"],
        accessionNumber: [
          "0001193125-26-403089",
          "0001193125-26-352200",
          "0001193125-26-207021",
        ],
        primaryDocument: ["ownership.xml", "holdings.xml", "amendment.xml"],
      },
    },
  };
}

test("SEC service returns Berkshire 13F filings with original filing links", async () => {
  const service = createLeaderDisclosureService({
    request: async (url, options) => {
      assert.equal(url, "https://data.sec.gov/submissions/CIK0001067983.json");
      assert.match(options.headers["User-Agent"], /K-Stock AI/);
      return { ok: true, json: async () => makeSubmissions() };
    },
    now: () => Date.parse("2026-09-29T00:00:00.000Z"),
  });

  const result = await service.getBerkshireFilings();
  assert.equal(result.filings.length, 2);
  assert.equal(result.filings[0].reportDate, "2026-06-30");
  assert.equal(
    result.filings[0].url,
    "https://www.sec.gov/Archives/edgar/data/1067983/000119312526352200/holdings.xml",
  );
  assert.equal(result.checkedAt, "2026-09-29T00:00:00.000Z");
});

test("SEC service caches results for ten minutes", async () => {
  let calls = 0;
  let timestamp = 0;
  const service = createLeaderDisclosureService({
    request: async () => {
      calls += 1;
      return { ok: true, json: async () => makeSubmissions() };
    },
    now: () => timestamp,
  });

  await service.getBerkshireFilings();
  await service.getBerkshireFilings();
  assert.equal(calls, 1);

  timestamp = 10 * 60 * 1000;
  await service.getBerkshireFilings();
  assert.equal(calls, 2);
});

test("SEC service rejects failed and malformed responses", async () => {
  const failed = createLeaderDisclosureService({
    request: async () => ({ ok: false, status: 503 }),
  });
  await assert.rejects(failed.getBerkshireFilings(), /SEC request failed: 503/);

  const malformed = createLeaderDisclosureService({
    request: async () => ({ ok: true, json: async () => ({ filings: { recent: {} } }) }),
  });
  await assert.rejects(malformed.getBerkshireFilings(), /missing filing fields/);
});

test("SEC service parses holdings from the latest 13F XML table", async () => {
  const calls = [];
  const service = createLeaderDisclosureService({
    request: async (url) => {
      calls.push(url);
      if (url.endsWith("submissions/CIK0001067983.json")) {
        return { ok: true, json: async () => makeSubmissions() };
      }
      if (url.endsWith("index.json")) {
        return {
          ok: true,
          json: async () => ({
            directory: {
              item: [
                { name: "primary_doc.xml" },
                { name: "56757.xml" },
              ],
            },
          }),
        };
      }
      return {
        ok: true,
        text: async () => `
          <informationTable xmlns="https://www.sec.gov/example">
            <infoTable>
              <nameOfIssuer>Example Corp</nameOfIssuer>
              <titleOfClass>COM</titleOfClass>
              <cusip>123456789</cusip>
              <value>2500000</value>
              <shrsOrPrnAmt><sshPrnamt>50000</sshPrnamt><sshPrnamtType>SH</sshPrnamtType></shrsOrPrnAmt>
            </infoTable>
            <infoTable>
              <nameOfIssuer>Another Inc</nameOfIssuer>
              <titleOfClass>COM</titleOfClass>
              <cusip>987654321</cusip>
              <value>9000000</value>
              <shrsOrPrnAmt><sshPrnamt>90000</sshPrnamt><sshPrnamtType>SH</sshPrnamtType></shrsOrPrnAmt>
            </infoTable>
          </informationTable>`,
      };
    },
    now: () => Date.parse("2026-09-29T00:00:00.000Z"),
  });

  const portfolio = await service.getBerkshirePortfolio();
  assert.equal(portfolio.quarterEnd, "2026-06-30");
  assert.equal(portfolio.filingDate, "2026-08-14");
  assert.equal(portfolio.holdings.length, 2);
  assert.equal(portfolio.holdings[0].issuer, "Another Inc");
  assert.equal(portfolio.holdings[0].valueUsd, 9000000);
  assert.equal(portfolio.holdings[1].shares, 50000);
  assert.equal(calls.length, 3);
  assert.match(portfolio.holdingsUrl, /index\.json$/);
});