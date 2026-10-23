const { test } = require("node:test");
const assert = require("node:assert/strict");
const calculator = require("../js/calculator.js");
const {
  schedule,
  findCycle,
  daysBetween,
  isValidDate,
  parseAmount,
  createPurchaseStore,
  loadPurchases,
  validatePurchases,
} = calculator;
const purchase = (id = "a", cents = 100, date = "2026-01-01") => ({
  id,
  cents,
  date,
});

test("Each cycle includes both boundaries and has the expected due date", () => {
  const dueDates = [
    "2026-02-23",
    "2026-03-23",
    "2026-04-21",
    "2026-05-20",
    "2026-06-22",
    "2026-07-21",
    "2026-08-20",
    "2026-09-22",
    "2026-10-20",
    "2026-11-23",
    "2026-12-22",
    "2027-01-20",
  ];
  schedule.forEach((cycle, index) => {
    assert.equal(findCycle(cycle.start).due, dueDates[index]);
    assert.equal(findCycle(cycle.end).due, dueDates[index]);
    assert.ok(daysBetween(cycle.end, cycle.due) > 0);
    if (index)
      assert.equal(daysBetween(schedule[index - 1].end, cycle.start), 1);
  });
});

test("Every supported calendar day belongs to exactly one cycle", () => {
  for (
    let day = Date.parse("2025-12-25T00:00:00Z");
    day <= Date.parse("2026-12-24T00:00:00Z");
    day += 86400000
  ) {
    const iso = new Date(day).toISOString().slice(0, 10);
    assert.equal(
      schedule.filter((cycle) => iso >= cycle.start && iso <= cycle.end).length,
      1,
    );
    assert.ok(findCycle(iso));
  }
  assert.equal(findCycle("2025-12-24"), null);
  assert.equal(findCycle("2026-12-25"), null);
});

test("Impossible dates and malformed values are rejected", () => {
  for (const date of [
    "2026-02-30",
    "2026-02-29",
    "2026-04-31",
    "2026-00-01",
    "2026-13-01",
    "2026-1-01",
    "",
    null,
    123,
  ]) {
    assert.equal(isValidDate(date), false);
    assert.equal(findCycle(date), null);
  }
  assert.equal(isValidDate("2024-02-29"), true);
  assert.equal(daysBetween("2026-01-01", "2026-02-23"), 53);
  assert.equal(daysBetween("2026-12-24", "2027-01-20"), 27);
  assert.throws(() => daysBetween("2026-02-30", "2026-03-01"));
});

test("Amounts use exact cents and reject invalid precision or unsafe values", () => {
  for (const [text, expected] of [
    ["0.01", 1],
    ["0.29", 29],
    ["1.1", 110],
    ["123.45", 12345],
    ["90071992547409.91", Number.MAX_SAFE_INTEGER],
  ]) {
    assert.equal(parseAmount(text), expected);
  }
  for (const text of [
    "",
    "0",
    "-1",
    "NaN",
    "Infinity",
    "0.001",
    "1.005",
    "1e3",
    "90071992547409.92",
  ])
    assert.equal(parseAmount(text), null);
});

test("Saving, deleting and undoing preserves exact totals and resets undo after a new save", () => {
  const store = createPurchaseStore();
  store.add(purchase("a", 10));
  store.add(purchase("b", 20));
  assert.equal(calculator.totalCents(store.list()), 30);
  store.remove("a");
  assert.equal(calculator.totalCents(store.list()), 20);
  assert.equal(store.undo(), true);
  assert.equal(calculator.totalCents(store.list()), 30);
  assert.equal(store.undo(), false);
  store.remove("a");
  store.add(purchase("c", 30));
  assert.equal(store.undo(), false);
  assert.equal(store.remove("missing"), false);
  const copy = store.list();
  copy[0].cents = 1;
  assert.equal(calculator.totalCents(store.list()), 50);
});

test("Stored purchases reject impossible dates, duplicate IDs and overflowing totals", () => {
  for (const data of [
    null,
    {},
    [purchase("a", 0)],
    [purchase("a", 1.5)],
    [purchase("", 10)],
    [purchase("a", 10, "2026-02-30")],
    [purchase(), purchase()],
    [purchase("a", Number.MAX_SAFE_INTEGER), purchase("b", 1)],
  ]) {
    assert.throws(() => validatePurchases(data));
  }
  const store = createPurchaseStore([purchase("a", Number.MAX_SAFE_INTEGER)]);
  assert.throws(() => store.add(purchase("b", 1)));
  assert.equal(store.list().length, 1);
});

test("Loading preserves existing storage format and handles corrupted or blocked storage", () => {
  const saved = JSON.stringify([purchase()]);
  assert.deepEqual(loadPurchases({ getItem: () => saved }), {
    purchases: [purchase()],
    error: null,
  });
  assert.deepEqual(loadPurchases({ getItem: () => null }), {
    purchases: [],
    error: null,
  });
  for (const raw of [
    "{",
    "",
    "{}",
    JSON.stringify([purchase("a", 1, "2026-02-30")]),
  ])
    assert.ok(loadPurchases({ getItem: () => raw }).error);
  assert.ok(
    loadPurchases({
      getItem() {
        throw Error("blocked");
      },
    }).error,
  );
});
