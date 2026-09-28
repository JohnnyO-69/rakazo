import { expect, type Page, test } from "@playwright/test";
import { captureScreenshot, completeOnboarding, signup } from "./helpers";

const EXPIRED_TAKEOVER = "Stopped. This was still waiting for you on the screen.";

function activityRow(page: Page, botName: string) {
  return page.locator("aside").getByRole("button", {
    name: new RegExp(`^${botName}, `),
  });
}

async function captureActivitySidebar(
  page: Page,
  testInfo: Parameters<typeof captureScreenshot>[1],
  name: string,
) {
  const aside = page.locator("aside").first();
  const box = await aside.boundingBox();
  if (box) {
    const screenshotPath = testInfo.outputPath(`${name}.png`);
    await page.screenshot({
      animations: "disabled",
      caret: "hide",
      path: screenshotPath,
      clip: {
        x: Math.max(0, box.x),
        y: Math.max(0, box.y),
        width: Math.min(box.width + 24, 360),
        height: Math.min(Math.max(box.height, 420), 720),
      },
    });
    await testInfo.attach(name, { contentType: "image/png", path: screenshotPath });
    return;
  }
  await captureScreenshot(page, testInfo, name);
}

test("aged queued work is marked and an expired wait leaves a status line", async ({
  page,
}, testInfo) => {
  const stamp = Date.now();
  await signup(page, `stuck-${stamp}@rakazo.test`, "password12", "Stuck");
  await completeOnboarding(page);

  const agedAt = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString();
  await page.route("**/rpc/runs/list", async (route) => {
    const body = route.request().postDataJSON() as { json?: { filter?: string } } | null;
    const runs =
      body?.json?.filter === "active"
        ? [
            {
              runId: "run-aged",
              botId: "bot-aged",
              botName: "Chief",
              groupId: null,
              groupName: null,
              threadId: "thread-aged",
              status: "queued",
              trigger: "user",
              notificationsEnabled: true,
              promptSnippet: "finish the report",
              updatedAt: agedAt,
            },
          ]
        : [];
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ json: { runs } }),
    });
  });

  const activityToggle = page.getByRole("button", { name: "Activity", exact: true });
  await activityToggle.click();
  await page.reload();
  await expect(activityToggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Loading activity…")).toBeHidden({ timeout: 20_000 });
  const row = activityRow(page, "Chief");
  await expect(row).toBeVisible({ timeout: 20_000 });
  await expect(row).toContainText("2d ago");
  await expect(row.locator(".text-warning").filter({ hasText: "Queued" })).toBeVisible();
  await captureActivitySidebar(page, testInfo, "stuck-queued-activity");

  await page.route("**/rpc/threads/get", async (route) => {
    const response = await route.fetch();
    const parsed = (await response.json()) as {
      json?: {
        threadId: string;
        cursor: number;
        messages?: Array<{ id?: string }>;
      };
    };
    const snap = parsed.json;
    if (!snap) {
      await route.fulfill({ response });
      return;
    }
    const messages = snap.messages ?? [];
    if (messages.some((message) => message.id === "msg-stuck-expired")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ json: snap }),
      });
      return;
    }
    const seq = Math.max(snap.cursor, 0) + 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        json: {
          ...snap,
          cursor: seq,
          messages: [
            ...messages,
            {
              id: "msg-stuck-expired",
              threadId: snap.threadId,
              seq,
              role: "system",
              blocks: [{ kind: "meta", text: EXPIRED_TAKEOVER }],
              createdAt: new Date().toISOString(),
            },
          ],
        },
      }),
    });
  });

  await page.reload();
  await expect(page.getByText(EXPIRED_TAKEOVER)).toBeVisible({ timeout: 20_000 });
  await captureScreenshot(page, testInfo, "stuck-expired-status");
});
