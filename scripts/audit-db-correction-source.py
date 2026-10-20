#!/usr/bin/env python3
"""Offline source-only reconciliation; never repairs or estimates source numbers."""
import hashlib, html, json, re, zipfile
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'data/v2/verification/db-correction-1791783200385'

def source_cells(table):
    occupied = {}
    cells = {}
    for row, block in enumerate(re.findall(r'<TR\b[^>]*>(.*?)</TR>', table, re.I | re.S)):
        col = 0
        for match in re.finditer(r'<(?:TD|TH|TE)\b([^>]*)>(.*?)</(?:TD|TH|TE)>', block, re.I | re.S):
            while (row, col) in occupied:
                col += 1
            attrs, content = match.groups()
            def span(name):
                found = re.search(name + r'\s*=\s*["\']?(\d+)', attrs, re.I)
                return int(found.group(1)) if found else 1
            text = html.unescape(re.sub(r'<[^>]+>', '', content)).strip()
            cells[(row, col)] = text
            for rr in range(row, row + span('ROWSPAN')):
                for cc in range(col, col + span('COLSPAN')):
                    occupied[(rr, cc)] = True
            col += span('COLSPAN')
    return cells

def build():
    audit = json.loads((BASE / 'numeric-audit.json').read_text())
    sources = {}
    hashes = {}
    for key, receipt in [('before', audit['originalReceipt']), ('after', audit['correctionReceipt'])]:
        archive = BASE / (receipt + '.zip')
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        if digest != audit['sourceArchiveHashes'][receipt]:
            raise ValueError('Source archive hash mismatch')
        hashes[receipt] = digest
        with zipfile.ZipFile(archive) as z:
            xml = z.read(receipt + '.xml').decode('utf-8')
        sources[key] = re.findall(r'<TABLE\b[^>]*>.*?</TABLE>', xml, re.I | re.S)
    discrepancies = []
    checked = 0
    for table in audit['tables']:
        parsed = {stage: source_cells(sources[stage][table['originalTableIndex' if stage == 'before' else 'correctionTableIndex']]) for stage in ['before', 'after']}
        for row in table['rows']:
            for stage in ['before', 'after']:
                coord = row[stage + 'Cell']
                text = parsed[stage].get((coord['row'], coord['column']))
                if text is None or int(text.replace(',', '')) != row[stage + 'Value']:
                    raise ValueError('Source coordinate/value mismatch')
                checked += 1
        for currency in ['USD', 'JPY', 'EUR']:
            for measure in ['FOREIGN_CURRENCY', 'KRW_TRANSLATED']:
                rows = [r for r in table['rows'] if r['currency'] == currency and r['measure'] == measure]
                totals = [r for r in rows if r['account'].endswith('계')]
                parts = [r for r in rows if not r['account'].endswith('계')]
                if len(totals) != 1 or not parts:
                    continue
                for stage in ['before', 'after']:
                    unit = totals[0][stage+'Unit']
                    if unit == '원문 단위 미명시' or any(r[stage+'Unit'] != unit for r in rows):
                        continue
                    total = totals[0][stage+'Value']; component_sum = sum(r[stage+'Value'] for r in parts)
                    if total == component_sum:
                        continue
                    details = []
                    for r in [*parts, totals[0]]:
                        coord = r[stage+'Cell']; details.append({'account': r['account'], 'value': r[stage+'Value'], 'rawText': parsed[stage][(coord['row'],coord['column'])], 'row':coord['row'], 'column':coord['column']})
                    source_table = sources[stage][table['originalTableIndex' if stage == 'before' else 'correctionTableIndex']]
                    discrepancies.append({'statementBasis':table['statementBasis'],'year':table['year'],'field':table['field'],'currency':currency,'measure':measure,'stage':stage,'unit':unit,'total':total,'componentSum':component_sum,'difference':total-component_sum,'sourceTableSha256':hashlib.sha256(source_table.encode()).hexdigest(),'sourceCells':details,'finding':'DIFFERENCE_PRESENT_IN_OFFICIAL_RAW_CELLS','cause':'UNCONFIRMED_OFFICIAL_EXPLANATION_REQUIRED','roundingAssumed':False,'correctedValue':None,'valuationInputEligible':False})
    return {'checkedAt':datetime.now(timezone.utc).isoformat(),'apiReads':0,'sourceArchiveHashes':hashes,'verifiedRawCells':checked,'discrepancyCount':len(discrepancies),'sourceParsingStatus':'VERIFIED_COORDINATES_AND_RAW_VALUES','causeStatus':'BLOCKED_NO_OFFICIAL_EXPLANATION','valuationInputEligible':False,'discrepancies':discrepancies}

if __name__ == '__main__':
    result = build()
    target = BASE / ('source-discrepancy-audit-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '.json')
    with target.open('x') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    target.chmod(0o600)
    print(json.dumps({'path':str(target.relative_to(ROOT)), 'verifiedRawCells':result['verifiedRawCells'], 'discrepancyCount':result['discrepancyCount'], 'causeStatus':result['causeStatus'], 'apiReads':0}))
