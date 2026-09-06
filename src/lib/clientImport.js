const COLUMNS = {
  'name': 'name',
  'reference code': 'reference_code',
  'pronouns': 'pronouns',
  'preferred contact method': 'preferred_contact_method',
  'assigned caseworker': 'assigned_caseworker',
  'notes': 'notes'
};

function splitLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { cells.push(cell); cell = ''; }
    else cell += char;
  }
  cells.push(cell);
  return cells.map(value => value.trim());
}

export function parseClientCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  const headers = splitLine(lines[0]).map(header => COLUMNS[header.toLowerCase()] || null);
  return lines.slice(1).map(line => {
    const cells = splitLine(line);
    const row = {};
    headers.forEach((field, index) => { if (field) row[field] = cells[index] || ''; });
    return row;
  }).filter(row => (row.name || '').trim() !== '');
}

export const normaliseName = (name) => (name || '').trim().toLowerCase().replace(/\s+/g, ' ');

// Loose match: same normalised name, or names differing by a small number of characters.
function isLikelyMatch(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 2) return false;
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  let edits = 0, i = 0, j = 0;
  while (i < longer.length && j < shorter.length) {
    if (longer[i] === shorter[j]) { i++; j++; continue; }
    edits++;
    if (edits > 2) return false;
    if (longer.length === shorter.length) { i++; j++; } else i++;
  }
  return edits + (longer.length - i) + (shorter.length - j) <= 2;
}

export function generateReferenceCode(name, taken) {
  const initials = (name || '').trim().split(/\s+/).map(part => part[0] || '').join('').toUpperCase().slice(0, 3) || 'LP';
  let code;
  let counter = 1;
  do {
    code = `LP-${initials}-${String(counter).padStart(3, '0')}`;
    counter++;
  } while (taken.has(code.toLowerCase()));
  taken.add(code.toLowerCase());
  return code;
}

export function buildPreview(rows, existingClients) {
  const taken = new Set(existingClients.map(client => (client.reference_code || '').toLowerCase()).filter(Boolean));
  const seen = [];
  return rows.map((row, index) => {
    const normalised = normaliseName(row.name);
    const existingMatch = existingClients.find(client => isLikelyMatch(normaliseName(client.name), normalised));
    const fileMatch = seen.find(entry => isLikelyMatch(entry.normalised, normalised));
    seen.push({ normalised, name: row.name });
    return {
      key: index,
      row,
      generatedCode: (row.reference_code || '').trim() === '' ? generateReferenceCode(row.name, taken) : null,
      duplicateOf: existingMatch ? `${existingMatch.name} (already in the system)` : fileMatch ? `${fileMatch.name} (earlier row in this file)` : null,
      include: !existingMatch && !fileMatch
    };
  });
}

export const SAMPLE_CSV = `Name,Reference Code,Pronouns,Preferred Contact Method,Assigned Caseworker,Notes
Margaret Hollis,,she/her,Phone,Dana Whitfield,"Attends Tuesday drop-in, prefers morning calls"
Aroha Ngata,LP-EXIST-014,she/her,Text message,Dana Whitfield,Referred by Redfern outreach
Susan Brereton,,she/her,Phone,Priya Raman,"No voicemail, call twice if unanswered"
Jo Alderton,,they/them,Email,Priya Raman,Working with housing advocate
Nadia Fakhouri,,she/her,Text message,,Awaiting caseworker allocation
Susan Breretton,,she/her,Phone,Priya Raman,"Duplicate-looking entry from the old spreadsheet"
Colleen Byrne,,she/her,In person,Dana Whitfield,Comes in with support dog
Thanh Mai Nguyen,,she/her,Phone,Priya Raman,Interpreter preferred (Vietnamese)
Delia Okonkwo,,she/her,Email,,Requested help with Centrelink forms
Bev Sanderson,,she/her,In person,Dana Whitfield,Long-term visitor since 2019
Kirra Williamson,,she/her,Text message,Priya Raman,Prefers contact after 10am
Fatima Al-Rashid,,she/her,Phone,,New to service this month
Robyn Petrie,,she/her,Email,Dana Whitfield,"Employment support referral pending"
Margaret Hollys,,she/her,Phone,Dana Whitfield,"Likely the same person as Margaret Hollis"
Lisette Moreau,,she/her,In person,Priya Raman,Attends craft group weekly
`;