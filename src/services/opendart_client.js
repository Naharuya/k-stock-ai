export function createOpenDartClient({ request }) {
  if (typeof request !== 'function') {
    throw new TypeError('OpenDART request function is required');
  }

  async function getFinancials({ corpCode, year, reportCode = '11011' }) {
    if (!corpCode || !year) throw new Error('corpCode and year are required');

    const response = await request({
      service: 'opendart',
      operation: 'financials',
      params: { corpCode, year, reportCode },
    });

    if (!response || typeof response !== 'object') {
      throw new Error('Invalid OpenDART response');
    }
    if (response.status && response.status !== '000') {
      throw new Error(`OpenDART error: ${response.status}`);
    }

    return {
      status: response.status ?? '000',
      items: Array.isArray(response.list) ? response.list : [],
    };
  }

  async function getDisclosures({ corpCode, beginDate, endDate }) {
    if (!corpCode) throw new Error('corpCode is required');

    const response = await request({
      service: 'opendart',
      operation: 'disclosures',
      params: { corpCode, beginDate, endDate },
    });

    if (!response || typeof response !== 'object') {
      throw new Error('Invalid OpenDART response');
    }
    if (response.status && response.status !== '000') {
      throw new Error(`OpenDART error: ${response.status}`);
    }

    return {
      status: response.status ?? '000',
      items: Array.isArray(response.list) ? response.list : [],
    };
  }

  return { getFinancials, getDisclosures };
}
