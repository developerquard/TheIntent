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

const SYNONYMS: Record<string, string> = {
  coach: "mentor",
  coaching: "mentor",
  teacher: "mentor",
  teachers: "mentor",
  tutors: "mentor",
  tutor: "mentor",
  studying: "learn",
  study: "learn",
  learning: "learn",
  practice: "practice",
  practicing: "practice",
  build: "build",
  building: "build",
  create: "build",
  creating: "build",
  launch: "build",
  launching: "build",
  startups: "startup",
  technologies: "technology",
  tech: "technology",
};

const GOAL_PATTERNS: Array<[string, RegExp]> = [
  ["learn", /\b(learn|study|practice|improve|understand)\b/i],
  ["build", /\b(build|create|launch|make|develop)\b/i],
  ["invest", /\b(invest|fund|finance|back)\b/i],
  ["teach", /\b(teach|sell|offer|provide)\b/i],
  ["connect", /\b(find|meet|connect|join|partner|looking)\b/i],
];

const COMPATIBLE_GOALS = new Set(["learn:connect", "build:connect"]);

// Deterministic semantic approximation: canonical tokens, phrase evidence, and goal direction.
export function computeIntentSimilarity(source: string, target: string): number {
  const src = tokenize(source);
  const tgt = tokenize(target);
  if (src.size === 0 || tgt.size === 0) return 0;

  const common = [...src].filter((word) => tgt.has(word)).length;
  const keywordScore = common / Math.max(src.size, tgt.size);
  const phraseScore = phraseOverlap(source, target);
  const sourceGoal = detectGoal(source);
  const targetGoal = detectGoal(target);
  let goalScore = 0.45;

  if (sourceGoal && targetGoal) {
    if (sourceGoal === targetGoal) {
      goalScore = 1;
    } else if (
      COMPATIBLE_GOALS.has(`${sourceGoal}:${targetGoal}`) ||
      COMPATIBLE_GOALS.has(`${targetGoal}:${sourceGoal}`)
    ) {
      goalScore = 0.7;
    } else {
      goalScore = 0;
    }
  }

  if (common === 0 && phraseScore === 0) {
    return goalScore >= 0.7 ? 0.2 : 0;
  }

  const score =
    (keywordScore * 0.55 + phraseScore * 0.2 + goalScore * 0.25) * (goalScore === 0 ? 0.35 : 1);
  return Number(score.toFixed(3));
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .map((word) => SYNONYMS[word] ?? stem(word))
      .filter((word) => word.length > 1 && !STOP_WORDS.has(word)),
  );
}

function stem(word: string): string {
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
}

function phraseOverlap(source: string, target: string): number {
  const sourcePhrases = ngrams(source);
  const targetPhrases = ngrams(target);
  if (sourcePhrases.size === 0 || targetPhrases.size === 0) return 0;
  const common = [...sourcePhrases].filter((phrase) => targetPhrases.has(phrase)).length;
  return common / Math.max(sourcePhrases.size, targetPhrases.size);
}

function ngrams(text: string): Set<string> {
  const words = [...tokenize(text)];
  const phrases = new Set<string>();
  for (let index = 0; index < words.length - 1; index += 1) {
    phrases.add(`${words[index]} ${words[index + 1]}`);
  }
  return phrases;
}

function detectGoal(text: string): string | null {
  return GOAL_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
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
