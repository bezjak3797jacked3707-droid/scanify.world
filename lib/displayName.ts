// Display-name format rules. Safe to import in the browser (no word lists in here).
// The inappropriate-name filter lives in lib/nameFilter.ts and only runs on the server.

export const DISPLAY_NAME_MIN = 3;
export const DISPLAY_NAME_MAX = 20;

export const NAME_NOT_ALLOWED = "That name isn't allowed. Please choose another.";

export type NameCheck = { ok: true; name: string } | { ok: false; reason: string };

// Latin letters (including å ä ö and other accented letters), digits, space, hyphen, underscore.
// Other alphabets are excluded on purpose: look-alike letters (for example a Cyrillic "а"
// instead of a Latin "a") are the easiest way around a word filter.
const ALLOWED = /^[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F_\- ]+$/;
const LETTER = /[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F]/g;

export function checkDisplayNameFormat(raw: unknown): NameCheck {
  if (typeof raw !== "string") return { ok: false, reason: "Please enter a name." };

  const name = raw.normalize("NFC").replace(/\s+/g, " ").trim();

  if (name.length < DISPLAY_NAME_MIN || name.length > DISPLAY_NAME_MAX) {
    return { ok: false, reason: `Name must be ${DISPLAY_NAME_MIN}-${DISPLAY_NAME_MAX} characters.` };
  }
  if (!ALLOWED.test(name)) {
    return { ok: false, reason: "Use letters, numbers, spaces, - and _ only." };
  }
  if ((name.match(LETTER) || []).length < 2) {
    return { ok: false, reason: "Name needs at least 2 letters." };
  }
  if (/(.)\1{4,}/.test(name)) {
    return { ok: false, reason: "Too many repeated characters." };
  }

  return { ok: true, name };
}