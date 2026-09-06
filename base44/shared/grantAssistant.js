// Read-only Grant Assistant. Every question about dates, amounts, counts,
// statuses, people and deadlines is answered by deterministic calculation over
// the stored records. Only open-ended questions fall through to the LLM.
import { effectiveStatus } from './grants.js';
import { collectDeadlines, daysUntil, longDate, todayInSydney } from './grantReminders.js';

export const NOT_FOUND = "I couldn't find that information in the current grant records.";

const money = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(Number(value || 0));

const nameOf = (grant) => grant.grantName || grant.name || 'Untitled grant';
const funderOf = (grant) => grant.funderName || grant.funder || '';
const ref = (grant, detail) => ({ grantId: grant.id, label: nameOf(grant), detail });
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
const dueIn = (days) => (days === 0 ? 'due today' : days === 1 ? 'due tomorrow' : days < 0 ? `${Math.abs(days)} days overdue` : `due in ${days} days`);

const outstanding = (requirements) => requirements.filter(r => effectiveStatus(r) !== 'Completed');
const overdueOnly = (requirements) => requirements.filter(r => effectiveStatus(r) === 'Overdue');

const sortedDeadlines = (grants, requirements, today) =>
  collectDeadlines(grants, requirements)
    .map(item => ({ ...item, days: daysUntil(item.deadlineDate, today) }))
    .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate));

const deadlineLabel = (item) =>
  item.requirement ? `${item.requirement.title || 'Requirement'}` : item.deadlineType.replace(' Date', '');

const listDeadlines = (items) =>
  items.map(item => `${nameOf(item.grant)} — ${deadlineLabel(item)}, ${longDate(item.deadlineDate)} (${dueIn(item.days)})`);

const has = (question, ...words) => words.some(word => question.includes(word));

