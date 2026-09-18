/* DemoLens — rule library
 * 100% offline, deterministic. No AI / network calls.
 * Every rule: keys (trigger phrases, incl. Hinglish), category, polarity
 * (+1 strength / -1 concern), issue sentence, recommendation sentence.
 * Matched against the 11 audit questions from the sample assignment.
 */

const QUESTIONS = [
  { id: "q1", n: 1, title: "Executive Assessment", prompt: "Overall quality, strengths, weaknesses, concise explanation of the score." },
  { id: "q2", n: 2, title: "Parameterized Scoring Framework", prompt: "Criterion-by-criterion score with evidence-based reasoning." },
  { id: "q3", n: 3, title: "Quality Standard Explanation", prompt: "Why these criteria matter for a successful demo." },
  { id: "q4", n: 4, title: "Critical Gap Analysis", prompt: "Key improvement areas and the exact required changes." },
  { id: "q5", n: 5, title: "Student Engagement & Experience", prompt: "Interest, focus, comfort, and truly engaging moments." },
  { id: "q6", n: 6, title: "Parental Trust & Confidence", prompt: "Authority, empathy, subject knowledge and parent confidence." },
  { id: "q7", n: 7, title: "Conversion Forecasting", prompt: "Factors that support or prevent signup." },
  { id: "q8", n: 8, title: "Actionable Feedback Communication", prompt: "Supportive coaching feedback balancing strengths and fixes." },
  { id: "q9", n: 9, title: "Handling Tutor Pushback", prompt: "Evidence-based response to disagreement or tutor concerns." },
  { id: "q10", n: 10, title: "Performance Improvement Plan (PIP)", prompt: "1–2 measurable targets before the next demo." },
  { id: "q11", n: 11, title: "Final Decision", prompt: "Pass / Retrain / Reject with academic and business reasoning." },
];

// categories map to scoring-grid rows (Q2) and gap-analysis groups (Q4)
const CATEGORIES = [
  "Rapport & Student Comfort",
  "Conceptual Explanation & Teaching Effectiveness",
  "Subject Knowledge & Accuracy",
  "Communication & Language",
  "Online Environment & Professionalism",
  "Lesson Structure & Pacing",
  "Student Understanding Checks",
  "Parent Communication & Trust",
  "Class Closure & Engagement",
];

