import "dotenv/config";
import { getCompanyByStockCode } from "./services/dart_service.js";

try {
  const result = await getCompanyByStockCode("005930");

  console.log(JSON.stringify({
    ok: true,
    stockCode: result.mapping.stockCode,
    corpCode: result.mapping.corpCode,
    corpName: result.company.corp_name,
    marketClass: result.company.corp_cls,
    ceo: result.company.ceo_nm,
    fiscalMonth: result.company.acc_mt,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    message: error.message,
    dartStatus: error.dartStatus || null,
  }, null, 2));

  process.exitCode = 1;
}
