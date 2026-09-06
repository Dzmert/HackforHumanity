// Countability rules for StockMovement rows, evaluated in this order:
// 1. No source_donation_line and no parent Donation      -> COUNTABLE (direct ledger write)
// 2. Parent Donation status is draft or discarded         -> NOT COUNTABLE
// 3. Has source_donation_line but parent cannot resolve   -> NOT COUNTABLE
// 4. Otherwise                                            -> COUNTABLE

const NON_COUNTABLE_DONATION_STATUSES = ['draft', 'discarded'];

function uniqueIds(values) {
  return [...new Set(values.filter((v) => typeof v === 'string' && v.trim()))];
}

async function fetchByIds(entity, ids) {
  const map = new Map();
  const chunkSize = 100;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const records = await entity.filter({ id: { $in: chunk } }, null, chunk.length);
    for (const record of records) map.set(record.id, record);
  }
  return map;
}

/**
 * Resolves each movement's parent Donation, then applies the ordered rules.
 * Returns only the movements that count toward on-hand.
 */
export async function filterCountableMovements(base44, movements) {
  const lineIds = uniqueIds(movements.map((m) => m.source_donation_line));
  const lines = lineIds.length ? await fetchByIds(base44.entities.DonationLineItem, lineIds) : new Map();
  const donationIds = uniqueIds([...lines.values()].map((line) => line.donation));
  const donations = donationIds.length ? await fetchByIds(base44.entities.Donation, donationIds) : new Map();

  return movements.filter((movement) => {
    const lineId = typeof movement.source_donation_line === 'string' && movement.source_donation_line.trim()
      ? movement.source_donation_line
      : null;

    // Case 1: never had a parent — a direct ledger write.
    if (!lineId) return true;

    const line = lines.get(lineId);
    const donation = line ? donations.get(line.donation) : undefined;

    // Case 2: parent resolved, but the donation is not part of on-hand stock.
    if (donation) return !NON_COUNTABLE_DONATION_STATUSES.includes(donation.status);

    // Case 3: a parent was expected but is missing — never default to countable.
    return false;
  });
}