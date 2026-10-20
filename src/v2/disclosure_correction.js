import {validDay} from './accounting_periods.js';
// This verifies a reviewed source chain; it never rewrites historical snapshots.
export function selectReviewedDisclosure(review, asOfDate) {
  const pending = reason => ({ status: 'CORRECTION_UNVERIFIED', receipt: null, reason });
  const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
  const originalDay = day(review?.originalPublishedAt), correctionDay = day(review?.correctionPublishedAt);
  if (!validDay(asOfDate) || !validDay(originalDay) || !validDay(correctionDay) ||
      !/^\d{14}$/.test(review?.originalReceipt || '') || !/^\d{14}$/.test(review?.correctionReceipt || '') ||
      review.originalReceipt === review.correctionReceipt || correctionDay < originalDay ||
      review.originalSubmissionDateInCorrection !== originalDay) return pending('DOCUMENT_CHAIN_UNVERIFIED');
  if (asOfDate < originalDay) return { status: 'NOT_AVAILABLE', receipt: null, reason: 'FUTURE_DISCLOSURE' };
  // The initial source remains the only available version before correction publication.
  if (asOfDate < correctionDay) return { status: 'ORIGINAL_ONLY', receipt: review.originalReceipt, availableAt: review.originalPublishedAt, corrected: false };
  const hashes = review.sourceArchiveHashes || {};
  if (review.verificationStatus !== 'VERIFIED' || ![review.originalReceipt, review.correctionReceipt].every(r => /^[a-f0-9]{64}$/.test(hashes[r] || '')) ||
      !review.changes?.length || review.changes.some(c => typeof c.before !== 'string' || !c.before || typeof c.after !== 'string' || !c.after || c.before === c.after) ||
      !review.listing?.complete || review.listing.totalPages !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(review.listing.end || '') || review.listing.end < asOfDate ||
      !Array.isArray(review.listing.laterAnnualCorrections) || review.listing.laterAnnualCorrections.length) return pending('CORRECTION_SOURCE_OR_FINAL_VERSION_UNVERIFIED');
  return { status: 'VERIFIED', receipt: review.correctionReceipt, availableAt: review.correctionPublishedAt, corrected: true,
    fiscalPeriod: review.fiscalPeriod, changes: review.changes, reason: review.reason, sourceUrls: review.sourceUrls };
}
