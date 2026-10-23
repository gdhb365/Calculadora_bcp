const { test, expect } = require("@playwright/test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const pageUrl = pathToFileURL(path.resolve(__dirname, "../index.html")).href;

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.testErrors = errors;
  await page.goto(pageUrl);
});

test.afterEach(async ({ page }) => {
  expect(page.testErrors).toEqual([]);
});

test("Consult, save, reload, delete and undo a purchase", async ({ page }) => {
  await page.locator("#purchaseDate").fill("2026-10-23");
  await expect(page.locator("#dueDate")).toHaveText(/23 nov\.? 2026/);
  await page.locator("#purchaseAmount").fill("123.45");
  await page.getByRole("button", { name: "Guardar esta compra" }).click();
  await expect(page.locator("#grandTotal")).toContainText("123.45");
  await page.reload();
  await expect(page.locator("#grandTotal")).toContainText("123.45");
  await page.getByRole("button", { name: /Eliminar compra/ }).click();
  await expect(page.locator("#grandTotal")).toContainText("0.00");
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(page.locator("#grandTotal")).toContainText("123.45");
  await page.locator("#purchaseDate").fill("2026-10-24");
  await expect(page.locator("#dueDate")).toHaveText(/22 dic\.? 2026/);
});

test("Theme preference persists and both icons work", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  await expect(page.locator("#themeLabel")).toHaveText("Claro");
  await page.locator("#themeToggle").click();
  await expect(page.locator("#themeLabel")).toHaveText("Oscuro");
  await expect(page.locator("#themeMoon")).toBeVisible();
  await page.reload();
  await expect(page.locator("#themeToggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#themeToggle").click();
  await expect(page.locator("#themeSun")).toBeVisible();
});

test("Invalid amounts and dates cannot be saved", async ({ page }) => {
  await page.locator("#purchaseDate").fill("2026-01-01");
  await page.locator("#purchaseAmount").fill("1.005");
  await page.getByRole("button", { name: "Guardar esta compra" }).click();
  await expect(page.locator("#amountError")).toBeVisible();
  await page.locator("#purchaseDate").fill("2026-12-25");
  await expect(page.locator("#dueDate")).toHaveText("Fecha no disponible");
  await expect(page.locator("#grandTotal")).toContainText("0.00");
});

test("Corrupt storage is reported without overwriting the original data on load", async ({
  page,
}) => {
  const raw = JSON.stringify([{ id: "bad", date: "2026-02-30", cents: 100 }]);
  await page.evaluate(
    (raw) => localStorage.setItem("bcp-purchases-v1", raw),
    raw,
  );
  await page.reload();
  await expect(page.locator("#storageNotice")).toContainText(
    "No se pudieron leer",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("bcp-purchases-v1")),
  ).toBe(raw);
  await expect(page.locator("#grandTotal")).toContainText("0.00");
});

test("Blocked storage keeps the app usable and explains that purchases are temporary", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    });
  });
  await page.reload();
  await page.locator("#themeToggle").click();
  await page.locator("#purchaseDate").fill("2026-01-01");
  await page.locator("#purchaseAmount").fill("10");
  await page.getByRole("button", { name: "Guardar esta compra" }).click();
  await expect(page.locator("#grandTotal")).toContainText("10.00");
  await expect(page.locator("#feedbackText")).toContainText(
    "solo en esta sesión",
  );
});

test("Mobile layout fits and the heading remains centered", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "BCP VISA · CRONOGRAMA 2026",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator("h1")
      .evaluate((element) => getComputedStyle(element).textAlign),
  ).toBe("center");
});
