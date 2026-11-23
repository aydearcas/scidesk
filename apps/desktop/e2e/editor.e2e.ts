// The editor in a real browser engine (R37, record 0082): the basics a WebKit difference would
// break first. Each test starts from a clean browser: the first start, then the demo project.
import { expect, test, type Page } from "@playwright/test";

/** Ctrl on Windows, Cmd on macOS: what the app calls "Mod". */
const MOD = "ControlOrMeta";

async function openDemo(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Empezar", exact: true }).click();
  await page.getByRole("button", { name: "Abrir el proyecto de demostración" }).click();
  const editor = page.locator(".ProseMirror");
  await expect(editor.locator("h1.title")).toContainText("Actividad inflamatoria");
  return { editor, errors };
}

/** The empty paragraph under "Métodos" in the demo. */
const methods = (page: Page) => page.locator(".ProseMirror > h1", { hasText: /^Métodos$/ }).locator("xpath=following-sibling::p[1]");

test("opens the demo project without errors", async ({ page }) => {
  const { editor, errors } = await openDemo(page);
  await expect(editor.locator("section.part-abstract")).toBeVisible();
  await expect(editor.locator("figure.part-table")).toBeVisible();
  await expect(editor.locator(".citation").first()).toHaveText("1");
  await expect(page.locator("footer.statusbar").getByText("Guardado")).toBeVisible();
  expect(errors).toEqual([]);
});

test("typing counts the words and saves after a pause", async ({ page }) => {
  await openDemo(page);
  const words = page.getByText(/^\d+ palabras$/).first();
  const before = Number((await words.textContent())!.split(" ")[0]);
  await methods(page).click();
  await page.keyboard.type("Estudio observacional de cohortes.", { delay: 15 });
  await expect(methods(page)).toHaveText("Estudio observacional de cohortes.");
  await expect(words).toHaveText(`${before + 4} palabras`);
  await expect(page.locator("footer.statusbar").getByText("Sin guardar")).toBeVisible();
  // the browser view saves to the browser's storage after a two-second pause (record 0039)
  await expect(page.locator("footer.statusbar").getByText("Guardado")).toBeVisible({ timeout: 10_000 });
});

test("bold with the Word shortcut, and undo", async ({ page }) => {
  await openDemo(page);
  await methods(page).click();
  await page.keyboard.type("pacientes", { delay: 15 });
  await methods(page).getByText("pacientes").dblclick();
  await page.keyboard.press(`${MOD}+n`); // «Word en español»: N for negrita
  await expect(methods(page).locator("strong")).toHaveText("pacientes");
  await page.keyboard.press(`${MOD}+z`);
  await expect(methods(page).locator("strong")).toHaveCount(0);
  await expect(methods(page)).toHaveText("pacientes");
});

test("cites with Ctrl+Shift+C and the citation is numbered", async ({ page }) => {
  const { editor } = await openDemo(page);
  const before = await editor.locator(".citation").count();
  await methods(page).click();
  await page.keyboard.type("Como se describió antes", { delay: 15 });
  await page.keyboard.press(`${MOD}+Shift+C`);
  const dialog = page.getByRole("dialog", { name: /cita/i });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox").fill("Castro");
  await expect(dialog.getByRole("option").first()).toBeVisible();
  await page.keyboard.press("Enter"); // add the highlighted reference
  await page.keyboard.press("Enter"); // empty search: insert the citation
  await expect(dialog).toBeHidden();
  await expect(editor.locator(".citation")).toHaveCount(before + 1);
  await expect(methods(page).locator(".citation")).toHaveText(/^\d+$/);
});

test("Tab in the last cell of a table adds a row", async ({ page }) => {
  const { editor } = await openDemo(page);
  const table = editor.locator("figure.part-table table");
  const rows = await table.locator("tr").count();
  await table.locator("tr").last().locator("td, th").last().click();
  await page.keyboard.press("End");
  await page.keyboard.press("Tab");
  await expect(table.locator("tr")).toHaveCount(rows + 1);
  await page.keyboard.type("n = 12", { delay: 15 });
  await expect(table.locator("tr").last()).toContainText("n = 12");
});
