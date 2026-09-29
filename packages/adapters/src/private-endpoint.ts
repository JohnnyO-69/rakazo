import type { PrismaClient } from "@rakazo/db";
import { assertAllowedOpenAiCompatibleUrl } from "./openai-compatible-url.js";

/**
 * Whether a user may reach loopback, LAN and Docker-network endpoints from the server
 * (remote MCP, installed API/GraphQL connectors, OpenAI-compatible model servers): the
 * instance flag (`MCP_ALLOW_PRIVATE_ENDPOINT`) or the user being the deployment owner.
 * Hostname is not authorization.
 */
export async function actorMayUsePrivateEndpoint(
  prisma: Pick<PrismaClient, "deploymentSettings">,
  actorUserId: string,
  instanceAllowPrivateEndpoint: boolean,
): Promise<boolean> {
  if (instanceAllowPrivateEndpoint) return true;
  const findUnique = prisma.deploymentSettings?.findUnique;
  if (!findUnique) return false;
  const settings = await findUnique({
    where: { id: "default" },
    select: { ownerUserId: true },
  });
  return settings?.ownerUserId === actorUserId;
}

/**
 * Re-checks a saved OpenAI-compatible connection against its owner's current standing
 * before a run uses it, so a connection saved before an ownership change cannot keep
 * reaching a private model server.
 */
export async function assertUserMayUseOpenAiCompatibleEndpoint(
  prisma: Pick<PrismaClient, "deploymentSettings">,
  userId: string,
  baseUrl: string,
  instanceAllowPrivateEndpoint: boolean,
): Promise<void> {
  assertAllowedOpenAiCompatibleUrl(baseUrl, {
    allowPrivate: await actorMayUsePrivateEndpoint(prisma, userId, instanceAllowPrivateEndpoint),
  });
}
