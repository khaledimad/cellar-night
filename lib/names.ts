// Turns a billed name into the key comedians are matched on.
// "Louis C.K.", "Louis CK" and "Louis C. K." all become "louis ck".
// There is no fuzzy matching: two different spellings are two people.
export function normalizeName(raw: string): string {
  const words = raw
    // fold accents
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    // delete dots and apostrophes
    .replace(/[.'’‘`]/g, "")
    // every other run of punctuation becomes one space
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .toLowerCase()
    .trim()
    .split(" ")
    .filter(Boolean);

  // join runs of single letters: "c k" becomes "ck"
  const out: string[] = [];
  let lastWasSingle = false;
  for (const word of words) {
    const single = word.length === 1;
    if (single && lastWasSingle) {
      out[out.length - 1] += word;
    } else {
      out.push(word);
    }
    lastWasSingle = single;
  }
  return out.join(" ");
}
