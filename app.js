(function () {
  const E = window.DemoLensEngine;
  const { QUESTIONS, CATEGORIES, QUICK_CHIPS } = E;

  const $ = (id) => document.getElementById(id);
  let currentAnalysis = null;
  let customRules = loadCustomRules();

  /* ---------------- persistence ---------------- */
  function loadCustomRules() {
    try {
      return JSON.parse(localStorage.getItem("demolens_custom_rules") || "[]");
    } catch (e) {
      return [];
    }
  }
  function saveCustomRules() {
    try {
      localStorage.setItem("demolens_custom_rules", JSON.stringify(customRules));
    } catch (e) {}
  }
  function loadDraft() {
    try {
      return JSON.parse(localStorage.getItem("demolens_draft") || "null");
    } catch (e) {
      return null;
    }
  }
  function saveDraft() {
    try {
      localStorage.setItem(
        "demolens_draft",
        JSON.stringify({
          notes: $("roughNotes").value,
          teacher: $("teacherName").value,
          student: $("studentName").value,
          subject: $("subjectName").value,
          date: $("auditDate").value,
        })
      );
    } catch (e) {}
  }

  /* ---------------- tabs ---------------- */
  document.querySelectorAll("#tabbar button").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
  function switchView(view) {
    document.querySelectorAll("#tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    document.querySelectorAll("main .view").forEach((v) => v.classList.remove("active"));
    $(view + "View").classList.add("active");
    if (view === "dashboard" && currentAnalysis) renderDashboard(currentAnalysis);
    if (view === "report" && currentAnalysis) renderReport(currentAnalysis);
    if (view === "library") renderLibrary();
  }

  /* ---------------- theme ---------------- */
  const savedTheme = localStorage.getItem("demolens_theme");
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
  $("themeToggle").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("demolens_theme", next);
    $("themeToggle").textContent = next === "dark" ? "☀️" : "🌙";
  });
  $("themeToggle").textContent = document.documentElement.getAttribute("data-theme") === "dark" ? "☀️" : "🌙";

  /* ---------------- capture tab ---------------- */
  function renderChips() {
    const row = $("chipRow");
    row.innerHTML = "";
    QUICK_CHIPS.forEach((c) => row.appendChild(makeChip(c)));
    customRules.forEach((r) => {
      if (r.keys[0]) row.appendChild(makeChip(r.keys[0]));
    });
  }
  function makeChip(text) {
    const b = document.createElement("button");
    b.className = "chip";
    b.type = "button";
    b.textContent = text;
    b.addEventListener("click", () => {
      const ta = $("roughNotes");
      ta.value = ta.value && !ta.value.endsWith("\n") ? ta.value + "\n" + text : ta.value + text;
      ta.dispatchEvent(new Event("input"));
      ta.focus();
    });
    return b;
  }
  renderChips();

  const restored = loadDraft();
  if (restored) {
    $("roughNotes").value = restored.notes || "";
    $("teacherName").value = restored.teacher || "";
    $("studentName").value = restored.student || "";
    $("subjectName").value = restored.subject || "";
    $("auditDate").value = restored.date || "";
  }

  let liveTimer = null;
  $("roughNotes").addEventListener("input", () => {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      renderTimeline(E.analyze($("roughNotes").value, {}, customRules));
      saveDraft();
    }, 220);
  });
  ["teacherName", "studentName", "subjectName", "auditDate"].forEach((id) => $(id).addEventListener("input", saveDraft));

  function renderTimeline(analysis) {
    const box = $("timeline");
    if (!analysis.perLine.length) {
      box.innerHTML = '<div class="empty">Start typing on the left — matched observations will appear here as a timeline.</div>';
      return;
    }
    box.innerHTML = "";
    analysis.perLine.forEach((pl) => {
      if (pl.matched) {
        pl.rules.forEach((r) => box.appendChild(timelineItem(pl.text, r.issue, r.polarity, r.category)));
      } else {
        box.appendChild(timelineItem(pl.text, pl.text, "neutral", "General Observation"));
      }
    });
  }
  function timelineItem(orig, rewrite, polarity, category) {
    const div = document.createElement("div");
    div.className = "tl-item";
    div.innerHTML = `<div class="tl-dot ${polarity}"></div>
      <div class="tl-text">
        <div class="orig">"${escapeHtml(orig)}"</div>
        <div class="rewrite">${escapeHtml(rewrite)}</div>
        <div class="tl-cat">${escapeHtml(category)}</div>
      </div>`;
    return div;
  }

  $("analyzeBtn").addEventListener("click", () => {
    const meta = {
      teacher: $("teacherName").value.trim(),
      student: $("studentName").value.trim(),
      subject: $("subjectName").value.trim(),
      date: $("auditDate").value,
    };
    currentAnalysis = E.analyze($("roughNotes").value, meta, customRules);
    if (!currentAnalysis.lines.length) {
      toast("Add a few observation lines first.");
      return;
    }
    toast("Analyzed " + currentAnalysis.lines.length + " line(s).");
    switchView("dashboard");
  });

  $("loadSampleBtn").addEventListener("click", () => {
    $("roughNotes").value = [
      "good rapport through football",
      "contextual interaction at the end",
      "asked student to summarise",
      "parent communication strong",
      "background noise from fan",
      "opening was a little dull",
      "calculation mistake but corrected it",
      "used okay as filler many times",
      "grammar mistake",
      "workings not neat",
      "well prepared",
    ].join("\n");
    $("roughNotes").dispatchEvent(new Event("input"));
    toast("Sample notes loaded.");
  });

  $("clearBtn").addEventListener("click", () => {
    $("roughNotes").value = "";
    $("roughNotes").dispatchEvent(new Event("input"));
  });

  $("newAuditBtn").addEventListener("click", () => {
    if (!confirm("Start a new audit? This clears the current notes and draft report.")) return;
    ["roughNotes", "teacherName", "studentName", "subjectName", "auditDate"].forEach((id) => ($(id).value = ""));
    currentAnalysis = null;
    saveDraft();
    renderTimeline(E.analyze("", {}, customRules));
    switchView("capture");
    toast("Ready for a new audit.");
  });

  /* ---------------- dashboard ---------------- */
  function renderDashboard(a) {
    $("dashSub").textContent = a.meta.teacher || a.meta.student
      ? `${a.meta.teacher ? "Teacher: " + a.meta.teacher + "  " : ""}${a.meta.student ? "Student: " + a.meta.student : ""}`
      : "Auto-scored from your captured notes.";
    $("statScore").textContent = a.overall.score.toFixed(1);
    $("statDecision").innerHTML = `<span class="badge ${a.decision.label}">${a.decision.label}</span>`;
    $("statConversion").textContent = a.conversion.level;
    drawGauge(a.overall.score);

    const barsBox = $("categoryBars");
    if (!a.categoryScores.length) {
      barsBox.innerHTML = '<div class="empty">No categories scored yet.</div>';
    } else {
      barsBox.innerHTML = "";
      a.categoryScores.forEach((row) => {
        const pct = E.pct(row.score);
        const cls = row.score < 6 ? "low" : row.score < 8 ? "mid" : "";
        const el = document.createElement("div");
        el.className = "bar-row";
        el.innerHTML = `<div>${escapeHtml(row.category)}</div>
          <div class="bar-track"><div class="bar-fill ${cls}" style="width:${pct}%"></div></div>
          <div class="bar-score">${row.score.toFixed(1)}</div>`;
        barsBox.appendChild(el);
      });
    }

    const dashTl = $("dashTimeline");
    dashTl.innerHTML = "";
    let any = false;
    Object.keys(a.byCategory).forEach((cat) => {
      a.byCategory[cat].strengths.forEach((s) => {
        any = true;
        dashTl.appendChild(timelineItem(s.line, s.issue, "strength", cat));
      });
      a.byCategory[cat].concerns.forEach((c) => {
        any = true;
        dashTl.appendChild(timelineItem(c.line, c.issue, cat === "General Observation" ? "neutral" : "concern", cat));
      });
    });
    if (!any) dashTl.innerHTML = '<div class="empty">Nothing analyzed yet.</div>';
  }

  function drawGauge(score) {
    const svg = $("gauge");
    const pct = Math.max(0, Math.min(1, score / 10));
    const cx = 110, cy = 110, r = 90;
    const startAngle = Math.PI, endAngle = Math.PI - pct * Math.PI;
    const x1 = cx + r * Math.cos(Math.PI), y1 = cy + r * Math.sin(Math.PI);
    const x2 = cx + r * Math.cos(0), y2 = cy + r * Math.sin(0);
    const xp = cx + r * Math.cos(endAngle), yp = cy + r * Math.sin(endAngle);
    const large = pct > 0.5 ? 1 : 0;
    const color = score >= 8 ? "#1f8a5c" : score >= 6 ? "#c99b3b" : "#b3541e";
    svg.innerHTML = `
      <path d="M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}" stroke="var(--line)" stroke-width="16" fill="none" stroke-linecap="round"/>
      <path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${xp} ${yp}" stroke="${color}" stroke-width="16" fill="none" stroke-linecap="round"/>
      <text x="110" y="105" text-anchor="middle" font-size="30" font-weight="800" fill="var(--ink)">${score.toFixed(1)}</text>
      <text x="110" y="124" text-anchor="middle" font-size="11" fill="var(--muted)">out of 10</text>
    `;
  }

  /* ---------------- report ---------------- */
  function buildReportText(a, qid) {
    const strengthsAll = [];
    const concernsAll = [];
    Object.keys(a.byCategory).forEach((cat) => {
      a.byCategory[cat].strengths.forEach((s) => strengthsAll.push(Object.assign({ category: cat }, s)));
      a.byCategory[cat].concerns.forEach((c) => concernsAll.push(Object.assign({ category: cat }, c)));
    });
    const qItems = a.byQuestion[qid] || [];
    const qStrengths = qItems.filter((x) => x.polarity === "strength");
    const qConcerns = qItems.filter((x) => x.polarity === "concern" || x.polarity === "neutral");

    switch (qid) {
      case "q1": {
        let t = `Overall Score: ${a.overall.score.toFixed(1)}/10\n\n`;
        t += strengthsAll.length
          ? "The demo class showed real strengths: " + strengthsAll.map((s) => lower1(s.issue)).join(" ") + "\n\n"
          : "The demo class was reviewed against rapport, teaching effectiveness, communication and parent-handling criteria.\n\n";
        t += concernsAll.length
          ? "However, some areas held the session back: " + concernsAll.map((c) => lower1(c.issue)).join(" ") + "\n\n"
          : "No major concerns were flagged from the notes provided.\n\n";
        t += `Overall, the tutor shows ${a.decision.label === "PASS" ? "strong, independent-ready" : a.decision.label === "REJECT" ? "significant gaps in" : "good potential but needs refinement in"} teaching delivery, warranting a "${a.decision.label}" outcome.`;
        return t;
      }
      case "q2": {
        if (!a.categoryScores.length) return "(No categories were scored yet — analyze some notes first.)";
        return a.categoryScores
          .map((row) => {
            const eviS = a.byCategory[row.category].strengths.map((s) => s.issue).join(" ");
            const eviC = a.byCategory[row.category].concerns.map((c) => c.issue).join(" ");
            return `${row.category} — ${row.score.toFixed(1)}/10\nEvidence: ${(eviS + " " + eviC).trim() || "General impression from the session."}`;
          })
          .join("\n\n");
      }
      case "q3": {
        const cats = a.categoryScores.map((r) => r.category).join(", ") || "rapport, accuracy, communication and parent trust";
        return `A successful demo class gives the student a positive learning experience while giving the parent confidence in the tutor's subject knowledge, communication, professionalism and ability to read the child's needs — the tutor should be able to "sell" the lesson without any sales pitch.\n\nThe criteria used here (${cats}) were chosen because a demo has both an academic objective and a stakeholder-experience objective. Judging only on subject-matter delivery would miss how the session actually lands with the student and the parent evaluating it.`;
      }
      case "q4": {
        if (!qConcerns.length) return "No specific gaps were flagged from the notes provided — add more observation lines to populate this section.";
        return qConcerns
          .map((c, i) => `${i + 1}. ${c.issue}\nRequired change: ${c.recommendation}`)
          .join("\n\n");
      }
      case "q5": {
        const items = qItems.length ? qItems.map((x) => lower1(x.issue)).join(" ") : "The session did not include enough interaction cues to assess this fully.";
        return `Student engagement, drawn from the captured moments: ${items}`;
      }
      case "q6": {
        const items = qItems.length ? qItems.map((x) => lower1(x.issue)).join(" ") : "No parent-facing moments were captured in the notes.";
        return `From a parent's perspective: ${items}`;
      }
      case "q7": {
        let t = `Conversion Forecast: ${a.conversion.level}\n\n`;
        const supporting = qStrengths;
        const barriers = concernsAll.filter((c) => c.category === "Online Environment & Professionalism" || c.category === "Communication & Language");
        t += supporting.length ? "Supporting factors: " + supporting.map((s) => lower1(s.issue)).join(" ") + "\n\n" : "";
        t += barriers.length ? "Barriers to an immediate signup: " + barriers.map((c) => lower1(c.issue)).join(" ") : "No major barriers to signup were identified.";
        return t;
      }
      case "q8": {
        let t = strengthsAll.length ? "You did several things well: " + strengthsAll.map((s) => lower1(s.issue)).join(" ") + "\n\n" : "";
        t += "There are a few areas to focus on before your next demo:\n\n";
        t += (concernsAll.length ? concernsAll : [{ recommendation: "Keep building on this session's strengths." }])
          .map((c, i) => `${i + 1}. ${c.recommendation || c.issue}`)
          .join("\n");
        return t;
      }
      case "q9": {
        return [
          "Step 1 — Listen without becoming defensive: let the tutor fully explain their perspective before responding.",
          "Step 2 — Separate the student factor from tutor-controlled factors: student responsiveness varies, but keeping the class on-topic and interactive is the tutor's job either way.",
          "Step 3 — Refer to observable evidence: point to the specific moment and what could have been said or asked, rather than a general judgement.",
          "Step 4 — Explain the purpose of the criteria: they evaluate the full demo experience (student, parent, academic quality), and improving them directly helps the tutor's own conversion numbers.",
          "Step 5 — Acknowledge valid tutor concerns: if the student genuinely was unresponsive, discuss alternative techniques (simpler probing questions, more thinking time).",
          "Step 6 — Agree on measurable improvements: end with clear, specific expectations rather than an open argument.",
        ].join("\n");
      }
      case "q10": {
        const top = concernsAll.slice(0, 4).map((c) => "Address: " + lower1(c.recommendation));
        let t = "Target 1 — Improve Demo Preparedness & Professional Delivery\nBefore the next demo, the tutor must:\n";
        t += (top.length ? top : ["Conduct an audio/environment check.", "Keep expected solutions accessible and reviewed beforehand."]).map((x) => "• " + x).join("\n");
        t += "\n\nTarget 2 — Strengthen Student Interaction\nIncorporate purposeful student participation throughout the lesson, including probing questions and at least one learning-recall activity (e.g. asking the student to summarise a concept).";
        return t;
      }
      case "q11": {
        return `Final Decision: ${a.decision.label}\n\n${a.decision.reason}\n\nFrom an academic perspective, accuracy and clarity need to stay consistent session to session. From a business perspective, the demo must give parents confidence that their child will get a structured, professional, engaging experience. ${a.decision.label === "RETRAIN" ? "After demonstrating improvement against the PIP targets, the tutor can be reassessed for the next demo." : ""}`;
      }
      default:
        return "";
    }
  }

  function lower1(s) {
    if (!s) return "";
    return s.charAt(0).toLowerCase() + s.slice(1);
  }

  function renderReport(a) {
    const nav = $("qNav");
    nav.innerHTML = "";
    QUESTIONS.forEach((q) => {
      const link = document.createElement("a");
      link.href = "#report-" + q.id;
      link.textContent = "Q" + q.n;
      nav.appendChild(link);
    });

    const body = $("reportBody");
    body.innerHTML = "";
    QUESTIONS.forEach((q) => {
      const block = document.createElement("div");
      block.className = "q-block";
      block.id = "report-" + q.id;
      block.innerHTML = `<h3>${q.n}. ${escapeHtml(q.title)}</h3><div class="sub">${escapeHtml(q.prompt)}</div>
        <textarea id="ta-${q.id}" data-q="${q.id}"></textarea>`;
      body.appendChild(block);
      block.querySelector("textarea").value = buildReportText(a, q.id);
    });
  }

  function assembleFullReport() {
    let out = "QUALITY AUDITOR — DEMO CLASS EVALUATION\n";
    if (currentAnalysis && currentAnalysis.meta) {
      const m = currentAnalysis.meta;
      const line = [m.teacher && "Teacher: " + m.teacher, m.student && "Student: " + m.student, m.subject && "Subject: " + m.subject, m.date && "Date: " + m.date]
        .filter(Boolean)
        .join("  |  ");
      if (line) out += line + "\n";
    }
    out += "=".repeat(48) + "\n\n";
    QUESTIONS.forEach((q) => {
      const ta = $("ta-" + q.id);
      out += `${q.n}. ${q.title}\n${ta ? ta.value : ""}\n\n`;
    });
    return out.trim() + "\n";
  }

  $("copyReportBtn").addEventListener("click", () => {
    if (!currentAnalysis) return toast("Analyze notes first.");
    navigator.clipboard.writeText(assembleFullReport()).then(() => toast("Full report copied."));
  });
  $("downloadReportBtn").addEventListener("click", () => {
    if (!currentAnalysis) return toast("Analyze notes first.");
    const blob = new Blob([assembleFullReport()], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "demo-class-audit-report.txt";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Downloaded.");
  });
  $("printReportBtn").addEventListener("click", () => {
    if (!currentAnalysis) return toast("Analyze notes first.");
    window.print();
  });

  /* ---------------- library ---------------- */
  function renderLibrary() {
    const catSel = $("ruleCategory");
    if (!catSel.dataset.filled) {
      CATEGORIES.forEach((c) => {
        const o = document.createElement("option");
        o.value = c;
        o.textContent = c;
        catSel.appendChild(o);
      });
      catSel.dataset.filled = "1";
    }

    const list = $("customRuleList");
    $("customRuleCount").textContent = customRules.length ? `${customRules.length} custom rule(s) saved on this device.` : "No custom rules yet.";
    list.innerHTML = "";
    customRules.forEach((r, i) => {
      const el = document.createElement("div");
      el.className = "rule-item";
      el.innerHTML = `<div class="k">${escapeHtml(r.keys.join(", "))}</div>
        <div>${escapeHtml(r.issue)}</div>
        <span class="cat-tag">${escapeHtml(r.category)} · ${r.polarity}</span>
        <div class="buttons"><button class="btn danger small" data-i="${i}">Remove</button></div>`;
      el.querySelector("button").addEventListener("click", () => {
        customRules.splice(i, 1);
        saveCustomRules();
        renderLibrary();
        renderChips();
      });
      list.appendChild(el);
    });

    const ref = $("builtinRuleRef");
    if (!ref.dataset.filled) {
      const grouped = {};
      E.RULES.forEach((r) => {
        if (!grouped[r.category]) grouped[r.category] = [];
        grouped[r.category].push(r);
      });
      ref.innerHTML = Object.keys(grouped)
        .map(
          (cat) =>
            `<h3>${escapeHtml(cat)}</h3>` +
            grouped[cat]
              .map((r) => `<div class="rule-item"><div class="k">${escapeHtml(r.keys.slice(0, 3).join(", "))}${r.keys.length > 3 ? "…" : ""}</div><div>${escapeHtml(r.issue)}</div><span class="cat-tag">${r.polarity}</span></div>`)
              .join("")
        )
        .join("");
      ref.dataset.filled = "1";
    }
  }

  $("addRuleBtn").addEventListener("click", () => {
    const keys = $("ruleKeys").value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const issue = $("ruleIssue").value.trim();
    const recommendation = $("ruleRec").value.trim();
    const category = $("ruleCategory").value;
    const polarity = $("rulePolarity").value;
    if (!keys.length || !issue || !recommendation) {
      toast("Fill in trigger phrase, issue and recommendation.");
      return;
    }
    customRules.push({ keys, category, polarity, issue, recommendation, q: ["q1", "q2", "q4", polarity === "strength" ? "q8" : "q8"] });
    saveCustomRules();
    $("ruleKeys").value = "";
    $("ruleIssue").value = "";
    $("ruleRec").value = "";
    renderLibrary();
    renderChips();
    toast("Custom rule saved.");
  });

  /* ---------------- misc ---------------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }
  let toastTimer = null;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // initial timeline render (empty state or restored draft)
  renderTimeline(E.analyze($("roughNotes").value, {}, customRules));

  /* ---------------- PWA install + SW ---------------- */
  let deferredInstall = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstall = e;
    $("installBanner").classList.add("show");
  });
  $("installBtn").addEventListener("click", async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    $("installBanner").classList.remove("show");
  });
  window.addEventListener("appinstalled", () => $("installBanner").classList.remove("show"));

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
