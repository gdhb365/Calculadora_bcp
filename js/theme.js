"use strict";

// Apply the saved theme before the first paint.
(() => {
  const root = document.documentElement;
  const system =
    typeof matchMedia === "function"
      ? matchMedia("(prefers-color-scheme: dark)")
      : null;
  let preference = "system";
  try {
    const saved = localStorage.getItem("bcp-theme-v1");
    if (["light", "dark", "system"].includes(saved)) preference = saved;
  } catch {}
  const apply = () => {
    root.dataset.theme =
      preference === "system"
        ? system?.matches
          ? "dark"
          : "light"
        : preference;
    root.dataset.themePreference = preference;
  };
  window.setCalculatorTheme = (value) => {
    if (!["light", "dark", "system"].includes(value)) return;
    preference = value;
    apply();
    try {
      localStorage.setItem("bcp-theme-v1", value);
    } catch {}
  };
  system?.addEventListener("change", apply);
  apply();
})();
