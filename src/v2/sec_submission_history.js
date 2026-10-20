function validDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text || '') || !Number.isFinite(Date.parse(text)) || new Date(text).toISOString().slice(0, 10) !== text) throw new Error('Invalid SEC history date');
  return text;
}
function rows(data) {
  if (!data || !Array.isArray(data.form) || ['accessionNumber', 'primaryDocument', 'filingDate'].some(k => !Array.isArray(data[k]) || data[k].length !== data.form.length)) throw new Error('Invalid SEC submissions');
  return data.form.map((form, i) => ({ form, accessionNumber: data.accessionNumber[i], primaryDocument: data.primaryDocument[i], filingDate: validDate(data.filingDate[i]) }));
}
export async function loadSubmissionHistory({ request, cik, windowStart, windowEnd, maxFiles = 3 }) {
  validDate(windowStart);
  validDate(windowEnd);
  if (!/^\d{10}$/.test(cik) || !Number.isInteger(maxFiles) || maxFiles < 0 || windowStart > windowEnd) throw new Error('Invalid SEC history query');
  const data = await (await request(`https://data.sec.gov/submissions/CIK${cik}.json`, 'application/json')).json();
  const all = rows(data?.filings?.recent);
  const files = data?.filings?.files ?? [];
  if (!Array.isArray(files)) throw new Error('Invalid SEC history file list');
  const selected = new Map();
  for (const file of files) {
    if (!file || !new RegExp(`^CIK${cik}-submissions-\\d{3,}\\.json$`).test(file.name || '')) throw new Error('Invalid SEC history filename');
    const from = validDate(file.filingFrom), to = validDate(file.filingTo);
    if (from > to) throw new Error('Invalid SEC history range');
    if (from <= windowEnd && to >= windowStart) selected.set(file.name, file);
  }
  if (selected.size > maxFiles) throw new Error('SEC history file limit exceeded; coverage incomplete');
  let historyFilesRead = 0;
  for (const file of selected.values()) {
    const history = await (await request(`https://data.sec.gov/submissions/${file.name}`, 'application/json')).json();
    all.push(...rows(history));
    historyFilesRead++;
  }
  const unique = new Map();
  for (const row of all) {
    if (row.filingDate < windowStart || row.filingDate > windowEnd) continue;
    if (!/^\d{10}-\d{2}-\d{6}$/.test(row.accessionNumber || '')) throw new Error('Invalid SEC accession');
    const previous = unique.get(row.accessionNumber);
    if (previous && JSON.stringify(previous) !== JSON.stringify(row)) throw new Error('Conflicting SEC history records');
    unique.set(row.accessionNumber, row);
  }
  return { filings: [...unique.values()], historyFilesRead, coverage: 'SUBMISSION_DATE_WINDOW' };
}
