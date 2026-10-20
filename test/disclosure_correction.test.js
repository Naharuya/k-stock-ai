import test from 'node:test';
import assert from 'node:assert/strict';
import { selectReviewedDisclosure } from '../src/v2/disclosure_correction.js';
const fixture = () => ({ originalReceipt: '20260316001250', correctionReceipt: '20260601001661', originalPublishedAt: '2026-03-16T23:59:59+09:00', correctionPublishedAt: '2026-06-01T23:59:59+09:00', originalSubmissionDateInCorrection: '2026-03-16', verificationStatus: 'VERIFIED', sourceArchiveHashes: { '20260316001250': 'a'.repeat(64), '20260601001661': 'b'.repeat(64) }, changes: [{ before: 'JPY 6 (십만)', after: 'JPY 554 (천)' }], listing: { complete: true, totalPages: 1, end: '2026-10-08', laterAnnualCorrections: [] } });
test('correction selects final reviewed version available at valuation date', () => assert.equal(selectReviewedDisclosure(fixture(), '2026-10-08').receipt, '20260601001661'));
test('past valuation never receives future correction values', () => { const x = selectReviewedDisclosure(fixture(), '2026-05-31'); assert.equal(x.receipt, '20260316001250'); assert.equal(x.changes, undefined); });
test('before first filing no values are available', () => assert.equal(selectReviewedDisclosure(fixture(), '2026-03-15').status, 'NOT_AVAILABLE'));
test('missing archive proof stays unverified', () => { const f=fixture(); delete f.sourceArchiveHashes['20260601001661']; assert.equal(selectReviewedDisclosure(f,'2026-10-08').status,'CORRECTION_UNVERIFIED'); });
test('mismatching original submission date blocks relationship', () => { const f=fixture(); f.originalSubmissionDateInCorrection='2026-03-17'; assert.equal(selectReviewedDisclosure(f,'2026-10-08').status,'CORRECTION_UNVERIFIED'); });
test('later correction invalidates final version assertion', () => { const f=fixture(); f.listing.laterAnnualCorrections=['20260701000001']; assert.equal(selectReviewedDisclosure(f,'2026-10-08').status,'CORRECTION_UNVERIFIED'); });
test('listing incomplete or beyond reviewed cutoff stays unverified', () => { const f=fixture(); f.listing.complete=false; assert.equal(selectReviewedDisclosure(f,'2026-10-08').status,'CORRECTION_UNVERIFIED'); assert.equal(selectReviewedDisclosure(fixture(),'2026-10-09').status,'CORRECTION_UNVERIFIED'); });
test('missing before or after is not sufficient correction evidence', () => { const f=fixture(); f.changes[0].after=''; assert.equal(selectReviewedDisclosure(f,'2026-10-08').status,'CORRECTION_UNVERIFIED'); });

test('invalid calendar dates cannot select correction',()=>assert.equal(selectReviewedDisclosure(fixture(),'2026-02-30').status,'CORRECTION_UNVERIFIED'));
