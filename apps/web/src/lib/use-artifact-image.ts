import { useEffect, useState } from "react";
import type { ArtifactTarget } from "./artifact-open";
import { decodeArtifactBase64 } from "./artifact-open";
import { rpc } from "./rpc";

export function useArtifactImage(
  target: ArtifactTarget | undefined,
  artifactId: string,
  enabled = true,
) {
  const [src, setSrc] = useState<string | null>(null);
  const botId = target && "botId" in target ? target.botId : undefined;
  const groupId = target && "groupId" in target ? target.groupId : undefined;
  useEffect(() => {
    setSrc(null);
    if (!enabled || (!botId && !groupId)) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    void rpc.artifacts
      .get(botId ? { botId, artifactId } : { groupId: groupId!, artifactId })
      .then((artifact) => {
        const bytes = decodeArtifactBase64(artifact.contentBase64);
        objectUrl = URL.createObjectURL(
          new Blob([new Uint8Array(bytes)], { type: artifact.mimeType }),
        );
        if (cancelled) URL.revokeObjectURL(objectUrl);
        else setSrc(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [artifactId, botId, groupId, enabled]);
  return src;
}
