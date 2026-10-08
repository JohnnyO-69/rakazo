import type { MessageBlock } from "@rakazo/contracts";
import { ReplyPreviewSchema } from "@rakazo/contracts";
import { describe, expect, it } from "vitest";
import { replyAttachment, replyLabel, replyLineText, replyMetadata } from "./message-replies.js";

describe("shared reply presentation", () => {
  it("keeps selected quotes on one line and uses preview before local fallback", () => {
    expect(replyLineText("First\nSecond", "preview", "fallback")).toBe("First Second");
    expect(replyLineText(undefined, "First\nSecond", "fallback")).toBe("First");
    expect(replyLineText(undefined, undefined, "Local\nSecond")).toBe("Local");
    expect(replyLineText()).toBe("");
  });
  it("preserves omitted metadata and accepts authoritative unavailable previews", () => {
    const previous = {
      replyToMessageId: "parent",
      replyQuote: "",
      replyPreview: { role: "bot" as const, text: "Earlier" },
    };
    expect(replyMetadata({}, previous)).toEqual(previous);
    expect(replyMetadata({ replyPreview: { text: 12 } }, previous)).toEqual(previous);
    expect(replyMetadata({ replyPreview: null }, previous)).toEqual({
      ...previous,
      replyPreview: null,
    });
    expect(
      replyMetadata(
        {
          replyQuote: "new",
          replyToMessageId: "other",
          replyPreview: { role: "user", text: "New" },
        },
        previous,
      ),
    ).toEqual({
      replyQuote: "new",
      replyToMessageId: "other",
      replyPreview: { role: "user", text: "New" },
    });
  });
});

const image: MessageBlock = { kind: "image", artifactId: "photo", mimeType: "image/png", name: "" };
const file: MessageBlock = {
  kind: "file",
  artifactId: "document",
  mimeType: "text/plain",
  name: "notes.txt",
  size: 12,
};
it("prefers the first parent image and copies only attachment metadata", () => {
  expect(replyAttachment([file, image, { ...image, artifactId: "second" }])).toEqual(image);
  expect(replyAttachment([file])).toEqual({
    kind: "file",
    artifactId: "document",
    mimeType: "text/plain",
    name: "notes.txt",
  });
  expect(replyAttachment([])).toBeUndefined();
});
it("uses quote, caption, localized photo, filename, and attachment in order", () => {
  const labels = { photo: "Foto", attachment: "Anhang" };
  expect(replyLabel("selected\ntext", "caption", image, labels)).toBe("selected text");
  expect(replyLabel(undefined, "caption", image, labels)).toBe("caption");
  expect(replyLabel(undefined, "", image, labels)).toBe("Foto");
  expect(replyLabel(undefined, "", replyAttachment([file]), labels)).toBe("notes.txt");
  expect(replyLabel(undefined, "", { ...file, name: "" }, labels)).toBe("Anhang");
});
it("accepts legacy previews, validates attachment metadata, and preserves it in events", () => {
  expect(ReplyPreviewSchema.parse({ role: "user", text: "legacy" })).toEqual({
    role: "user",
    text: "legacy",
  });
  const preview = { role: "user", text: "", attachment: image };
  expect(replyMetadata({ replyPreview: preview }).replyPreview).toEqual(preview);
  expect(
    ReplyPreviewSchema.safeParse({ ...preview, attachment: { ...image, contentBase64: "bytes" } })
      .success,
  ).toBe(false);
});

it("localizes legacy image-only quotes while retaining real selected caption text", () => {
  const labels = { photo: "Foto", attachment: "Anhang" };
  expect(replyLabel("[image: ]", "", image, labels)).toBe("Foto");
  expect(replyLabel("photo.png", "", { ...image, name: "photo.png" }, labels)).toBe("Foto");
  expect(
    replyLabel("photo.png", "Caption photo.png", { ...image, name: "photo.png" }, labels),
  ).toBe("photo.png");
});
