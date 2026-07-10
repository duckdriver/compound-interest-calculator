(function () {
  "use strict";

  const el = (id) => document.getElementById(id);

  const inputs = {
    principal: el("principal"),
    rate: el("rate"),
    frequency: el("frequency"),
    years: el("years"),
    contribution: el("contribution"),
  };

  const currencyFull = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  });

  const currencyCompact = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
    notation: "compact",
    maximumFractionDigits: 1,
  });

  function computeSchedule(principal, ratePct, n, years, contribution) {
    const periodRate = ratePct / 100 / n;
    let balance = principal;
    let cumContrib = 0;
    let cumInterest = 0;
    const schedule = [{ year: 0, contrib: principal, interest: 0, balance: principal }];
    const totalPeriods = Math.round(years * n);

    for (let p = 1; p <= totalPeriods; p++) {
      balance += contribution;
      cumContrib += contribution;
      const interestThisPeriod = balance * periodRate;
      balance += interestThisPeriod;
      cumInterest += interestThisPeriod;

      if (p % n === 0) {
        schedule.push({
          year: p / n,
          contrib: principal + cumContrib,
          interest: cumInterest,
          balance: balance,
        });
      }
    }
    return schedule;
  }

  // Heckbert's "nice numbers" for axis ticks.
  function niceNumber(range, round) {
    const exponent = Math.floor(Math.log10(range));
    const fraction = range / Math.pow(10, exponent);
    let niceFraction;
    if (round) {
      if (fraction < 1.5) niceFraction = 1;
      else if (fraction < 3) niceFraction = 2;
      else if (fraction < 7) niceFraction = 5;
      else niceFraction = 10;
    } else {
      if (fraction <= 1) niceFraction = 1;
      else if (fraction <= 2) niceFraction = 2;
      else if (fraction <= 5) niceFraction = 5;
      else niceFraction = 10;
    }
    return niceFraction * Math.pow(10, exponent);
  }

  function niceTicks(maxValue, tickCountTarget) {
    if (maxValue <= 0) maxValue = 1;
    const range = niceNumber(maxValue, false);
    const step = niceNumber(range / (tickCountTarget - 1), true);
    const niceMax = Math.ceil(maxValue / step) * step;
    const ticks = [];
    for (let v = 0; v <= niceMax + step * 0.5; v += step) ticks.push(Math.round(v * 100) / 100);
    return { ticks, max: niceMax };
  }

  function niceYearStep(years) {
    const candidates = [1, 2, 5, 10, 20, 25, 50];
    for (const c of candidates) {
      if (years / c <= 10) return c;
    }
    return 50;
  }

  // ---- Chart rendering ----
  const svg = el("chart");
  const SVG_NS = "http://www.w3.org/2000/svg";
  const M = { left: 60, right: 14, top: 14, bottom: 28 };
  const W = 800, H = 480;
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const tooltipYear = el("tooltip-year");
  const tooltipContrib = el("tooltip-contrib");
  const tooltipInterest = el("tooltip-interest");
  const tooltipBalance = el("tooltip-balance");

  let currentSchedule = [];

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function render(schedule) {
    currentSchedule = schedule;
    svg.innerHTML = "";
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

    const maxYear = schedule[schedule.length - 1].year;
    const maxBalance = Math.max(...schedule.map((d) => d.balance));
    const { ticks: yTicks, max: yMax } = niceTicks(maxBalance, 5);

    const x = (year) => M.left + (maxYear === 0 ? 0 : (year / maxYear) * plotW);
    const y = (value) => M.top + plotH - (yMax === 0 ? 0 : (value / yMax) * plotH);

    // gridlines + y labels
    yTicks.forEach((t) => {
      svg.appendChild(svgEl("line", { class: "gridline", x1: M.left, x2: W - M.right, y1: y(t), y2: y(t) }));
      const label = svgEl("text", { class: "axis-label", x: M.left - 8, y: y(t) + 4, "text-anchor": "end" });
      label.textContent = currencyCompact.format(t);
      svg.appendChild(label);
    });

    // x axis baseline + labels
    svg.appendChild(svgEl("line", { class: "axis-line", x1: M.left, x2: W - M.right, y1: M.top + plotH, y2: M.top + plotH }));
    const yearStep = niceYearStep(maxYear || 1);
    for (let yr = 0; yr <= maxYear; yr += yearStep) {
      const label = svgEl("text", { class: "axis-label", x: x(yr), y: H - 8, "text-anchor": "middle" });
      label.textContent = "Yr " + yr;
      svg.appendChild(label);
    }
    if (maxYear % yearStep !== 0) {
      const label = svgEl("text", { class: "axis-label", x: x(maxYear), y: H - 8, "text-anchor": "middle" });
      label.textContent = "Yr " + maxYear;
      svg.appendChild(label);
    }

    // area 1: contributions (baseline -> contrib)
    let d1 = `M ${x(0)} ${y(0)}`;
    schedule.forEach((pt) => (d1 += ` L ${x(pt.year)} ${y(pt.contrib)}`));
    d1 += ` L ${x(maxYear)} ${y(0)} Z`;
    svg.appendChild(svgEl("path", { class: "area-1", d: d1 }));

    // area 2: interest (contrib -> balance), stacked
    let d2top = "";
    schedule.forEach((pt, i) => {
      d2top += `${i === 0 ? "M" : "L"} ${x(pt.year)} ${y(pt.balance)} `;
    });
    let d2bottom = "";
    for (let i = schedule.length - 1; i >= 0; i--) {
      d2bottom += `L ${x(schedule[i].year)} ${y(schedule[i].contrib)} `;
    }
    svg.appendChild(svgEl("path", { class: "area-2", d: d2top + d2bottom + "Z" }));

    // line: top of contributions (boundary)
    let dLine1 = "";
    schedule.forEach((pt, i) => {
      dLine1 += `${i === 0 ? "M" : "L"} ${x(pt.year)} ${y(pt.contrib)} `;
    });
    svg.appendChild(svgEl("path", { class: "line-1", d: dLine1 }));

    // line: top of balance
    let dLine2 = "";
    schedule.forEach((pt, i) => {
      dLine2 += `${i === 0 ? "M" : "L"} ${x(pt.year)} ${y(pt.balance)} `;
    });
    svg.appendChild(svgEl("path", { class: "line-2", d: dLine2 }));

    // permanent yearly markers on both lines
    schedule.forEach((pt) => {
      svg.appendChild(svgEl("circle", { cx: x(pt.year), cy: y(pt.contrib), r: 3, class: "marker-1" }));
      svg.appendChild(svgEl("circle", { cx: x(pt.year), cy: y(pt.balance), r: 3, class: "marker-2" }));
    });

    // hover layer
    const crosshair = svgEl("line", { class: "crosshair", x1: 0, x2: 0, y1: M.top, y2: M.top + plotH, visibility: "hidden" });
    svg.appendChild(crosshair);

    const dotRing1 = svgEl("circle", { r: 6, class: "dot-ring", visibility: "hidden" });
    const dot1 = svgEl("circle", { r: 4, class: "dot-1", visibility: "hidden" });
    const dotRing2 = svgEl("circle", { r: 6, class: "dot-ring", visibility: "hidden" });
    const dot2 = svgEl("circle", { r: 4, class: "dot-2", visibility: "hidden" });
    svg.appendChild(dotRing1);
    svg.appendChild(dot1);
    svg.appendChild(dotRing2);
    svg.appendChild(dot2);

    const overlay = svgEl("rect", {
      x: M.left,
      y: M.top,
      width: Math.max(plotW, 1),
      height: plotH,
      fill: "transparent",
      tabindex: "0",
      style: "cursor:crosshair;outline:none;",
    });
    svg.appendChild(overlay);

    let selectedIndex = schedule.length - 1;

    function showAt(index) {
      index = Math.max(0, Math.min(schedule.length - 1, index));
      selectedIndex = index;
      const pt = schedule[index];
      const px = x(pt.year);

      crosshair.setAttribute("x1", px);
      crosshair.setAttribute("x2", px);
      crosshair.setAttribute("visibility", "visible");

      [dotRing1, dot1].forEach((n) => n.setAttribute("cy", y(pt.contrib)));
      [dotRing1, dot1].forEach((n) => n.setAttribute("cx", px));
      [dotRing2, dot2].forEach((n) => n.setAttribute("cy", y(pt.balance)));
      [dotRing2, dot2].forEach((n) => n.setAttribute("cx", px));
      [dotRing1, dot1, dotRing2, dot2].forEach((n) => n.setAttribute("visibility", "visible"));

      tooltipYear.textContent = "Year " + pt.year;
      tooltipContrib.textContent = currencyFull.format(pt.contrib);
      tooltipInterest.textContent = currencyFull.format(pt.interest);
      tooltipBalance.textContent = currencyFull.format(pt.balance);
    }

    function nearestIndexAt(clientX) {
      const rect = svg.getBoundingClientRect();
      const relX = ((clientX - rect.left) / rect.width) * W;
      const yearAtPointer = maxYear === 0 ? 0 : ((relX - M.left) / plotW) * maxYear;
      return schedule.reduce((best, pt, i) =>
        Math.abs(pt.year - yearAtPointer) < Math.abs(schedule[best].year - yearAtPointer) ? i : best, 0);
    }

    overlay.addEventListener("pointerdown", (evt) => showAt(nearestIndexAt(evt.clientX)));
    overlay.addEventListener("pointermove", (evt) => showAt(nearestIndexAt(evt.clientX)));
    overlay.addEventListener("keydown", (evt) => {
      if (evt.key === "ArrowRight") { showAt(selectedIndex + 1); evt.preventDefault(); }
      if (evt.key === "ArrowLeft") { showAt(selectedIndex - 1); evt.preventDefault(); }
    });

    showAt(selectedIndex);
  }

  function renderTable(schedule) {
    const body = el("data-table-body");
    body.innerHTML = "";
    schedule.slice(1).forEach((pt) => {
      const tr = document.createElement("tr");
      const cells = [
        "Year " + pt.year,
        currencyFull.format(pt.contrib),
        currencyFull.format(pt.interest),
        currencyFull.format(pt.balance),
      ];
      cells.forEach((text) => {
        const td = document.createElement("td");
        td.textContent = text;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  function parseAmount(input) {
    return Math.max(0, parseFloat(input.value.replace(/,/g, "")) || 0);
  }

  const revealTile = el("reveal-tile");
  const revealValue = el("stat-passive-income");
  const revealHint = el("reveal-hint");
  let passiveIncomeValue = 0;
  let revealed = false;

  function resetReveal() {
    revealed = false;
    revealTile.classList.remove("revealed");
    revealValue.textContent = "Tap to reveal";
    revealHint.hidden = false;
  }

  function revealPassiveIncome() {
    if (revealed) return;
    revealed = true;
    revealTile.classList.add("revealed");
    revealHint.hidden = true;
    const duration = 700;
    const start = performance.now();
    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      revealValue.textContent = currencyFull.format(passiveIncomeValue * eased);
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  revealTile.addEventListener("click", revealPassiveIncome);

  function update() {
    const principal = parseAmount(inputs.principal);
    const rate = Math.max(0, parseFloat(inputs.rate.value) || 0);
    const n = parseInt(inputs.frequency.value, 10);
    const years = Math.min(60, Math.max(0, parseInt(inputs.years.value, 10) || 0));
    const contribution = parseAmount(inputs.contribution);

    const schedule = computeSchedule(principal, rate, n, years, contribution);
    const last = schedule[schedule.length - 1];

    el("stat-balance").textContent = currencyFull.format(last.balance);
    el("stat-contributed").textContent = currencyFull.format(last.contrib);
    el("stat-interest").textContent = currencyFull.format(last.interest);
    passiveIncomeValue = (last.balance * 0.04) / 12;
    resetReveal();

    render(schedule);
    renderTable(schedule);
  }

  function formatWithCommas(input) {
    input.addEventListener("input", () => {
      const digitsFromEnd = input.value.length - input.selectionStart;
      const digits = input.value.replace(/[^\d]/g, "");
      input.value = digits === "" ? "" : Number(digits).toLocaleString("en-US");
      const pos = Math.max(0, input.value.length - digitsFromEnd);
      input.setSelectionRange(pos, pos);
    });
  }
  formatWithCommas(inputs.principal);
  formatWithCommas(inputs.contribution);

  document.querySelectorAll(".stepper-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = el(btn.dataset.target);
      const current = parseAmount(input);
      const next = Math.max(0, current + 1000 * Number(btn.dataset.dir));
      input.value = next.toLocaleString("en-US");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });

  Object.values(inputs).forEach((input) => input.addEventListener("input", update));

  const results = el("results");
  const compoundBtn = el("compound-btn");
  compoundBtn.addEventListener("click", () => {
    results.hidden = false;
    update();
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const toggleBtn = el("table-toggle");
  const tableWrap = el("table-wrap");
  toggleBtn.addEventListener("click", () => {
    const willShow = tableWrap.hidden;
    tableWrap.hidden = !willShow;
    toggleBtn.setAttribute("aria-expanded", String(willShow));
    toggleBtn.textContent = willShow ? "Hide year-by-year table" : "Show year-by-year table";
  });

  window.addEventListener("resize", () => render(currentSchedule));

  update();
})();
