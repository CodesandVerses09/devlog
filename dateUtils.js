// Single source of truth for "what calendar date is this, in IST."
// Used by app.js, feed.js, and profile.js so the streak, contribution
// grid, and community feed stats can never silently disagree with
// each other over a timezone boundary.
export function toIST(dateInput) {
  const date = new Date(dateInput);
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}
