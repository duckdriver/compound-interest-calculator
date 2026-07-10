(function () {
  "use strict";

  const el = (id) => document.getElementById(id);

  const inputs = {
    targetIncome: el("target-income"),
    rate: el("rate"),
    years: el("years"),
  };

  const freedomNumberStat = el("stat-freedom-number");
  const monthlyInvestmentTile = el("monthly-investment-tile");
  const explainerCard = el("explainer-card");
  const results = el("results");

  const currencyFull = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  });

  const numberOnly = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  function parseAmount(input) {
    return Math.max(0, parseFloat(input.value.replace(/,/g, "")) || 0);
  }

  function sizeToContent(input) {
    input.style.width = Math.max(1, input.value.length) + "ch";
  }

  function formatWithCommas(input, onChange) {
    input.addEventListener("input", () => {
      const digitsFromEnd = input.value.length - input.selectionStart;
      const digits = input.value.replace(/[^\d]/g, "");
      input.value = digits === "" ? "" : Number(digits).toLocaleString("en-US");
      const pos = Math.max(0, input.value.length - digitsFromEnd);
      input.setSelectionRange(pos, pos);
      sizeToContent(input);
      if (onChange) onChange();
    });
  }

  formatWithCommas(inputs.targetIncome, () => {
    const income = parseAmount(inputs.targetIncome);
    freedomNumberStat.value = numberOnly.format(Math.round(income * 300));
    sizeToContent(freedomNumberStat);
  });

  formatWithCommas(freedomNumberStat, () => {
    const freedomNumber = parseAmount(freedomNumberStat);
    inputs.targetIncome.value = Math.round((freedomNumber * 0.04) / 12).toLocaleString("en-US");
  });

  sizeToContent(freedomNumberStat);

  document.querySelectorAll(".stepper-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = el(btn.dataset.target);
      const step = Number(btn.dataset.step) || 1000;
      const current = parseAmount(input);
      const next = Math.max(0, current + step * Number(btn.dataset.dir));
      input.value = next.toLocaleString("en-US");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });

  function calculate() {
    const targetIncome = parseAmount(inputs.targetIncome);
    const rate = Math.max(0, parseFloat(inputs.rate.value) || 0);
    const years = Math.max(1, parseInt(inputs.years.value, 10) || 1);

    const freedomNumber = (targetIncome * 12) / 0.04;
    const i = rate / 100 / 12;
    const n = years * 12;
    const growthFactor = Math.pow(1 + i, n);
    const annuityFactor = i > 0 ? ((growthFactor - 1) / i) * (1 + i) : n;
    const requiredMonthly = freedomNumber / annuityFactor;

    freedomNumberStat.value = numberOnly.format(Math.round(freedomNumber));
    sizeToContent(freedomNumberStat);
    el("stat-required-monthly").textContent = currencyFull.format(requiredMonthly);

    el("explainer").textContent = `Invest ${currencyFull.format(requiredMonthly)} a month for ${years} years at ${rate}% and you'll have ${currencyFull.format(freedomNumber)} — enough to pay you ${currencyFull.format(targetIncome)} a month forever under the 4% rule.`;

    monthlyInvestmentTile.hidden = false;
    explainerCard.hidden = false;
  }

  el("inputs-form").addEventListener("submit", (evt) => {
    evt.preventDefault();
    calculate();
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
