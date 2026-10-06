import type { MouseEvent, ReactNode } from "react";
import { createContext, memo, useCallback, useContext, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { HastNode } from "./table-utils";
import "./markdown.web.css";
import "./markdown-table.css";
import { droppedTableHtmlText } from "@rakazo/contracts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rakazo/ui-web";
import { CheckIcon, CopyIcon } from "./icons";
import type { ChatMarkdownProps } from "./markdown";
import {
  closeUnterminatedFence,
  inlineMarkdownImageSrc,
  markdownLinkDisplayParts,
  markdownLinkRequiresConfirmation,
  plainTextLinkParts,
  sanitizeMarkdownImageUrl,
  sanitizeMarkdownUrl,
} from "./markdown";
import { useMarkdownLinkCopy } from "./markdown-link-prompt";
import { MarkdownTable, MarkdownTableSourceContext } from "./markdown-table";

function preserveSkippedTableText() {
  return (tree: HastNode) => {
    const walk = (node: HastNode, inTableCell = false) => {
      const insideCell = inTableCell || node.tagName === "th" || node.tagName === "td";
      if (!node.children) return;
      node.children = node.children.flatMap((child) => {
        if (insideCell && child.type === "raw") {
          const value = droppedTableHtmlText(child.value ?? "");
          return value === null ? child : { type: "text", value };
        }
        walk(child, insideCell);
        return child;
      });
    };
    walk(tree);
  };
}

function CodeBlock(props: React.ComponentPropsWithoutRef<"pre">) {
  const preRef = useRef<HTMLPreElement>(null);
  const resetTimerRef = useRef<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!navigator.clipboard) return;
    const text = preRef.current?.textContent ?? "";
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="rk-chat-markdown-pre-wrap">
      <pre {...props} ref={preRef} />
      <button
        type="button"
        className="rk-chat-markdown-copy"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy code"}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
}

const InsideLinkContext = createContext(false);
const ConfirmLinkContext = createContext<(url: string) => void>(() => undefined);

function pageOrigin() {
  if (typeof window === "undefined") return null;
  const origin = window.location.origin;
  return origin && origin !== "null" ? origin : null;
}

function holdExternalLink(event: MouseEvent<HTMLAnchorElement>, request: (url: string) => void) {
  if (event.button !== 0 && event.button !== 1) return;
  const destination = event.currentTarget.href;
  if (!destination || !markdownLinkRequiresConfirmation(destination, pageOrigin())) return;
  event.preventDefault();
  request(destination);
}

function ExternalLinkUrl({ url }: { url: string }) {
  const parts = markdownLinkDisplayParts(url);
  if (!parts) return url;
  return (
    <>
      {parts.before}
      <strong className="font-semibold">{parts.host}</strong>
      {parts.after}
    </>
  );
}

function ExternalLinkAlert({ url, onDismiss }: { url: string; onDismiss: () => void }) {
  const copy = useMarkdownLinkCopy();
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="place-items-start text-left">
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription className="break-all text-left text-foreground">
            <ExternalLinkUrl url={url} />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              window.open(url, "_blank", "noopener,noreferrer");
              onDismiss();
            }}
          >
            {copy.open}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function useExternalLinkConfirm() {
  const [url, setUrl] = useState<string | null>(null);
  const request = useCallback((destination: string) => {
    setUrl(destination);
  }, []);
  const dialog = url ? <ExternalLinkAlert url={url} onDismiss={() => setUrl(null)} /> : null;
  return { request, dialog };
}

function ConfirmableAnchor({
  href,
  title,
  className,
  children,
}: {
  href: string;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  const request = useContext(ConfirmLinkContext);
  return (
    <a
      href={href}
      title={title}
      className={className}
      target="_blank"
      rel="noreferrer noopener"
      onClick={(event) => holdExternalLink(event, request)}
      onAuxClick={(event) => holdExternalLink(event, request)}
    >
      {children}
    </a>
  );
}

function MarkdownImage({ src = "", alt, title }: { src?: string; alt?: string; title?: string }) {
  const insideLink = useContext(InsideLinkContext);
  if (inlineMarkdownImageSrc(src)) {
    return <img src={src} alt={alt ?? ""} title={title} loading="lazy" />;
  }
  const label = alt || src;
  const href = sanitizeMarkdownImageUrl(src);
  // Inside a link the label joins the link text, so a badge still opens its link target.
  if (!href || insideLink) return label;
  return (
    <ConfirmableAnchor href={href} title={title}>
      {label}
    </ConfirmableAnchor>
  );
}

const components: Components = {
  a({ node: _node, href, children, ...props }) {
    // urlTransform blanks unsafe URLs. Keep their text without a link that opens the app again.
    const link = href ? (
      <ConfirmableAnchor href={href} title={props.title} className={props.className}>
        {children}
      </ConfirmableAnchor>
    ) : (
      <span>{children}</span>
    );
    return <InsideLinkContext.Provider value={true}>{link}</InsideLinkContext.Provider>;
  },
  img({ node: _node, src, alt, title }) {
    return (
      <MarkdownImage src={typeof src === "string" ? src : undefined} alt={alt} title={title} />
    );
  },
  pre({ node: _node, ...props }) {
    return <CodeBlock {...props} />;
  },
  table({ node, children, ...props }) {
    return (
      <MarkdownTable node={node} tableProps={props}>
        {children}
      </MarkdownTable>
    );
  },
};

export function LinkifiedText({ children }: { children: string }) {
  const { request, dialog } = useExternalLinkConfirm();
  return (
    <ConfirmLinkContext.Provider value={request}>
      {plainTextLinkParts(children).map((part, index) =>
        part.type === "text" ? (
          part.value
        ) : (
          <ConfirmableAnchor key={index} href={part.href} className="text-link underline">
            {part.value}
          </ConfirmableAnchor>
        ),
      )}
      {dialog}
    </ConfirmLinkContext.Provider>
  );
}

export const ChatMarkdown = memo(function ChatMarkdown({
  children,
  streaming = false,
}: ChatMarkdownProps) {
  const source = streaming ? closeUnterminatedFence(children) : children;
  const { request, dialog } = useExternalLinkConfirm();

  return (
    <ConfirmLinkContext.Provider value={request}>
      <div
        className={streaming ? "rk-chat-markdown rk-chat-markdown-streaming" : "rk-chat-markdown"}
      >
        <MarkdownTableSourceContext.Provider value={source}>
          <ReactMarkdown
            components={components}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[preserveSkippedTableText]}
            skipHtml
            // MarkdownImage decides what an image source may do, so it receives the source as written.
            urlTransform={(url, key) =>
              key === "src" ? url : (sanitizeMarkdownUrl(url, true) ?? "")
            }
          >
            {source}
          </ReactMarkdown>
        </MarkdownTableSourceContext.Provider>
        {streaming ? <span aria-hidden="true" className="rk-chat-markdown-cursor" /> : null}
        {dialog}
      </div>
    </ConfirmLinkContext.Provider>
  );
});

export type { ChatMarkdownProps } from "./markdown";
export type { MarkdownLinkCopy } from "./markdown-link-prompt";
export { MarkdownLinkPromptProvider } from "./markdown-link-prompt";