/* polarity: "strength" | "concern" | "neutral" */
const RULES = [
  // ---- Rapport & comfort ----
  { keys: ["good rapport", "rapport was good", "rapport strong", "built rapport", "good connection", "student comfortable", "student was comfortable", "student relaxed"],
    category: "Rapport & Student Comfort", polarity: "strength", q: ["q1", "q5", "q6"],
    issue: "The teacher established good rapport and created a comfortable environment for the student.",
    recommendation: "Continue using relevant, student-centred conversation to keep the student relaxed before moving into academic content." },
  { keys: ["football", "cricket", "student interest", "personal conversation", "connected through", "hobby", "favourite topic", "favorite topic"],
    category: "Rapport & Student Comfort", polarity: "strength", q: ["q1", "q5"],
    issue: "The teacher used a relevant personal or interest-based conversation (e.g. a hobby or sport) to build rapport with the student.",
    recommendation: "Continue opening with a brief, relevant personal interaction before transitioning into the academic portion." },
  { keys: ["opening dull", "introduction dull", "intro dull", "opening not energetic", "less energetic", "not energetic", "weak opening", "flat opening", "boring opening", "little dull", "bit dull", "a little dull"],
    category: "Rapport & Student Comfort", polarity: "concern", q: ["q1", "q4", "q8", "q10"],
    issue: "The opening/introduction could have been more energetic and engaging.",
    recommendation: "Use a warmer, more energetic introduction, followed by a brief relevant interaction before moving into the academic portion." },
  { keys: ["cold opening", "no icebreaker", "jumped straight into"],
    category: "Rapport & Student Comfort", polarity: "concern", q: ["q1", "q4"],
    issue: "The class moved into academic content without a warm-up or icebreaker.",
    recommendation: "Begin with a short, relevant icebreaker before starting the academic portion." },

  // ---- Conceptual explanation / teaching effectiveness ----
  { keys: ["good explanation", "explained well", "clear explanation", "explained clearly", "concept clear"],
    category: "Conceptual Explanation & Teaching Effectiveness", polarity: "strength", q: ["q1", "q2"],
    issue: "The concept was explained clearly and in a way the student could follow.",
    recommendation: "Continue using clear explanations and connect each step logically to the next." },
  { keys: ["didn't explain why", "did not explain why", "not explain why", "no why", "didn't explain", "did not explain", "not explained"],
    category: "Conceptual Explanation & Teaching Effectiveness", polarity: "concern", q: ["q2", "q4"],
    issue: "The reasoning behind a step was not explained sufficiently — the teacher showed the 'how' without the 'why'.",
    recommendation: "Explain why a step or formula is used and connect it to the underlying concept, not only the procedure." },
  { keys: ["need more examples", "needs more examples", "more examples", "give more examples", "lack of examples"],
    category: "Conceptual Explanation & Teaching Effectiveness", polarity: "concern", q: ["q2", "q4"],
    issue: "Additional worked examples would have strengthened the explanation.",
    recommendation: "Include a few additional examples, preferably of varied difficulty, to reinforce the concept." },
  { keys: ["abrupt transition", "suddenly jumped", "jumped from", "sudden transition", "jumped topic", "abrupt topic change"],
    category: "Conceptual Explanation & Teaching Effectiveness", polarity: "concern", q: ["q4"],
    issue: "The transition between concepts or topics was abrupt.",
    recommendation: "Briefly explain the connection between two concepts before moving to the next topic." },

  // ---- Subject knowledge & accuracy ----
  { keys: ["calculation mistake", "calculation error", "wrong calculation", "arithmetic mistake", "arithmetic error"],
    category: "Subject Knowledge & Accuracy", polarity: "concern", q: ["q1", "q2", "q4"],
    issue: "A calculation error was observed during the solution.",
    recommendation: "Keep a copy of the expected solution/working steps accessible and verify the key questions before the demo." },
  { keys: ["wrong answer", "incorrect answer", "final answer wrong", "answer was wrong", "answer is wrong"],
    category: "Subject Knowledge & Accuracy", polarity: "concern", q: ["q1", "q2", "q4"],
    issue: "An incorrect final answer was presented during the session.",
    recommendation: "Verify the solution and final answer against a prepared answer key before presenting it to the student." },
  { keys: ["corrected mistake", "corrected the mistake", "self corrected", "identified mistake", "caught her own mistake", "caught his own mistake", "acknowledged the error", "fixed the error"],
    category: "Subject Knowledge & Accuracy", polarity: "strength", q: ["q1", "q2"],
    issue: "The teacher recognised and corrected the error during the session, demonstrating accountability.",
    recommendation: "Retain this willingness to acknowledge and fix errors, while strengthening preparation to prevent avoidable ones." },
  { keys: ["well prepared", "good preparation", "was prepared", "lesson prepared"],
    category: "Subject Knowledge & Accuracy", polarity: "strength", q: ["q1", "q2"],
    issue: "The teacher appeared well prepared with the lesson content overall.",
    recommendation: "Maintain the same level of preparation and ensure expected solutions/key questions stay readily accessible." },

  // ---- Communication & language ----
  { keys: ["okay filler", "used okay", "repeated okay", "filler word", "filler words", "said okay many times", "used okay many times", "too many okays"],
    category: "Communication & Language", polarity: "concern", q: ["q1", "q2", "q4", "q8", "q10"],
    issue: "The filler word \"okay\" (or a similar filler) was used repeatedly during the session.",
    recommendation: "Replace unnecessary fillers with purposeful transitions such as \"Let's look at the next step\" or a short, confident pause." },
  { keys: ["grammar mistake", "grammatical error", "grammar error", "language mistake", "english mistake"],
    category: "Communication & Language", polarity: "concern", q: ["q1", "q2", "q4", "q8", "q10"],
    issue: "A minor grammatical or language error was observed during the session.",
    recommendation: "Maintain greater awareness of sentence construction and use simple, grammatically accurate language throughout." },
  { keys: ["voice good", "voice was good", "clear voice", "voice okay", "voice was okay", "communication clear"],
    category: "Communication & Language", polarity: "strength", q: ["q1", "q2"],
    issue: "The teacher's verbal delivery and voice were generally clear.",
    recommendation: "Maintain this clarity while continuing to minimise unnecessary filler words." },
  { keys: ["too fast", "went too fast", "speaking too fast", "explained too fast", "teacher too fast", "pace fast", "spoke fast"],
    category: "Communication & Language", polarity: "concern", q: ["q2", "q4"],
    issue: "The explanation was delivered at a relatively fast pace at points.",
    recommendation: "Slow down at important steps and allow sufficient time for the student to process the explanation." },
  { keys: ["too slow", "went too slow", "pace slow", "dragging"],
    category: "Communication & Language", polarity: "concern", q: ["q2", "q4"],
    issue: "The lesson progressed at a relatively slow pace at points.",
    recommendation: "Maintain a slightly faster, more consistent pace while still allowing time for key explanations." },

  // ---- Online environment / professionalism ----
  { keys: ["background noise", "fan noise", "noise from fan", "surrounding noise", "audio noise", "noisy background"],
    category: "Online Environment & Professionalism", polarity: "concern", q: ["q1", "q4", "q7", "q8", "q10"],
    issue: "There was noticeable background noise (possibly a fan or the surrounding environment) during the session.",
    recommendation: "Conduct a quick audio/environment check before class and minimise avoidable sources of background noise." },
  { keys: ["audio issue", "mic issue", "microphone issue", "bad audio", "unclear audio", "audio problem"],
    category: "Online Environment & Professionalism", polarity: "concern", q: ["q1", "q4", "q7"],
    issue: "The audio/microphone setup affected the clarity of the online session.",
    recommendation: "Check the microphone and audio setup before starting the class to ensure clear, professional communication." },
  { keys: ["good lighting", "clean background", "professional setup", "clean setup"],
    category: "Online Environment & Professionalism", polarity: "strength", q: ["q1", "q6"],
    issue: "The teacher maintained a clean, professional on-camera setup.",
    recommendation: "Continue maintaining this professional environment for future sessions." },

  // ---- Lesson structure & pacing ----
  { keys: ["workings not neat", "working not neat", "messy workings", "untidy workings", "writing not neat", "calculation not neat", "presentation messy", "handwriting messy"],
    category: "Lesson Structure & Pacing", polarity: "concern", q: ["q1", "q2", "q4", "q8", "q10"],
    issue: "The mathematical workings could have been presented more neatly.",
    recommendation: "Present calculations in a clearly structured, step-by-step format with sufficient spacing so the student and parent can follow." },
  { keys: ["good structure", "well structured", "organised lesson", "organized lesson", "clear structure"],
    category: "Lesson Structure & Pacing", polarity: "strength", q: ["q1", "q2"],
    issue: "The lesson was conducted in a clear, organised structure.",
    recommendation: "Continue maintaining this level of structure and organisation across future demos." },
  { keys: ["record of topics", "maintained a record", "kept notes of topics", "topic log"],
    category: "Lesson Structure & Pacing", polarity: "strength", q: ["q1", "q6"],
    issue: "The teacher maintained a record of the topics covered during the session.",
    recommendation: "Continue keeping a topic log — it supports both the closing summary and parent communication." },

  // ---- Student understanding checks ----
  { keys: ["student confused", "kid confused", "student was confused", "looked confused", "seemed confused"],
    category: "Student Understanding Checks", polarity: "concern", q: ["q2", "q4", "q5"],
    issue: "The student appeared to require additional clarification at a point in the session.",
    recommendation: "Pause and use a simple probing question or brief re-explanation to check understanding before progressing." },
  { keys: ["didn't check understanding", "did not check understanding", "no check for understanding", "didn't ask questions", "no probing questions"],
    category: "Student Understanding Checks", polarity: "concern", q: ["q2", "q4", "q5"],
    issue: "There was limited evidence of a check for student understanding before moving on.",
    recommendation: "Include purposeful probing questions and brief checks for understanding before advancing to the next concept." },
  { keys: ["asked student to summarise", "asked student to summarize", "student summarised", "student summarized", "student summarise class", "student recap"],
    category: "Student Understanding Checks", polarity: "strength", q: ["q1", "q5", "q6", "q8"],
    issue: "The teacher asked the student to summarise the learning at the end of the class — a strong recall-and-understanding check.",
    recommendation: "Continue using learning-recall activities such as asking the student to explain or summarise a concept." },
  { keys: ["not engaging", "boring", "less engaging", "low engagement"],
    category: "Student Understanding Checks", polarity: "concern", q: ["q4", "q5"],
    issue: "A portion of the session felt routine rather than engaging.",
    recommendation: "Use purposeful questions, relatable examples, and brief interaction to increase student participation." },

  // ---- Parent communication & closure ----
  { keys: ["parent communication strong", "good parent communication", "parent communication good", "parents understood", "communicated with parents", "clear overview to parents"],
    category: "Parent Communication & Trust", polarity: "strength", q: ["q1", "q6", "q7"],
    issue: "The teacher communicated effectively with the parents and gave a clear overview of the student's strengths and areas of improvement.",
    recommendation: "Continue giving parents a concise closing summary of what was taught along with the student's strengths and areas for growth." },
  { keys: ["good closure", "class closure good", "strong closure", "good closing", "ended class well"],
    category: "Parent Communication & Trust", polarity: "strength", q: ["q1", "q5"],
    issue: "The class closure was handled effectively rather than ending abruptly.",
    recommendation: "Continue ending sessions with a clear recap and a statement of the student's learning progress." },
  { keys: ["handed to ac", "ended class abruptly", "no closing summary", "no parent summary"],
    category: "Parent Communication & Trust", polarity: "concern", q: ["q6", "q7"],
    issue: "The session ended without a detailed closing summary for the parent.",
    recommendation: "Close every demo with a short summary of what was covered plus the student's strengths and areas of improvement." },
];

// quick-tap chips shown in Capture tab — common observations, tuned to the sample transcript style
const QUICK_CHIPS = [
  "good rapport through football",
  "asked student to summarise",
  "parent communication strong",
  "background noise from fan",
  "calculation mistake but corrected it",
  "used okay as filler many times",
  "workings not neat",
  "opening was a little dull",
  "didn't explain why",
  "student looked confused",
  "well prepared",
  "good closure",
];

const DemoLensRules = { QUESTIONS, CATEGORIES, RULES, QUICK_CHIPS };
if (typeof module !== "undefined") {
  module.exports = DemoLensRules;
}
if (typeof window !== "undefined") {
  window.DemoLensRules = DemoLensRules;
}
