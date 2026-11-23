// The editor in a real browser engine (R37, record 0082): the basics a WebKit difference would
// break first. Each test starts from a clean browser: the first start, then the demo project.
import { expect, test, type Page } from "@playwright/test";

/** Ctrl on Windows, Cmd on macOS: what the app calls "Mod". */
const MOD = "ControlOrMeta";
/** The end of the line: End does not go there on a Mac, Cmd+Right does. */
const END = process.platform === "darwin" ? "Meta+ArrowRight" : "End";

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
  // the count is worked out after a pause: wait until it stops changing
  let before = -1;
  await expect.poll(async () => {
    const now = Number((await words.textContent())!.split(" ")[0]);
    const stable = now === before;
    before = now;
    return stable;
  }, { intervals: [400] }).toBe(true);
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

test("a click in empty keywords writes there, not in the next block (phase 1 test)", async ({ page }) => {
  const { editor } = await openDemo(page);
  const keywords = editor.locator(".keywords").first();
  // empty them: from the end, until no text is left
  // at the end of the last one
  const last = editor.locator(".keywords .keyword").last();
  const lastBox = (await last.boundingBox())!;
  await last.click({ position: { x: lastBox.width - 1, y: lastBox.height / 2 } });
  await page.keyboard.press(END);
  for (let i = 0; i < 150 && (await keywords.textContent({ timeout: 2000 })) !== ""; i++) await page.keyboard.press("Backspace");
  await expect(keywords).toHaveText("");
  const next = await editor.locator("h1", { hasText: /^Introducción$/ }).locator("xpath=following-sibling::p[1]").textContent();
  // a click in the room to the right of "Palabras clave:"
  const box = (await keywords.boundingBox())!;
  await editor.locator("h1", { hasText: /^Métodos$/ }).locator("xpath=following-sibling::p[1]").click();
  await page.mouse.click(box.x + box.width * 0.8, box.y + box.height / 2);
  await page.keyboard.type("Miositis; Rituximab", { delay: 15 });
  // ";" starts the next keyword, and the space after it is not kept
  await expect(keywords.locator(".keyword")).toHaveText(["Miositis", "Rituximab"]);
  await expect(editor.locator("h1", { hasText: /^Introducción$/ }).locator("xpath=following-sibling::p[1]")).toHaveText(next!);
});

test("Ir in the warnings scrolls only the sheet and selects the pending marker (phase 1 test)", async ({ page }) => {
  await openDemo(page);
  const discussion = page.locator(".ProseMirror > h1", { hasText: /^Discusión$/ }).locator("xpath=following-sibling::p[1]");
  await discussion.click();
  await page.keyboard.press(END);
  await page.keyboard.type(" XX", { delay: 15 });
  await page.locator(".desk").evaluate((d) => { d.scrollTop = 0; });
  await page.getByRole("button", { name: "Ir", exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe("XX");
  // nothing but the desk has moved: the title bar is still at the top of the window
  expect(await page.locator(".titlebar").evaluate((t) => t.getBoundingClientRect().top)).toBe(0);
  expect(await page.evaluate(() => [...document.querySelectorAll("*")].filter((e) => e.scrollTop > 0 && !e.classList.contains("desk")).length)).toBe(0);
});

test("Tab in the last cell of a table adds a row", async ({ page }) => {
  const { editor } = await openDemo(page);
  const table = editor.locator("figure.part-table table");
  const rows = await table.locator("tr").count();
  await table.locator("tr").last().locator("td, th").last().click();
  await page.keyboard.press(END);
  await page.keyboard.press("Tab");
  await expect(table.locator("tr")).toHaveCount(rows + 1);
  await page.keyboard.type("n = 12", { delay: 15 });
  await expect(table.locator("tr").last()).toContainText("n = 12");
});
