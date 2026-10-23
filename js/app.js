(() => {
  "use strict";
  const {
    schedule,
    STORAGE_KEY,
    findCycle,
    daysBetween,
    parseAmount,
    createPurchaseStore,
    loadPurchases,
    totalCents,
  } = window.BcpCalculator;
  const moneyFormatter = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  });
  const dateFormatter = new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const weekdayFormatter = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
  });
  const $ = (id) => document.getElementById(id);
  const themeToggle = $("themeToggle");
  function syncThemeButton() {
    const dark = document.documentElement.dataset.theme === "dark";
    themeToggle.setAttribute("aria-pressed", String(dark));
    themeToggle.title = dark ? "Cambiar a claro" : "Cambiar a oscuro";
    $("themeLabel").textContent = dark ? "Oscuro" : "Claro";
    $("themeSun").toggleAttribute("hidden", dark);
    $("themeMoon").toggleAttribute("hidden", !dark);
  }
  themeToggle.addEventListener("click", () => {
    window.setCalculatorTheme(
      document.documentElement.dataset.theme === "dark" ? "light" : "dark",
    );
    syncThemeButton();
  });
  new MutationObserver(syncThemeButton).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  syncThemeButton();
  const fmtMoney = (n) => moneyFormatter.format(n);
  const toDate = (iso) => new Date(iso + "T12:00:00");
  const fmtDate = (iso) => dateFormatter.format(toDate(iso));
  function todayISO() {
    const d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }
  const dateInput = $("purchaseDate"),
    amountInput = $("purchaseAmount");
  dateInput.min = schedule[0].start;
  dateInput.max = schedule[schedule.length - 1].end;
  dateInput.value = todayISO();
  function fieldError(input, id, message) {
    $(id).textContent = message;
    input.setAttribute("aria-invalid", String(Boolean(message)));
  }
  function amountValid() {
    return (
      parseAmount(amountInput.value) !== null && amountInput.validity.valid
    );
  }
  function renderSchedule(iso) {
    $("scheduleBody").innerHTML = schedule
      .map(
        (s) =>
          '<tr class="' +
          (iso >= s.start && iso <= s.end ? "highlight" : "") +
          '"><td>' +
          s.cycle +
          "</td><td>" +
          fmtDate(s.start) +
          "</td><td>" +
          fmtDate(s.end) +
          "</td><td>" +
          fmtDate(s.due) +
          "</td></tr>",
      )
      .join("");
  }
  function validateInputs() {
    const date = dateInput.value;
    const cycle = findCycle(date);
    const cents = parseAmount(amountInput.value);
    return {
      date,
      cycle,
      cents,
      dateError: !date
        ? "Selecciona una fecha de compra."
        : !cycle
          ? "Esta fecha está fuera del cronograma disponible."
          : "",
      amountError:
        (amountInput.value !== "" || amountInput.validity.badInput) &&
        !amountValid()
          ? "Ingresa un monto mayor a S/ 0, con hasta dos decimales."
          : "",
    };
  }
  function calculatePayment(date, cycle, cents) {
    if (!cycle) return null;
    return { cycle, cents, days: daysBetween(date, cycle.due) };
  }
  function renderResult(payment, date) {
    $("result").classList.toggle("invalid", !payment);
    $("metrics").hidden = !payment;
    $("resultLabel").textContent = payment
      ? "Fecha límite de pago"
      : "Sin fecha de pago";
    $("dueDate").textContent = payment
      ? fmtDate(payment.cycle.due)
      : date
        ? "Fecha no disponible"
        : "Elige una fecha";
    $("weekday").textContent = payment
      ? weekdayFormatter.format(toDate(payment.cycle.due))
      : "";
    $("rNotice").textContent = payment
      ? "El monto indicado no representa el total de tu estado de cuenta."
      : "Consulta una compra entre el 25 dic 2025 y el 24 dic 2026.";
    if (!payment) return;
    $("rAmount").textContent =
      payment.cents !== null ? fmtMoney(payment.cents / 100) : "No indicado";
    $("rCycle").textContent = payment.cycle.cycle;
    $("rClose").textContent = fmtDate(payment.cycle.end);
    $("rDays").textContent = payment.days + " días";
  }
  function updateCalculation() {
    const inputs = validateInputs();
    fieldError(dateInput, "dateError", inputs.dateError);
    fieldError(amountInput, "amountError", inputs.amountError);
    renderResult(
      calculatePayment(
        inputs.date,
        inputs.cycle,
        inputs.amountError ? null : inputs.cents,
      ),
      inputs.date,
    );
    renderSchedule(inputs.date);
    return inputs;
  }
  function storageFailure(
    message = "No se pudo guardar en este navegador. Las compras de esta sesión pueden perderse al cerrar o recargar.",
  ) {
    $("storageNotice").textContent = message;
  }
  // Accessing localStorage itself can throw when browser storage is blocked.
  let loaded;
  try {
    loaded = loadPurchases(localStorage);
  } catch (error) {
    loaded = { purchases: [], error };
  }
  const purchaseStore = createPurchaseStore(loaded.purchases);
  if (loaded.error)
    storageFailure(
      "No se pudieron leer las compras guardadas. Los datos anteriores se conservarán hasta que guardes o elimines una compra.",
    );
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(purchaseStore.list()));
      $("storageNotice").textContent =
        "Tus compras se guardan en este navegador.";
      return true;
    } catch {
      storageFailure();
      return false;
    }
  }
  function feedback(message, undo = false) {
    $("feedback").hidden = false;
    $("feedbackText").textContent = message;
    $("undoBtn").hidden = !undo;
  }
  function renderPurchases() {
    const purchases = purchaseStore.list();
    const total = totalCents(purchases);
    $("grandTotal").textContent = fmtMoney(total / 100);
    const list = $("purchaseList");
    list.replaceChildren();
    if (!purchases.length) {
      list.innerHTML =
        '<div class="empty"><strong>Organiza tu próximo pago</strong><p>Ingresa la fecha y el monto arriba, y selecciona “Guardar esta compra”.</p></div>';
      return;
    }
    const groups = new Map();
    for (const p of purchases) {
      const due = findCycle(p.date).due;
      if (!groups.has(due)) groups.set(due, []);
      groups.get(due).push(p);
    }
    for (const [due, items] of [...groups].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const group = document.createElement("details");
      group.open = true;
      const summary = document.createElement("summary");
      summary.textContent =
        fmtDate(due) +
        " · " +
        items.length +
        " compra" +
        (items.length === 1 ? "" : "s");
      const sum = document.createElement("span");
      sum.className = "group-total";
      sum.textContent = fmtMoney(items.reduce((n, p) => n + p.cents, 0) / 100);
      summary.append(sum);
      group.append(summary);
      for (const p of items.sort((a, b) => a.date.localeCompare(b.date))) {
        const row = document.createElement("div");
        row.className = "purchase";
        const main = document.createElement("div");
        main.className = "purchase-main";
        main.textContent = "Compra del " + fmtDate(p.date);
        const money = document.createElement("span");
        money.className = "money";
        money.textContent = fmtMoney(p.cents / 100);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "delete";
        button.textContent = "Eliminar";
        button.setAttribute(
          "aria-label",
          "Eliminar compra del " +
            fmtDate(p.date) +
            " de " +
            fmtMoney(p.cents / 100),
        );
        button.addEventListener("click", () => {
          purchaseStore.remove(p.id);
          const saved = persist();
          renderPurchases();
          feedback(
            saved
              ? "Compra eliminada."
              : "Compra eliminada solo en esta sesión; no se pudo actualizar el almacenamiento.",
            true,
          );
          $("undoBtn").focus();
        });
        row.append(main, money, button);
        group.append(row);
      }
      list.append(group);
    }
  }
  function savePurchase(event) {
    event.preventDefault();
    const inputs = updateCalculation();
    if (inputs.dateError) {
      dateInput.focus();
      return;
    }
    if (!amountValid()) {
      fieldError(
        amountInput,
        "amountError",
        "Ingresa un monto válido mayor a S/ 0, con hasta dos decimales.",
      );
      amountInput.focus();
      return;
    }
    try {
      purchaseStore.add({
        id: crypto.randomUUID(),
        date: inputs.date,
        cents: inputs.cents,
      });
    } catch {
      fieldError(
        amountInput,
        "amountError",
        "No se pudo registrar la compra. Comprueba que el total no exceda el rango permitido.",
      );
      amountInput.focus();
      return;
    }
    const saved = persist();
    renderPurchases();
    feedback(
      saved
        ? "Compra guardada para el " + fmtDate(inputs.cycle.due) + "."
        : "Compra registrada solo en esta sesión; no se pudo guardar en este navegador.",
    );
    amountInput.value = "";
    updateCalculation();
    amountInput.focus();
  }
  function restorePurchase() {
    if (!purchaseStore.undo()) return;
    const saved = persist();
    renderPurchases();
    feedback(
      saved
        ? "Compra restaurada."
        : "Compra restaurada solo en esta sesión; no se pudo guardar en este navegador.",
    );
    amountInput.focus();
  }
  $("purchaseForm").addEventListener("submit", savePurchase);
  $("undoBtn").addEventListener("click", restorePurchase);
  for (const input of [dateInput, amountInput]) {
    input.addEventListener("input", updateCalculation);
    input.addEventListener("change", updateCalculation);
  }
  updateCalculation();
  renderPurchases();
})();
