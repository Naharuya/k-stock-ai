function parseCompactDate(value, label) {
  if (typeof value !== 'string' || !/^\d{8}$/.test(value)) {
    throw new TypeError(`${label} must use YYYYMMDD`);
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new TypeError(`${label} is not a valid date`);
  }
  return date;
}

function formatCompactDate(date) {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

export function splitDisclosureDateRange({ beginDate, endDate, maxWindows = 48 }) {
  if (!Number.isInteger(maxWindows) || maxWindows < 1 || maxWindows > 120) {
    throw new TypeError('maxWindows must be an integer between 1 and 120');
  }
  const begin = parseCompactDate(beginDate, 'beginDate');
  const end = parseCompactDate(endDate, 'endDate');
  if (begin > end) throw new RangeError('beginDate must be on or before endDate');

  const windows = [];
  let cursor = begin;
  while (cursor <= end) {
    if (windows.length >= maxWindows) {
      throw new RangeError(`disclosure date range exceeds ${maxWindows} monthly windows`);
    }

    const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
    const windowEnd = monthEnd < end ? monthEnd : end;
    windows.push({ beginDate: formatCompactDate(cursor), endDate: formatCompactDate(windowEnd) });
    cursor = new Date(windowEnd.getTime() + 24 * 60 * 60 * 1000);
  }

  return windows;
}

export function createOpenDartClient({ request }) {
  if (typeof request !== 'function') {
    throw new TypeError('OpenDART request function is required');
  }

  function assertSuccessfulResponse(response) {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid OpenDART response');
    }
    if (response.status && response.status !== '000') {
      const error = new Error(`OpenDART error: ${response.status}`);
      error.code = response.status;
      throw error;
    }
  }

  async function getFinancials({ corpCode, year, reportCode = '11011' }) {
    if (!corpCode || !year) throw new Error('corpCode and year are required');

    const response = await request({
      service: 'opendart',
      operation: 'financials',
      params: { corpCode, year, reportCode },
    });

    assertSuccessfulResponse(response);

    return {
      status: response.status ?? '000',
      items: Array.isArray(response.list) ? response.list : [],
    };
  }

  async function getDisclosures({ corpCode, beginDate, endDate, pageCount = 100, maxPages = 20 }) {
    if (!corpCode) throw new Error('corpCode is required');
    if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 100) {
      throw new TypeError('pageCount must be an integer between 1 and 100');
    }
    if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 20) {
      throw new TypeError('maxPages must be an integer between 1 and 20');
    }

    const windows = beginDate == null && endDate == null
      ? [{ beginDate, endDate }]
      : splitDisclosureDateRange({ beginDate, endDate, maxWindows: 48 });
    const windowResults = [];

    for (const window of windows) {
      windowResults.push(await fetchDisclosureWindow({
        corpCode,
        ...window,
        pageCount,
        maxPages,
      }));
    }

    const items = windowResults.flatMap((result) => result.items);
    const totalPages = windowResults.reduce((total, result) => total + result.totalPages, 0);
    const retrievedPages = windowResults.reduce((total, result) => total + result.retrievedPages, 0);
    const truncated = windowResults.some((result) => result.truncated);

    const seenReceiptNumbers = new Set();
    const uniqueItems = items.filter((item) => {
      const receiptNumber = item?.rcept_no;
      if (typeof receiptNumber !== 'string' || !receiptNumber) return true;
      if (seenReceiptNumbers.has(receiptNumber)) return false;
      seenReceiptNumbers.add(receiptNumber);
      return true;
    });

    return {
      status: items.length === 0 && windowResults.every((result) => result.status === '013') ? '013' : '000',
      items: uniqueItems,
      totalPages,
      retrievedPages,
      requestedWindows: windows.length,
      truncated,
    };
  }

  async function fetchDisclosureWindow({ corpCode, beginDate, endDate, pageCount, maxPages }) {
    const items = [];
    let totalPages = 1;
    let retrievedPages = 0;

    for (let pageNo = 1; pageNo <= Math.min(totalPages, maxPages); pageNo += 1) {
      const response = await request({
        service: 'opendart',
        operation: 'disclosures',
        params: { corpCode, beginDate, endDate, pageNo, pageCount },
      });

      if (response?.status === '013') {
        if (pageNo === 1) {
          return { status: response.status, items: [], totalPages: 0, retrievedPages: 0, truncated: false };
        }
        break;
      }

      assertSuccessfulResponse(response);
      retrievedPages += 1;
      if (Array.isArray(response.list)) items.push(...response.list);

      const responseTotalPages = Number(response.total_page);
      if (Number.isInteger(responseTotalPages) && responseTotalPages > 0) {
        totalPages = Math.max(pageNo, responseTotalPages);
      }
    }

    return {
      status: '000',
      items,
      totalPages,
      retrievedPages,
      truncated: totalPages > retrievedPages,
    };
  }

  return { getFinancials, getDisclosures };
}
