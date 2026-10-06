// @vitest-environment jsdom

import type { ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { ChatMarkdown, LinkifiedText } from "./markdown.web";

function buttonNamed(container: ParentNode, name: string) {
  return [...container.querySelectorAll<HTMLElement>("button")].find(
    (element) => element.textContent === name,
  );
}

async function render(node: ReactNode) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(node);
  });
  return {
    container,
    async cleanup() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("web external link confirmation", () => {
  it("asks before an external bot link and opens it only after confirmation", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const view = await render(
      <ChatMarkdown>{"See [Docs](https://example.test/docs?x=1)"}</ChatMarkdown>,
    );
    const link = view.container.querySelector("a");
    expect(link?.textContent).toBe("Docs");

    await act(async () => {
      link?.click();
    });
    const dialog = document.querySelector("[role='alertdialog']");
    expect(dialog?.textContent).toContain("Open external link?");
    expect(dialog?.textContent).toContain("https://example.test/docs?x=1");
    expect(dialog?.querySelector("strong")?.textContent).toBe("example.test");
    expect(open).not.toHaveBeenCalled();

    await act(async () => {
      buttonNamed(document, "Cancel")?.click();
    });
    expect(open).not.toHaveBeenCalled();
    expect(document.querySelector("[role='alertdialog']")).toBeNull();

    await act(async () => {
      view.container.querySelector("a")?.click();
    });
    await act(async () => {
      buttonNamed(document, "Open")?.click();
    });
    expect(open).toHaveBeenCalledWith(
      "https://example.test/docs?x=1",
      "_blank",
      "noopener,noreferrer",
    );
    open.mockRestore();
    await view.cleanup();
  });

  it("asks before an image fallback link", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const view = await render(
      <ChatMarkdown>{"![Quarterly chart](https://images.example.test/chart.png)"}</ChatMarkdown>,
    );
    await act(async () => {
      view.container.querySelector("a")?.click();
    });
    const dialog = document.querySelector("[role='alertdialog']");
    expect(dialog?.querySelector("strong")?.textContent).toBe("images.example.test");
    expect(dialog?.textContent).toContain("https://images.example.test/chart.png");
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
    await view.cleanup();
  });

  it("opens in-app routes, mailto, and tel without asking", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const view = await render(
      <ChatMarkdown>
        {"[home](/threads/1) [mail](mailto:user@example.test) [call](tel:+15551212)"}
      </ChatMarkdown>,
    );
    const links = [...view.container.querySelectorAll("a")];
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/threads/1",
      "mailto:user@example.test",
      "tel:+15551212",
    ]);
    for (const link of links) {
      link.addEventListener("click", (event) => event.preventDefault());
      await act(async () => {
        link.click();
      });
    }
    expect(document.querySelector("[role='alertdialog']")).toBeNull();
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
    await view.cleanup();
  });

  it("asks before a link in plain user text", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const view = await render(<LinkifiedText>{"https://example.test/docs"}</LinkifiedText>);
    await act(async () => {
      view.container.querySelector("a")?.click();
    });
    expect(document.querySelector("[role='alertdialog'] strong")?.textContent).toBe("example.test");
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
    await view.cleanup();
  });
});
