/* Shared calculation and purchase rules, usable in browsers and Node.js. */
(function (root) {
  "use strict";

  const DAY_MS = 86_400_000;
  const STORAGE_KEY = "bcp-purchases-v1";
  const schedule = Object.freeze(
    [
      {
        cycle: "Enero 2026",
        start: "2025-12-25",
        end: "2026-01-23",
        due: "2026-02-23",
      },
      {
        cycle: "Febrero 2026",
        start: "2026-01-24",
        end: "2026-02-25",
        due: "2026-03-23",
      },
      {
        cycle: "Marzo 2026",
        start: "2026-02-26",
        end: "2026-03-25",
        due: "2026-04-21",
      },
      {
        cycle: "Abril 2026",
        start: "2026-03-26",
        end: "2026-04-24",
        due: "2026-05-20",
      },
      {
        cycle: "Mayo 2026",
        start: "2026-04-25",
        end: "2026-05-25",
        due: "2026-06-22",
      },
      {
        cycle: "Junio 2026",
        start: "2026-05-26",
        end: "2026-06-25",
        due: "2026-07-21",
      },
      {
        cycle: "Julio 2026",
        start: "2026-06-26",
        end: "2026-07-24",
        due: "2026-08-20",
      },
      {
        cycle: "Agosto 2026",
        start: "2026-07-25",
        end: "2026-08-25",
        due: "2026-09-22",
      },
      {
        cycle: "Septiembre 2026",
        start: "2026-08-26",
        end: "2026-09-25",
        due: "2026-10-20",
      },
      {
        cycle: "Octubre 2026",
        start: "2026-09-26",
        end: "2026-10-23",
        due: "2026-11-23",
      },
      {
        cycle: "Noviembre 2026",
        start: "2026-10-24",
        end: "2026-11-25",
        due: "2026-12-22",
      },
      {
        cycle: "Diciembre 2026",
        start: "2026-11-26",
        end: "2026-12-24",
        due: "2027-01-20",
      },
    ].map(Object.freeze),
  );

  function isValidDate(iso) {
    if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso))
      return false;
    const date = new Date(iso + "T00:00:00Z");
    return (
      Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso
    );
  }

  function findCycle(iso) {
    if (!isValidDate(iso)) return null;
    return (
      schedule.find((cycle) => iso >= cycle.start && iso <= cycle.end) || null
    );
  }

  function daysBetween(start, end) {
    if (!isValidDate(start) || !isValidDate(end))
      throw new RangeError("Fecha inválida.");
    return (
      (Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) /
      DAY_MS
    );
  }

  // Parse decimal text directly so rounding cannot turn an invalid amount into a valid one.
  function parseAmount(value) {
    if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value))
      return null;
    const [whole, fraction = ""] = value.split(".");
    const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
    return cents > 0n && cents <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(cents)
      : null;
  }

  function validPurchase(purchase) {
    return Boolean(
      purchase &&
      typeof purchase.id === "string" &&
      purchase.id.trim() &&
      findCycle(purchase.date) &&
      Number.isSafeInteger(purchase.cents) &&
      purchase.cents > 0,
    );
  }

  function totalCents(purchases) {
    let total = 0;
    for (const purchase of purchases) {
      if (
        !validPurchase(purchase) ||
        purchase.cents > Number.MAX_SAFE_INTEGER - total
      ) {
        throw new RangeError("Compra o total fuera del rango permitido.");
      }
      total += purchase.cents;
    }
    return total;
  }

  function validatePurchases(purchases) {
    if (!Array.isArray(purchases))
      throw new TypeError("El registro debe ser una lista.");
    totalCents(purchases);
    if (
      new Set(purchases.map((purchase) => purchase.id)).size !==
      purchases.length
    ) {
      throw new TypeError("El registro contiene identificadores duplicados.");
    }
    return purchases.map(({ id, date, cents }) => ({ id, date, cents }));
  }

  function createPurchaseStore(initial = []) {
    let purchases = validatePurchases(initial);
    let removed = null;
    return {
      list: () => purchases.map((purchase) => ({ ...purchase })),
      add(purchase) {
        purchases = validatePurchases([...purchases, purchase]);
        removed = null;
      },
      remove(id) {
        const match = purchases.find((purchase) => purchase.id === id);
        if (!match) return false;
        removed = match;
        purchases = purchases.filter((purchase) => purchase.id !== id);
        return true;
      },
      undo() {
        if (!removed) return false;
        purchases = validatePurchases([...purchases, removed]);
        removed = null;
        return true;
      },
    };
  }

  function loadPurchases(storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      return {
        purchases: raw === null ? [] : validatePurchases(JSON.parse(raw)),
        error: null,
      };
    } catch (error) {
      return { purchases: [], error };
    }
  }

  const api = Object.freeze({
    schedule,
    STORAGE_KEY,
    isValidDate,
    findCycle,
    daysBetween,
    parseAmount,
    validPurchase,
    totalCents,
    validatePurchases,
    createPurchaseStore,
    loadPurchases,
  });
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BcpCalculator = api;
})(globalThis);
