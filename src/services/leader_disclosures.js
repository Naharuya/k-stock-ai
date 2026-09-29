import { XMLParser } from "fast-xml-parser";

const BERKSHIRE_CIK = "0001067983";
const SUBMISSIONS_URL = `https://data.sec.gov/submissions/CIK${BERKSHIRE_CIK}.json`;
const SEC_COMPANY_URL = `https://www.sec.gov/Archives/edgar/data/${Number(BERKSHIRE_CIK)}`;
const CACHE_DURATION_MS = 10 * 60 * 1000;
const xmlParser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  removeNSPrefix: true,
  trimValues: true,
});

export function createLeaderDisclosureService({
  request = globalThis.fetch,
  now = () => Date.now(),
  userAgent = "K-Stock AI personal research dashboard",
} = {}) {
  let cache;
  let portfolioCache;

  async function requestSec(url, accept) {
    const response = await request(url, {
      headers: {
        Accept: accept,
        "User-Agent": userAgent,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response?.ok) {
      throw new Error(`SEC request failed: ${response?.status ?? "invalid response"}`);
    }
    return response;
  }

  return {
    async getBerkshireFilings() {
      if (cache && cache.expiresAt > now()) return cache.value;

      const response = await requestSec(SUBMISSIONS_URL, "application/json");
      const data = await response.json();
      const recent = data?.filings?.recent;
      const fields = ["form", "filingDate", "reportDate", "accessionNumber", "primaryDocument"];
      if (!recent || fields.some((field) => !Array.isArray(recent[field]))) {
        throw new Error("SEC submissions response is missing filing fields");
      }

      const filings = recent.form
        .map((form, index) => ({
          form,
          filingDate: recent.filingDate[index],
          reportDate: recent.reportDate[index],
          accessionNumber: recent.accessionNumber[index],
          primaryDocument: recent.primaryDocument[index],
        }))
        .filter((filing) => ["13F-HR", "13F-HR/A"].includes(filing.form))
        .slice(0, 8)
        .map((filing) => {
          const accessionPath = filing.accessionNumber.replaceAll("-", "");
          return {
            ...filing,
            url: `${SEC_COMPANY_URL}/${accessionPath}/${filing.primaryDocument}`,
          };
        });

      const value = {
        subject: "Berkshire Hathaway investment manager filings",
        cik: BERKSHIRE_CIK,
        source: "SEC EDGAR",
        sourceUrl: "https://www.sec.gov/edgar/search/",
        checkedAt: new Date(now()).toISOString(),
        filings,
      };

      cache = { value, expiresAt: now() + CACHE_DURATION_MS };
      return value;
    },

    async getBerkshirePortfolio() {
      if (portfolioCache && portfolioCache.expiresAt > now()) return portfolioCache.value;

      const filings = await this.getBerkshireFilings();
      const latest = filings.filings[0];
      if (!latest) throw new Error("SEC has no public Berkshire 13F filing");

      const accessionPath = latest.accessionNumber.replaceAll("-", "");
      const filingDirectory = `${SEC_COMPANY_URL}/${accessionPath}`;
      const indexResponse = await requestSec(`${filingDirectory}/index.json`, "application/json");
      const index = await indexResponse.json();
      const documents = index?.directory?.item;
      if (!Array.isArray(documents)) throw new Error("SEC filing index is malformed");

      const informationTable = documents.find(
        (item) => /^[\w.-]+\.xml$/i.test(item.name) && !/^primary_doc\.xml$/i.test(item.name),
      );
      if (!informationTable) throw new Error("SEC filing has no public information table");

      const tableResponse = await requestSec(
        `${filingDirectory}/${informationTable.name}`,
        "application/xml, text/xml",
      );
      const parsed = xmlParser.parse(await tableResponse.text());
      const entries = parsed?.informationTable?.infoTable;
      if (!entries) throw new Error("SEC information table is empty or malformed");

      const holdings = (Array.isArray(entries) ? entries : [entries])
        .map((entry) => ({
          issuer: entry.nameOfIssuer,
          securityClass: entry.titleOfClass,
          cusip: entry.cusip,
          valueUsd: Number(entry.value),
          shares: Number(entry.shrsOrPrnAmt?.sshPrnamt),
          shareType: entry.shrsOrPrnAmt?.sshPrnamtType,
          putCall: entry.putCall || "",
        }))
        .filter((holding) =>
          holding.issuer && holding.cusip && Number.isFinite(holding.valueUsd) && Number.isFinite(holding.shares),
        )
        .sort((left, right) => right.valueUsd - left.valueUsd);

      const value = {
        subject: filings.subject,
        quarterEnd: latest.reportDate,
        filingDate: latest.filingDate,
        form: latest.form,
        source: filings.source,
        checkedAt: new Date(now()).toISOString(),
        holdingsUrl: `${filingDirectory}/index.json`,
        holdings,
      };

      portfolioCache = { value, expiresAt: now() + CACHE_DURATION_MS };
      return value;
    },
  };
}