/* DemoLens — scoring & report engine. Pure functions, no I/O, no AI. */

(function (root) {
  const src = typeof module !== "undefined" ? require("./rules.js") : root.DemoLensRules;
  const { QUESTIONS, CATEGORIES, RULES, QUICK_CHIPS } = src;

  const HINGLISH_FILLERS = /\b(kya|hai|tha|thi|hoga|hona|karna|krna|krni|chahiye|acha|baki|mai|mein)\b/gi;

  function cleanLine(line) {
    return line.trim().replace(/^[-*•]\s*/, "").replace(/\s+/g, " ");
  }

  function splitLines(raw) {
    return raw
      .split(/\r?\n/)
      .map(cleanLine)
      .filter(Boolean);
  }

  function matchLine(line, extraRules) {
    const lower = line.toLowerCase();
    const pool = extraRules && extraRules.length ? RULES.concat(extraRules) : RULES;
    return pool.filter((r) => r.keys.some((k) => lower.includes(k)));
  }

  function genericRewrite(line) {
    let s = line.replace(HINGLISH_FILLERS, " ").replace(/\s+/g, " ").trim();
    if (!s) return "An observation was noted.";
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (!/[.!?]$/.test(s)) s += ".";
    return s;
  }

  /** Analyze raw rough notes. Returns a structured result the UI/report both read. */
  function analyze(raw, meta, extraRules) {
    meta = meta || {};
    const lines = splitLines(raw || "");
    const perLine = [];
    const byCategory = {}; // cat -> { strengths:[], concerns:[] }
    const byQuestion = {}; // qid -> [{issue, recommendation, polarity, category}]
    QUESTIONS.forEach((q) => (byQuestion[q.id] = []));

    const seenRuleIds = new Set();

    lines.forEach((line) => {
      const matches = matchLine(line, extraRules);
      if (matches.length) {
        matches.forEach((r) => {
          const key = r.issue; // rule identity
          if (!byCategory[r.category]) byCategory[r.category] = { strengths: [], concerns: [] };
          const bucket = r.polarity === "strength" ? byCategory[r.category].strengths : byCategory[r.category].concerns;
          bucket.push({ line, issue: r.issue, recommendation: r.recommendation });

          r.q.forEach((qid) => {
            byQuestion[qid].push({
              line,
              issue: r.issue,
              recommendation: r.recommendation,
              polarity: r.polarity,
              category: r.category,
            });
          });
          seenRuleIds.add(key);
        });
        perLine.push({ text: line, matched: true, rules: matches });
      } else {
        const text = genericRewrite(line);
        if (!byCategory["General Observation"]) byCategory["General Observation"] = { strengths: [], concerns: [] };
        byCategory["General Observation"].concerns.push({ line, issue: text, recommendation: "Review whether this point needs further clarification or follow-up." });
        byQuestion.q4.push({ line, issue: text, recommendation: "Review whether this point needs further clarification or follow-up.", polarity: "neutral", category: "General Observation" });
        perLine.push({ text, matched: false, rules: [] });
      }
    });

    const categoryScores = scoreCategories(byCategory);
    const overall = scoreOverall(categoryScores, byCategory);
    const decision = decide(overall.score, byCategory);
    const conversion = forecastConversion(overall.score, byCategory);

    return { lines, perLine, byCategory, byQuestion, categoryScores, overall, decision, conversion, meta };
  }

  function scoreCategories(byCategory) {
    const rows = [];
    Object.keys(byCategory).forEach((cat) => {
      if (cat === "General Observation") return;
      const { strengths, concerns } = byCategory[cat];
      let score = 8.5 + strengths.length * 0.4 - concerns.length * 0.85;
      score = Math.max(1, Math.min(10, score));
      rows.push({ category: cat, score: round(score), strengths: strengths.length, concerns: concerns.length });
    });
    return rows.sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category));
  }

  function scoreOverall(categoryScores, byCategory) {
    let base;
    if (categoryScores.length) {
      base = categoryScores.reduce((s, r) => s + r.score, 0) / categoryScores.length;
    } else {
      base = 7;
    }
    const generalConcerns = (byCategory["General Observation"] || { concerns: [] }).concerns.length;
    base -= generalConcerns * 0.1;
    base = Math.max(1, Math.min(10, base));
    return { score: round(base) };
  }

  function decide(score, byCategory) {
    const accuracyConcerns = ((byCategory["Subject Knowledge & Accuracy"] || {}).concerns || []).length;
    if (score >= 8.7 && accuracyConcerns === 0) {
      return { label: "PASS", reason: "Strong, consistent performance across rapport, delivery and accuracy with no material gaps." };
    }
    if (score < 5.5 || accuracyConcerns >= 3) {
      return { label: "REJECT", reason: "Accuracy and delivery gaps are too significant to address with light coaching alone." };
    }
    return { label: "RETRAIN", reason: "The tutor shows clear potential but needs targeted refinement before independently handling another high-stakes demo." };
  }

  function forecastConversion(score, byCategory) {
    const parentStrengths = ((byCategory["Parent Communication & Trust"] || {}).strengths || []).length;
    const envConcerns = ((byCategory["Online Environment & Professionalism"] || {}).concerns || []).length;
    let level;
    if (score >= 8.5) level = "Yes";
    else if (score >= 7 && parentStrengths > 0) level = "Probably Yes";
    else if (score >= 7) level = "Unsure";
    else if (score >= 5.5) level = "Probably No";
    else level = "No";
    if (envConcerns > 0 && (level === "Yes")) level = "Probably Yes"; // polish issues cap the top forecast
    return { level };
  }

  function round(n) {
    return Math.round(n * 10) / 10;
  }

  function pct(n) {
    return Math.round((n / 10) * 100);
  }

  if (typeof module !== "undefined") {
    module.exports = { analyze, matchLine, genericRewrite, splitLines, round, pct, QUESTIONS, CATEGORIES, RULES, QUICK_CHIPS };
  } else {
    root.DemoLensEngine = { analyze, matchLine, genericRewrite, splitLines, round, pct, QUESTIONS, CATEGORIES, RULES, QUICK_CHIPS };
  }
})(typeof window !== "undefined" ? window : globalThis);
