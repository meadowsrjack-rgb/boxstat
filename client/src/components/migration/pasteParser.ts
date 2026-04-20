export type ParsedPasteRow = {
  first: string;
  last: string;
  email: string;
  phone: string;
  parentEmail: string;
  expiry: string;
  program: string;
  team: string;
};

export function parseCsvRow(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delim) { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.replace(/\r$/, "").trim());
}

export function normalizeDate(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  const pad = (n: string) => (n.length === 1 ? "0" + n : n);
  const isValid = (y: number, m: number, d: number) => {
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  };

  // YYYY-MM-DD or YYYY/MM/DD
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3];
    if (!isValid(y, mo, d)) return "";
    return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  }
  // MM/DD/YYYY, M/D/YYYY, MM-DD-YYYY (US-style)
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const mo = +m[1], d = +m[2], y = +m[3];
    if (!isValid(y, mo, d)) return "";
    return `${m[3]}-${pad(m[1])}-${pad(m[2])}`;
  }
  return "";
}

export function parsePaste(raw: string): ParsedPasteRow[] {
  // Normalize line endings (CRLF, lone CR, LF) and strip BOM.
  // Only strip trailing/leading newlines — never tabs or spaces, which can be
  // meaningful trailing empty cells.
  const clean = raw
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^\n+|\n+$/g, "");
  if (!clean) return [];
  const lines = clean.split("\n").filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const delim = lines[0].includes("\t") ? "\t" : ",";
  const rawHeaders = parseCsvRow(lines[0], delim);
  const headers = rawHeaders.map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
  const headerLen = headers.length;
  const col = (...names: string[]) => {
    for (const n of names) {
      const i = headers.findIndex((h) => h && h === n);
      if (i >= 0) return i;
    }
    for (const n of names) {
      const i = headers.findIndex((h) => h && (h.includes(n) || n.includes(h)));
      if (i >= 0) return i;
    }
    return -1;
  };
  const expiryIdx = col("subenddate", "subscriptionenddate", "expiry", "expires", "expiration", "enddate", "subscription", "until", "end", "sub");
  return lines.slice(1).map((line) => {
    const cells = parseCsvRow(line, delim);
    // Pad short rows so the trailing empty cell on the last row isn't lost.
    while (cells.length < headerLen) cells.push("");
    const get = (i: number) => (i >= 0 ? cells[i] ?? "" : "");
    const expiryRaw = get(expiryIdx);
    return {
      first:       get(col("firstname", "first", "fname", "givenname")),
      last:        get(col("lastname", "last", "lname", "surname", "familyname")),
      email:       get(col("email", "emailaddress", "mail")),
      phone:       get(col("phone", "phonenumber", "mobile", "cell", "contact")),
      parentEmail: get(col("parentemail", "parent", "guardian", "guardianemail", "family")),
      expiry:      normalizeDate(expiryRaw),
      program:     get(col("program", "programname", "programcode", "prog")),
      team:        get(col("team", "teamname", "group")),
    };
  });
}
