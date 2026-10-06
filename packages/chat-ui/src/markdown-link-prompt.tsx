import type { ReactNode } from "react";
import { createContext, useContext } from "react";

export type MarkdownLinkCopy = {
  title: string;
  cancel: string;
  open: string;
};

export const defaultMarkdownLinkCopy: MarkdownLinkCopy = {
  title: "Open external link?",
  cancel: "Cancel",
  open: "Open",
};

export type MarkdownLinkAppOrigin = string | null | (() => string | null);

const CopyContext = createContext<MarkdownLinkCopy>(defaultMarkdownLinkCopy);
const OriginContext = createContext<MarkdownLinkAppOrigin>(null);

export function MarkdownLinkPromptProvider({
  copy = defaultMarkdownLinkCopy,
  appOrigin = null,
  children,
}: {
  copy?: MarkdownLinkCopy;
  appOrigin?: MarkdownLinkAppOrigin;
  children: ReactNode;
}) {
  return (
    <CopyContext.Provider value={copy}>
      <OriginContext.Provider value={appOrigin}>{children}</OriginContext.Provider>
    </CopyContext.Provider>
  );
}

export function useMarkdownLinkCopy() {
  return useContext(CopyContext);
}

export function useMarkdownLinkAppOrigin() {
  return useContext(OriginContext);
}

export function resolveMarkdownLinkAppOrigin(appOrigin: MarkdownLinkAppOrigin) {
  const value = typeof appOrigin === "function" ? appOrigin() : appOrigin;
  return value || null;
}
