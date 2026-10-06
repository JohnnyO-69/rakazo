import { type ColorTokens, darkTokens, type ResolvedAppearance } from "@rakazo/ui-tokens";
import Markdown, {
  type ASTNode,
  createMarkdownIt,
  FitImage,
  MarkdownStream,
  type MarkdownStyleMap,
  type RenderRules,
} from "@ronradtke/react-native-markdown-display";
import type { ReactNode } from "react";
import { createContext, memo, useCallback, useContext, useMemo, useState } from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ChatMarkdownProps } from "./markdown";
import {
  inlineMarkdownImageSrc,
  linkifyExplicitUrls,
  markdownLinkDisplayParts,
  markdownLinkRequiresConfirmation,
  plainTextLinkParts,
  sanitizeMarkdownImageUrl,
  sanitizeMarkdownUrl,
} from "./markdown";
import {
  resolveMarkdownLinkAppOrigin,
  useMarkdownLinkAppOrigin,
  useMarkdownLinkCopy,
} from "./markdown-link-prompt";

function keepMarkdownLinkToken(_url: string) {
  return true;
}

// One shared parser: the Markdown components memoize on its identity.
const markdownParser = createMarkdownIt();
markdownParser.validateLink = keepMarkdownLinkToken;
linkifyExplicitUrls(markdownParser);

function markdownStyles(palette: ColorTokens) {
  return StyleSheet.create({
    body: {
      color: palette.foreground,
      fontSize: 15.5,
      lineHeight: 23,
      width: "100%",
      minWidth: 0,
      flexShrink: 1,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 9,
      width: "100%",
      flexShrink: 1,
    },
    heading1: {
      color: palette.foreground,
      fontSize: 21,
      lineHeight: 27,
      marginTop: 10,
      marginBottom: 5,
    },
    heading2: {
      color: palette.foreground,
      fontSize: 19,
      lineHeight: 25,
      marginTop: 10,
      marginBottom: 5,
    },
    heading3: {
      color: palette.foreground,
      fontSize: 17,
      lineHeight: 23,
      marginTop: 8,
      marginBottom: 4,
    },
    strong: {
      color: palette.foreground,
      fontWeight: "700",
    },
    link: {
      color: palette.link,
      textDecorationLine: "underline",
      marginBottom: 0,
    },
    code_inline: {
      color: palette.foreground,
      backgroundColor: palette.background,
      borderColor: palette.border,
      borderWidth: StyleSheet.hairlineWidth,
      padding: 0,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
    },
    code_block: {
      color: palette.foreground,
      backgroundColor: palette.background,
      borderColor: palette.border,
    },
    fence: {
      backgroundColor: palette.background,
      borderColor: palette.border,
    },
    fence_code: {
      backgroundColor: palette.background,
    },
    blockquote: {
      backgroundColor: "transparent",
      borderLeftColor: palette.border,
    },
    table: {
      borderColor: palette.border,
    },
    tr: {
      borderColor: palette.border,
    },
    hr: {
      backgroundColor: palette.border,
    },
    bullet_list_content: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    ordered_list_content: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
    },
  });
}

async function openSafeLink(url: string) {
  const safeUrl = sanitizeMarkdownUrl(url);
  if (!safeUrl) return;
  if (await Linking.canOpenURL(safeUrl)) await Linking.openURL(safeUrl);
}

const OpenLinkContext = createContext<(url: string) => void>(() => undefined);

