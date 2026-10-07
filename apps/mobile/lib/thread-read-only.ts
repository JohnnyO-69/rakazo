import { createContext, useContext } from "react";

/** Archived history shares the transcript renderer but never exposes controls that write. */
export const ThreadReadOnlyContext = createContext(false);
export function useThreadReadOnly() {
  return useContext(ThreadReadOnlyContext);
}
