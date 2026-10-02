import type { AvatarStyle } from "@rakazo/contracts";
import { AvatarStyleSchema } from "@rakazo/contracts";
import * as SecureStore from "expo-secure-store";

/** The last avatar style the server confirmed, so an offline launch starts from it. */
export const AVATAR_STYLE_KEY = "rakazo.avatar-style";

let memoryStyle: AvatarStyle | null = null;

export function getCachedAvatarStyle(): AvatarStyle {
  return memoryStyle ?? "robot";
}

export async function loadAvatarStyle(): Promise<AvatarStyle> {
  try {
    const stored = await SecureStore.getItemAsync(AVATAR_STYLE_KEY);
    memoryStyle = AvatarStyleSchema.safeParse(stored).data ?? null;
  } catch {
    // Keep the default when SecureStore is unavailable.
  }
  return getCachedAvatarStyle();
}

export async function saveAvatarStyle(style: AvatarStyle): Promise<void> {
  if (style === memoryStyle) return;
  memoryStyle = style;
  try {
    await SecureStore.setItemAsync(AVATAR_STYLE_KEY, style);
  } catch {
    // Keep the in-memory style when SecureStore is unavailable.
  }
}

export async function clearAvatarStyle(): Promise<void> {
  memoryStyle = null;
  try {
    await SecureStore.deleteItemAsync(AVATAR_STYLE_KEY);
  } catch {
    // The server value replaces a stale style on the next fetch.
  }
}