function ExternalLinkConfirm({
  url,
  palette,
  onDismiss,
}: {
  url: string;
  palette: ColorTokens;
  onDismiss: () => void;
}) {
  const copy = useMarkdownLinkCopy();
  const parts = markdownLinkDisplayParts(url);
  return (
    <Modal animationType="fade" transparent visible onRequestClose={onDismiss}>
      <View style={confirm.backdrop}>
        <View
          style={[confirm.card, { backgroundColor: palette.popover, borderColor: palette.border }]}
        >
          <Text style={[confirm.title, { color: palette.popoverForeground }]}>{copy.title}</Text>
          <Text style={[confirm.url, { color: palette.popoverForeground }]}>
            {parts ? (
              <>
                {parts.before}
                <Text style={confirm.host}>{parts.host}</Text>
                {parts.after}
              </>
            ) : (
              url
            )}
          </Text>
          <View style={confirm.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onDismiss}
              style={[confirm.button, { borderColor: palette.border }]}
            >
              <Text style={{ color: palette.popoverForeground }}>{copy.cancel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onDismiss();
                void openSafeLink(url);
              }}
              style={[
                confirm.button,
                { backgroundColor: palette.primary, borderColor: palette.primary },
              ]}
            >
              <Text style={{ color: palette.primaryForeground, fontWeight: "600" }}>
                {copy.open}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function useNativeLinkConfirm(palette: ColorTokens) {
  const appOrigin = useMarkdownLinkAppOrigin();
  const [url, setUrl] = useState<string | null>(null);
  const openLink = useCallback(
    (raw: string) => {
      const safeUrl = sanitizeMarkdownUrl(raw);
      if (!safeUrl) return;
      if (markdownLinkRequiresConfirmation(safeUrl, resolveMarkdownLinkAppOrigin(appOrigin))) {
        setUrl(safeUrl);
        return;
      }
      void openSafeLink(safeUrl);
    },
    [appOrigin],
  );
  const dialog = url ? (
    <ExternalLinkConfirm url={url} palette={palette} onDismiss={() => setUrl(null)} />
  ) : null;
  return { openLink, dialog };
}

function NativeMarkdownLink({
  href,
  children,
  style,
  accessibilityHint,
}: {
  href: string;
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
  accessibilityHint?: string;
}) {
  const openLink = useContext(OpenLinkContext);
  return (
    <Text
      accessibilityRole="link"
      accessibilityHint={accessibilityHint}
      style={style}
      onPress={() => openLink(href)}
    >
      {children}
    </Text>
  );
}

function enclosingLink(parents: readonly ASTNode[]) {
  return parents.find((parent) => parent.type === "link" || parent.type === "blocklink");
}

function textStyleForParents(
  inherited: unknown,
  parents: readonly ASTNode[],
  styleMap: MarkdownStyleMap,
) {
  if (!inherited || typeof inherited !== "object" || Array.isArray(inherited)) return undefined;
  const style = { ...(inherited as Record<string, unknown>) };
  const linkParent = enclosingLink(parents);
  if (!linkParent || sanitizeMarkdownUrl(linkParent.attributes.href ?? "")) return style;
  const linkStyle = StyleSheet.flatten(styleMap.link) ?? {};
  const bodyStyle = StyleSheet.flatten(styleMap.body) ?? {};
  if (style.textDecorationLine === linkStyle.textDecorationLine) delete style.textDecorationLine;
  if (style.color === linkStyle.color) style.color = bodyStyle.color;
  return style;
}

// The library lays table rows out as flex rows of equal-width cells bound to the
// bubble width, so wide tables collapse into unreadable slivers. Give each row a
// minimum width per column and let wide tables scroll horizontally instead.
const TABLE_MIN_COLUMN_WIDTH = 96;

function TableScrollView({
  children,
  style,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  // Percentage widths do not resolve inside a horizontal ScrollView, so the
  // content floor comes from the measured viewport: narrow tables still fill
  // the bubble while wider rows grow the scrollable content.
  const [viewportWidth, setViewportWidth] = useState(0);
  return (
    <ScrollView
      horizontal
      style={style}
      onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
    >
      <View style={{ minWidth: viewportWidth }}>{children}</View>
    </ScrollView>
  );
}

// Keep links as Text so they stay inside textgroup; Pressable (a View) is laid out
// outside the text flow and collapses the bubble height, overlapping later messages.
const renderRules: RenderRules = {
  text: (node, _children, parents, styleMap, inherited) => (
    <Text key={node.key} style={textStyleForParents(inherited, parents, styleMap)}>
      {node.content}
    </Text>
  ),
  table: (node, children, _parent, styleMap) => (
    <TableScrollView key={node.key} style={styleMap._VIEW_SAFE_table}>
      {children}
    </TableScrollView>
  ),
  tr: (node, children, _parent, styleMap) => (
    <View
      key={node.key}
      style={[styleMap._VIEW_SAFE_tr, { minWidth: node.children.length * TABLE_MIN_COLUMN_WIDTH }]}
    >
      {children}
    </View>
  ),
  link: (node, children, _parent, styleMap) => {
    const href = sanitizeMarkdownUrl(node.attributes.href ?? "");
    if (!href) return <Text key={node.key}>{children}</Text>;
    return (
      <NativeMarkdownLink key={node.key} href={href} style={styleMap.link}>
        {children}
      </NativeMarkdownLink>
    );
  },
  blocklink: (node, children, _parent, styleMap) => {
    const href = sanitizeMarkdownUrl(node.attributes.href ?? "");
    if (!href) return <Text key={node.key}>{children}</Text>;
    return (
      <NativeBlockLink key={node.key} href={href} style={styleMap.blocklink}>
        <View style={styleMap.image}>{children}</View>
      </NativeBlockLink>
    );
  },
  // Replaces the library rule, which loads any http(s) image and prefixes https:// to the rest.
  image: (node, _children, parents, styleMap) => {
    const src = node.attributes.src ?? "";
    const alt = node.attributes.alt;
    if (inlineMarkdownImageSrc(src)) {
      return (
        <FitImage
          key={node.key}
          // Embedded data has nothing to load; the spinner would stay over the image.
          indicator={false}
          style={styleMap._VIEW_SAFE_image}
          source={{ uri: src }}
          accessible={Boolean(alt)}
          accessibilityLabel={alt}
        />
      );
    }
    const label = alt || src;
    const href = sanitizeMarkdownImageUrl(src);
    const linkParent = enclosingLink(parents);
    // Inside a link the label joins the link text, so a badge still opens its link target.
    // A blocklink wraps a view, so the label carries the link style itself.
    if (linkParent) {
      if (!sanitizeMarkdownUrl(linkParent.attributes.href ?? "")) {
        return <Text key={node.key}>{label}</Text>;
      }
      return (
        <Text key={node.key} style={styleMap.link}>
          {label}
        </Text>
      );
    }
    if (!href) return <Text key={node.key}>{label}</Text>;
    return (
      <NativeMarkdownLink
        key={node.key}
        href={href}
        accessibilityHint={node.attributes.title}
        style={styleMap.link}
      >
        {label}
      </NativeMarkdownLink>
    );
  },
};

function NativeBlockLink({
  href,
  children,
  style,
}: {
  href: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const openLink = useContext(OpenLinkContext);
  return (
    <Pressable accessibilityRole="link" onPress={() => openLink(href)} style={style}>
      {children}
    </Pressable>
  );
}

type LinkifiedTextProps = {
  children: string;
  color: string;
  linkColor: string;
  palette?: ColorTokens;
};

export const LinkifiedText = memo(function LinkifiedText({
  children,
  color,
  linkColor,
  palette = darkTokens,
}: LinkifiedTextProps) {
  const { openLink, dialog } = useNativeLinkConfirm(palette);
  return (
    <OpenLinkContext.Provider value={openLink}>
      <Text style={{ color, fontSize: 15.5, lineHeight: 23 }}>
        {plainTextLinkParts(children).map((part, index) =>
          part.type === "text" ? (
            part.value
          ) : (
            <NativeMarkdownLink
              key={index}
              href={part.href}
              style={{ color: linkColor, textDecorationLine: "underline" }}
            >
              {part.value}
            </NativeMarkdownLink>
          ),
        )}
      </Text>
      {dialog}
    </OpenLinkContext.Provider>
  );
});

export const ChatMarkdown = memo(function ChatMarkdown({
  children,
  streaming = false,
  palette = darkTokens,
  colorScheme = "dark",
}: ChatMarkdownProps & { palette?: ColorTokens; colorScheme?: ResolvedAppearance }) {
  const styles = useMemo(() => markdownStyles(palette), [palette]);
  const { openLink, dialog } = useNativeLinkConfirm(palette);
  const sharedProps = {
    colorScheme,
    markdownit: markdownParser,
    style: styles,
    rules: renderRules,
    onLinkPress: (url: string) => {
      openLink(url);
      return false;
    },
  };

  return (
    <OpenLinkContext.Provider value={openLink}>
      <View style={layout.wrap}>
        {streaming ? (
          <MarkdownStream {...sharedProps} cursorColor={palette.mutedForeground} streaming>
            {children}
          </MarkdownStream>
        ) : (
          <Markdown {...sharedProps}>{children}</Markdown>
        )}
        {dialog}
      </View>
    </OpenLinkContext.Provider>
  );
});

const layout = StyleSheet.create({
  wrap: {
    width: "100%",
    minWidth: 0,
    flexShrink: 1,
  },
});

const confirm = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  card: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  url: {
    fontSize: 14,
    lineHeight: 20,
  },
  host: {
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
});

export type { ChatMarkdownProps } from "./markdown";
export type { MarkdownLinkCopy } from "./markdown-link-prompt";
export { MarkdownLinkPromptProvider } from "./markdown-link-prompt";
