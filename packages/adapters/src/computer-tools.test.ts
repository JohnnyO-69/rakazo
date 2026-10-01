import { describe, expect, it } from "vitest";
import { computerObservation } from "./computer-support.js";
import type { UnchangedVisualStreak } from "./computer-tools.js";
import {
  advanceUnchangedVisualGuard,
  computerVisualActionKey,
  MAX_CONSECUTIVE_UNCHANGED_VISUAL_ACTIONS,
  observationToolResult,
  parseComputerActions,
  unchangedVisualActionBlocked,
  unchangedVisualLoopToolResult,
} from "./computer-tools.js";

describe("computer tool bridge", () => {
  it("normalizes a bounded batch into provider-neutral actions", () => {
    expect(
      parseComputerActions([
        { kind: "click", x: 20.4, y: 30.6 },
        { kind: "type", text: "hello" },
        { kind: "scroll", direction: "up", amount: 999 },
      ]),
    ).toEqual([
      { kind: "pointer", x: 20, y: 31, type: "click", button: "left" },
      { kind: "clipboard", text: "hello" },
      { kind: "scroll", direction: "up", amount: 20 },
    ]);
  });

  it("rejects batches whose expanded double-click actions exceed the limit", () => {
    expect(() =>
      parseComputerActions(
        Array.from({ length: 13 }, () => ({ kind: "click", x: 10, y: 10, double: true })),
      ),
    ).toThrow(/more than 24/);
  });

  it("returns observations as model-visible image content", () => {
    const observation = computerObservation(Uint8Array.from([1, 2, 3]), {
      mimeType: "image/png",
      width: 1280,
      height: 800,
    });
    const result = observationToolResult(observation);
    expect(result.content).toEqual([
      expect.objectContaining({ type: "text" }),
      { type: "image", data: "AQID", mimeType: "image/png" },
    ]);
  });

  it("does not resend an unchanged screenshot", () => {
    const observation = computerObservation(Uint8Array.from([1, 2, 3]), {
      mimeType: "image/png",
      width: 1280,
      height: 800,
    });
    const result = observationToolResult(observation, "observed", observation.frameId);

    expect(result.content).toEqual([
      expect.objectContaining({
        type: "text",
        text: expect.stringContaining(
          "The previous screenshot remains valid; this identical frame was omitted.",
        ),
      }),
    ]);
    expect(result.content.some((part) => part.type === "image")).toBe(false);
    expect(result.details).toMatchObject({
      frameId: observation.frameId,
      screenUnchanged: true,
      screenshotOmitted: true,
      previousScreenshotValid: true,
    });
  });

  it("stops repeating an identical visual action after unchanged frames", () => {
    const observation = computerObservation(Uint8Array.from([1, 2, 3]), {
      mimeType: "image/png",
      width: 1280,
      height: 800,
    });
    const scroll = computerVisualActionKey(
      parseComputerActions([{ kind: "scroll", direction: "down", amount: 3 }]),
    );
    const otherScroll = computerVisualActionKey(
      parseComputerActions([{ kind: "scroll", direction: "up", amount: 3 }]),
    );
    expect(scroll).toBeTypeOf("string");
    expect(otherScroll).not.toBe(scroll);
    expect(
      computerVisualActionKey(parseComputerActions([{ kind: "type", text: "hello" }])),
    ).toBeUndefined();

    let streak: UnchangedVisualStreak = { count: 0 };
    streak = advanceUnchangedVisualGuard(streak, observation.frameId).streak;

    for (let index = 0; index < MAX_CONSECUTIVE_UNCHANGED_VISUAL_ACTIONS - 1; index += 1) {
      const guard = advanceUnchangedVisualGuard(streak, observation.frameId, scroll);
      streak = guard.streak;
      expect(guard.engaged).toBe(false);
    }
    expect(unchangedVisualActionBlocked(streak, scroll)).toBe(false);
    const early = observationToolResult(observation, "observed", observation.frameId, {
      unchangedVisualCount: streak.count,
    });
    expect(early.details).toMatchObject({
      previousScreenshotValid: true,
      unchangedVisualCount: streak.count,
    });
    expect(early.details).not.toMatchObject({ unchangedVisualLoop: true });

    const engaged = advanceUnchangedVisualGuard(streak, observation.frameId, scroll);
    streak = engaged.streak;
    expect(engaged.engaged).toBe(true);
    expect(streak.count).toBe(MAX_CONSECUTIVE_UNCHANGED_VISUAL_ACTIONS);
    expect(unchangedVisualActionBlocked(streak, scroll)).toBe(true);
    expect(unchangedVisualActionBlocked(streak, otherScroll)).toBe(false);
    const preserved = advanceUnchangedVisualGuard(streak, observation.frameId);
    expect(preserved.streak.count).toBe(MAX_CONSECUTIVE_UNCHANGED_VISUAL_ACTIONS);
    expect(unchangedVisualActionBlocked(preserved.streak, scroll)).toBe(true);

    const marked = observationToolResult(observation, "observed", observation.frameId, {
      unchangedVisualCount: streak.count,
    });
    expect(marked.content.some((part) => part.type === "image")).toBe(false);
    expect(marked.details).toMatchObject({
      screenUnchanged: true,
      screenshotOmitted: true,
      previousScreenshotValid: true,
      unchangedVisualLoop: true,
      unchangedVisualCount: MAX_CONSECUTIVE_UNCHANGED_VISUAL_ACTIONS,
    });
    expect(marked.content[0]).toEqual(
      expect.objectContaining({
        type: "text",
        text: expect.stringContaining("browser_snapshot"),
      }),
    );

    const refused = unchangedVisualLoopToolResult(streak);
    expect(refused.content).toEqual([
      expect.objectContaining({
        type: "text",
        text: expect.stringContaining("was not run again"),
      }),
    ]);
    expect(refused.details).toMatchObject({
      previousScreenshotValid: true,
      unchangedVisualLoop: true,
    });

    const changed = computerObservation(Uint8Array.from([9, 9, 9]), {
      mimeType: "image/png",
      width: 1280,
      height: 800,
    });
    const reset = advanceUnchangedVisualGuard(streak, changed.frameId, scroll);
    expect(reset.engaged).toBe(false);
    expect(reset.streak.count).toBe(0);
    expect(unchangedVisualActionBlocked(reset.streak, scroll)).toBe(false);
    const refreshed = observationToolResult(changed, "observed", observation.frameId);
    expect(refreshed.content).toEqual([
      expect.objectContaining({ type: "text" }),
      expect.objectContaining({ type: "image" }),
    ]);
  });
});
