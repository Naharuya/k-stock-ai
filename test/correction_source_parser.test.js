import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
function parse(table) {
  const result = spawnSync('python3', ['-c', "import json,runpy,sys; p=runpy.run_path('scripts/audit-db-correction-source.py'); c=p['source_cells'](sys.stdin.read()); print(json.dumps([[r,k,v] for (r,k),v in c.items()]))"], { input: table, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
test('official DART TE source cells retain comma values and explicit coordinates', () => {
  assert.deepEqual(parse('<TABLE><TR><TE>계</TE><TE>554,556</TE></TR></TABLE>'), [[0,0,'계'],[0,1,'554,556']]);
});
test('rowspan and colspan source coordinates skip occupied cells without inventing numbers', () => {
  assert.deepEqual(parse('<TABLE><TR><TH ROWSPAN="2" COLSPAN="2">통화</TH><TD>USD</TD></TR><TR><TE>54,556</TE></TR></TABLE>'), [[0,0,'통화'],[0,2,'USD'],[1,2,'54,556']]);
});
test('source content normalization decodes text without changing numerical discrepancies', () => {
  assert.deepEqual(parse('<TABLE><TR><TE><P>8516</P></TE><TE>554556</TE><TD>A&amp;B</TD></TR></TABLE>'), [[0,0,'8516'],[0,1,'554556'],[0,2,'A&B']]);
});
