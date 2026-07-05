// Turns a raw Supabase user UUID into a readable, deterministic handle
// like "swift-solver-3297" instead of showing the raw ID fragment.
// Deterministic = the same user always gets the same handle, with no
// database column needed — it's derived purely from their existing ID.

const ADJECTIVES = [
  "swift",
  "sharp",
  "clever",
  "steady",
  "quiet",
  "keen",
  "bold",
  "calm",
  "quick",
  "deep",
];

const NOUNS = [
  "coder",
  "solver",
  "builder",
  "learner",
  "hacker",
  "thinker",
  "mapper",
  "stacker",
  "looper",
  "dev",
];

export function getHandle(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  const adj = ADJECTIVES[hash % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(hash / ADJECTIVES.length) % NOUNS.length];
  const shortId = userId.slice(0, 4);
  return `${adj}-${noun}-${shortId}`;
}
