(function () {
  "use strict";

  const el = (id) => document.getElementById(id);

  const inputs = {
    targetIncome: el("target-income"),
    rate: el("rate"),
    years: el("years"),
  };

  const currencyFull = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  });

  function parseAmount(input) {
    return Math.max(0, parseFloat(input.value.replace(/,/g, "")) || 0);
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
  formatWithCommas(inputs.targetIncome);

  document.querySelectorAll(".stepper-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = el(btn.dataset.target);
      const current = parseAmount(input);
      const next = Math.max(0, current + 1000 * Number(btn.dataset.dir));
      input.value = next.toLocaleString("en-US");
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

    el("stat-freedom-number").textContent = currencyFull.format(freedomNumber);
    el("stat-required-monthly").textContent = currencyFull.format(requiredMonthly);

    el("explainer").textContent = `Invest ${currencyFull.format(requiredMonthly)} a month for ${years} years at ${rate}% and you'll have ${currencyFull.format(freedomNumber)} — enough to pay you ${currencyFull.format(targetIncome)} a month forever under the 4% rule.`;
  }

  const results = el("results");
  const freedomLayout = el("freedom-layout");
  el("inputs-form").addEventListener("submit", (evt) => {
    evt.preventDefault();
    results.hidden = false;
    freedomLayout.classList.add("revealed");
    calculate();
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