/** Curly quotes, punctuation and spacing vary between typing and stored names. */
const normalise = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc\u2032`]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

const numberIn = (question, fallback) => {
  const match = question.match(/(\d+)\s*day/);
  return match ? Number(match[1]) : fallback;
};

/**
 * @returns {{answer: string, references: Array, handled: boolean}}
 *   handled=false means the caller should ask the LLM with supplied context.
 */
export function answerFromData(rawQuestion, grants, requirements, today = todayInSydney()) {
  const question = normalise(rawQuestion);
  if (!question) return { answer: NOT_FOUND, references: [], handled: true };
  if (!grants.length) return { answer: NOT_FOUND, references: [], handled: true };

  const deadlines = sortedDeadlines(grants, requirements, today);
  const upcoming = deadlines.filter(item => item.days !== null && item.days >= 0);
  const grantById = new Map(grants.map(g => [g.id, g]));
  const reqGrant = (r) => grantById.get(r.grantId || r.grant_id);

  // Details the app has no field for can never be answered from the records.
  const UNRECORDED_DETAILS = ['phone', 'mobile number', 'telephone', 'fax', 'postal address', 'street address',
    'bank', 'bsb', 'account number', 'abn', 'acn', 'tax', 'gst', 'invoice', 'insurance', 'password'];
  if (has(question, ...UNRECORDED_DETAILS)) {
    return { answer: NOT_FOUND, references: [], handled: true };
  }

  // --- a specific grant named in the question ----------------------------
  const named = grants.find(g => nameOf(g).length > 3 && question.includes(normalise(nameOf(g))));
  if (named) {
    // "How much is X worth?" wants that grant's amount, not the portfolio total.
    if (has(question, 'how much', 'worth', 'amount', 'value')) {
      const amount = named.grantAmount ?? named.amount;
      return {
        answer: amount === null || amount === undefined || amount === ''
          ? NOT_FOUND
          : `${nameOf(named)} is worth ${money(amount)}.`,
        references: [ref(named, amount === null || amount === undefined || amount === '' ? 'No amount recorded' : money(amount))],
        handled: true
      };
    }
    if (has(question, 'who', 'responsible', 'in charge', 'contact')) {
      const person = named.personInCharge;
      return {
        answer: person
          ? `${nameOf(named)} is looked after by ${person}${named.personInChargeEmail ? ` (${named.personInChargeEmail})` : ''}.`
          : NOT_FOUND,
        references: [ref(named, person || 'No person in charge recorded')],
        handled: true
      };
    }
    // Only summarise the grant when the question is about something we actually
    // store. Anything else is not in the records, so say so plainly.
    const summaryTopics = ['tell me', 'about', 'detail', 'overview', 'summary', 'status', 'when',
      'date', 'due', 'deadline', 'renew', 'acquittal', 'who funds', 'funded by', 'purpose', 'progress', 'requirement', 'happening'];
    if (!has(question, ...summaryTopics)) {
      return { answer: NOT_FOUND, references: [], handled: true };
    }
    const own = upcoming.filter(item => item.grant.id === named.id);
    const lines = [
      `${nameOf(named)}${funderOf(named) ? ` — ${funderOf(named)}` : ''}`,
      `Status: ${named.grantStatus || 'Not recorded'} · Amount: ${named.grantAmount || named.amount ? money(named.grantAmount ?? named.amount) : 'Not recorded'}`,
      own.length ? 'Upcoming dates:' : 'No upcoming dates are recorded for this grant.'
    ].concat(own.slice(0, 6).map(item => `• ${deadlineLabel(item)} — ${longDate(item.deadlineDate)} (${dueIn(item.days)})`));
    return { answer: lines.join('\n'), references: [ref(named, own.length ? dueIn(own[0].days) : 'No upcoming dates')], handled: true };
  }

  // --- overdue requirements ----------------------------------------------
  if (has(question, 'overdue', 'late', 'past due')) {
    const overdue = overdueOnly(requirements);
    if (!overdue.length) return { answer: 'Nothing is overdue — every compliance requirement is on track.', references: [], handled: true };
    const grouped = new Map();
    for (const r of overdue) {
      const grant = reqGrant(r);
      if (!grant) continue;
      grouped.set(grant.id, (grouped.get(grant.id) || 0) + 1);
    }
    const references = [...grouped].map(([grantId, count]) => ref(grantById.get(grantId), `${plural(count, 'overdue requirement')}`));
    return {
      answer: `${plural(overdue.length, 'requirement')} ${overdue.length === 1 ? 'is' : 'are'} overdue.`,
      references,
      handled: true
    };
  }

  // --- total active funding ----------------------------------------------
  if (has(question, 'how much', 'total', 'funding') && !has(question, 'due', 'deadline')) {
    const active = grants.filter(g => g.grantStatus === 'Active');
    const total = active.reduce((sum, g) => sum + Number(g.grantAmount ?? g.amount ?? 0), 0);
    return {
      answer: `${money(total)} across ${plural(active.length, 'active grant')}.`,
      references: active.map(g => ref(g, money(g.grantAmount ?? g.amount ?? 0))),
      handled: true
    };
  }

  // --- next deadline ------------------------------------------------------
  if (has(question, 'next deadline', 'deadline is next', 'soonest', 'next due', 'what is next', "what's next")) {
    if (!upcoming.length) return { answer: 'There are no upcoming grant deadlines recorded.', references: [], handled: true };
    const next = upcoming[0];
    return {
      answer: `${nameOf(next.grant)} — ${deadlineLabel(next)}, ${longDate(next.deadlineDate)} (${dueIn(next.days)}).`,
      references: [ref(next.grant, `${deadlineLabel(next)} · ${dueIn(next.days)}`)],
      handled: true
    };
  }

  // --- this week / next N days -------------------------------------------
  if (has(question, 'this week', 'next 7 days', 'seven days', 'complete this week')) {
    const soon = upcoming.filter(item => item.days <= 7);
    if (!soon.length) return { answer: 'Nothing falls due in the next 7 days.', references: [], handled: true };
    return {
      answer: [`${plural(soon.length, 'deadline')} in the next 7 days:`, ...listDeadlines(soon)].join('\n'),
      references: soon.map(item => ref(item.grant, `${deadlineLabel(item)} · ${dueIn(item.days)}`)),
      handled: true
    };
  }

  // --- renewals ----------------------------------------------------------
  if (has(question, 'renewal', 'renew')) {
    const window = has(question, 'this month') ? null : numberIn(question, 90);
    const month = today.slice(0, 7);
    const renewals = upcoming.filter(item =>
      item.deadlineType === 'Renewal Date' &&
      (window === null ? item.deadlineDate.slice(0, 7) === month : item.days <= window));
    const scope = window === null ? 'this month' : `the next ${window} days`;
    if (!renewals.length) return { answer: `No grants are due for renewal in ${scope}.`, references: [], handled: true };
    return {
      answer: [`${plural(renewals.length, 'grant')} due for renewal in ${scope}:`, ...listDeadlines(renewals)].join('\n'),
      references: renewals.map(item => ref(item.grant, `Renewal ${dueIn(item.days)}`)),
      handled: true
    };
  }

  // --- acquittals ---------------------------------------------------------
  if (has(question, 'acquittal')) {
    if (has(question, 'within', 'next', 'days', 'due')) {
      const window = numberIn(question, 30);
      const items = upcoming.filter(item => item.deadlineType === 'Acquittal Due Date' && item.days <= window);
      if (!items.length) return { answer: `No acquittals fall due in the next ${window} days.`, references: [], handled: true };
      return {
        answer: [`${plural(items.length, 'acquittal')} due within ${window} days:`, ...listDeadlines(items)].join('\n'),
        references: items.map(item => ref(item.grant, `Acquittal ${dueIn(item.days)}`)),
        handled: true
      };
    }
    const financial = grants.filter(g => String(g.acquittalType || '').toLowerCase().includes(has(question, 'financial') ? 'financial' : ''));
    const withType = financial.filter(g => g.acquittalType);
    if (!withType.length) return { answer: NOT_FOUND, references: [], handled: true };
    return {
      answer: [`${plural(withType.length, 'grant')} with this acquittal type:`,
        ...withType.map(g => `${nameOf(g)} — ${g.acquittalType}${g.acquittalDueDate ? `, due ${longDate(g.acquittalDueDate)}` : ''}`)].join('\n'),
      references: withType.map(g => ref(g, g.acquittalType)),
      handled: true
    };
  }

  // --- this month ---------------------------------------------------------
  if (has(question, 'this month', 'due this month')) {
    const month = today.slice(0, 7);
    const items = deadlines.filter(item => item.deadlineDate.slice(0, 7) === month);
    if (!items.length) return { answer: 'Nothing falls due this month.', references: [], handled: true };
    return {
      answer: [`${plural(items.length, 'deadline')} this month:`, ...listDeadlines(items)].join('\n'),
      references: items.map(item => ref(item.grant, `${deadlineLabel(item)} · ${dueIn(item.days)}`)),
      handled: true
    };
  }

  // --- upcoming deadlines (generic) --------------------------------------
  if (has(question, 'upcoming', 'coming up', 'deadline', 'due soon')) {
    const window = numberIn(question, 30);
    const items = upcoming.filter(item => item.days <= window);
    if (!items.length) return { answer: `Nothing falls due in the next ${window} days.`, references: [], handled: true };
    return {
      answer: [`${plural(items.length, 'deadline')} in the next ${window} days:`, ...listDeadlines(items)].join('\n'),
      references: items.map(item => ref(item.grant, `${deadlineLabel(item)} · ${dueIn(item.days)}`)),
      handled: true
    };
  }

  // --- outstanding actions ------------------------------------------------
  if (has(question, 'outstanding', 'to do', 'todo', 'what do i need', 'actions')) {
    const open = outstanding(requirements);
    if (!open.length) return { answer: 'There are no outstanding compliance actions.', references: [], handled: true };
    const overdue = overdueOnly(requirements).length;
    const lines = open.slice(0, 10).map(r => {
      const grant = reqGrant(r);
      const days = daysUntil(r.dueDate || r.due_date, today);
      return `${grant ? nameOf(grant) : 'Unlinked grant'} — ${r.title || 'Requirement'}${days === null ? '' : ` (${dueIn(days)})`}`;
    });
    return {
      answer: [`${plural(open.length, 'outstanding requirement')}, ${overdue} overdue.`, ...lines].join('\n'),
      references: open.slice(0, 10).map(r => {
        const grant = reqGrant(r);
        return grant ? ref(grant, r.title || 'Requirement') : null;
      }).filter(Boolean),
      handled: true
    };
  }

  // --- funder ------------------------------------------------------------
  const funders = [...new Set(grants.map(funderOf).filter(f => f && f.length > 2))];
  const funder = funders.find(f => question.includes(f.toLowerCase()));
  if (funder) {
    const matched = grants.filter(g => funderOf(g) === funder);
    return {
      answer: [`${plural(matched.length, 'grant')} from ${funder}:`,
        ...matched.map(g => `${nameOf(g)} — ${g.grantStatus || 'Status not recorded'}, ${money(g.grantAmount ?? g.amount ?? 0)}`)].join('\n'),
      references: matched.map(g => ref(g, g.grantStatus || '')),
      handled: true
    };
  }

  // --- a person ----------------------------------------------------------
  const people = [...new Set([
    ...grants.map(g => g.personInCharge),
    ...requirements.map(r => r.personResponsible)
  ].filter(p => p && p.length > 2))];
  const person = people.find(p =>
    question.includes(p.toLowerCase()) || question.includes(p.toLowerCase().split(' ')[0]));
  if (person) {
    const owned = grants.filter(g => g.personInCharge === person);
    const assigned = outstanding(requirements).filter(r => r.personResponsible === person);
    if (!owned.length && !assigned.length) return { answer: NOT_FOUND, references: [], handled: true };
    const lines = [`${person} is responsible for ${plural(owned.length, 'grant')} and ${plural(assigned.length, 'open requirement')}.`];
    for (const g of owned) lines.push(`${nameOf(g)} — grant owner`);
    for (const r of assigned) {
      const grant = reqGrant(r);
      lines.push(`${grant ? nameOf(grant) : 'Unlinked grant'} — ${r.title || 'Requirement'}`);
    }
    return {
      answer: lines.join('\n'),
      references: [...owned.map(g => ref(g, 'Grant owner')),
        ...assigned.map(r => { const grant = reqGrant(r); return grant ? ref(grant, r.title || 'Requirement') : null; }).filter(Boolean)],
      handled: true
    };
  }

  return { answer: '', references: [], handled: false };
}

/** Compact, token-light records handed to the LLM when a question needs it. */
export function llmContext(grants, requirements, today = todayInSydney()) {
  return {
    today,
    grants: grants.slice(0, 60).map(g => ({
      name: nameOf(g),
      funder: funderOf(g) || null,
      amountAud: g.grantAmount ?? g.amount ?? null,
      status: g.grantStatus || null,
      type: g.grantType || null,
      applicationDueDate: g.applicationDueDate || null,
      fundingStartDate: g.fundingStartDate || null,
      fundingEndDate: g.fundingEndDate || null,
      acquittalType: g.acquittalType || null,
      acquittalDueDate: g.acquittalDueDate || null,
      renewalDate: g.renewalDate || g.renewal_date || null,
      personInCharge: g.personInCharge || null,
      purpose: g.grantPurpose || null
    })),
    requirements: requirements.slice(0, 120).map(r => ({
      grant: reqName(grants, r),
      title: r.title || null,
      type: r.requirementType || null,
      dueDate: r.dueDate || r.due_date || null,
      status: effectiveStatus(r),
      personResponsible: r.personResponsible || null
    }))
  };
}

const reqName = (grants, requirement) => {
  const grant = grants.find(g => g.id === (requirement.grantId || requirement.grant_id));
  return grant ? nameOf(grant) : null;
};

/** Matches grant names appearing in an LLM answer so they can be made clickable. */
export function referencesFromText(text, grants) {
  const lower = String(text || '').toLowerCase();
  return grants
    .filter(g => nameOf(g).length > 3 && lower.includes(nameOf(g).toLowerCase()))
    .slice(0, 8)
    .map(g => ref(g, g.grantStatus || ''));
}