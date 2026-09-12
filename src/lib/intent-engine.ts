// Ported intent engine (policy sd-v0.2) — pure, isomorphic logic.
// Adapted from the uploaded server/intentPolicy.ts.

export type PolicyDecision = "ALLOW" | "HARD_BLOCK" | "REVIEW";

export interface PolicyResult {
  decision: PolicyDecision;
  flags: string[];
  policyVersion: string;
  confidence: number;
  reason: string;
}

export const POLICY_VERSION = "sd-v0.2";
export const MATCH_THRESHOLD = 0.25;

const MASS_OUTREACH_PATTERNS: RegExp[] = [
  /mass outreach/i,
  /join my .* channel/i,
  /dm me/i,
  /reach out to everyone/i,
  /buy now/i,
  /promo code/i,
  /\bspam\b/i,
  /click here/i,
  /make money fast/i,
  /crypto pump/i,
];

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "to",
  "with",
  "for",
  "and",
  "or",
  "of",
  "in",
  "on",
  "at",
  "i",
  "want",
  "need",
  "someone",
  "some",
  "this",
  "that",
  "my",
  "me",
  "we",
  "you",
  "find",
  "get",
  "looking",
  "who",
  "is",
  "are",
  "be",
  "this",
  "month",
  "week",
  "weekend",
  "today",
  "now",
  "near",
]);

export function evaluateIntentPolicy(intentText: string): PolicyResult {
  const normalized = intentText.trim().toLowerCase();
  const flags: string[] = [];

  for (const pattern of MASS_OUTREACH_PATTERNS) {
    if (pattern.test(normalized)) {
      if (!flags.includes("MASS_OUTREACH")) flags.push("MASS_OUTREACH");
    }
  }

  if (normalized.length < 6) flags.push("TOO_SHORT");

  const block = flags.includes("MASS_OUTREACH");
  const decision: PolicyDecision = block
    ? "HARD_BLOCK"
    : flags.includes("TOO_SHORT")
      ? "REVIEW"
      : "ALLOW";

  const confidence = block ? 1 : decision === "REVIEW" ? 0.2 : 0.5;
  const reason = block
    ? "Detected outreach / spam pattern"
    : decision === "REVIEW"
      ? "Intent too short to match"
      : `Passed policy ${POLICY_VERSION}`;

  return { decision, flags, policyVersion: POLICY_VERSION, confidence, reason };
}

// Jaccard-style word overlap similarity (from intentPolicy.computeIntentSimilarity).
export function computeIntentSimilarity(source: string, target: string): number {
  const src = tokenize(source);
  const tgt = tokenize(target);
  if (src.size === 0 || tgt.size === 0) return 0;

  let common = 0;
  src.forEach((w) => {
    if (tgt.has(w)) common += 1;
  });
  if (common === 0) return 0;

  const score = common / Math.max(src.size, tgt.size);
  return Number(score.toFixed(3));
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w)),
  );
}

// Derive short tags for a formed room, e.g. ["ai", "security", "mumbai"].
export function deriveTags(a: string, b: string): string[] {
  const src = tokenize(a);
  const tgt = tokenize(b);
  const common: string[] = [];
  src.forEach((w) => {
    if (tgt.has(w)) common.push(w);
  });
  const pool = common.length ? common : [...src];
  return pool.slice(0, 3);
}

export function shortHash(hash: string): string {
  if (hash.length <= 9) return hash;
  return `${hash.slice(0, 4)}…${hash.slice(-4)}`;
}
