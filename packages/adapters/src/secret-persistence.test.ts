import type { AdapterContext } from "@rakazo/adapter-kit";
import type { PrismaClient } from "@rakazo/db";
import { withTransactionRetry } from "@rakazo/db";
import { describe, expect, it, vi } from "vitest";
import { InfisicalSecretStore } from "./infisical-secret-store.js";
import { withSecretPersistence } from "./secret-persistence.js";
import { infisicalFake } from "./secret-store-fake.js";

const context: AdapterContext = {
  operationId: "test",
  traceId: "test",
  spaceId: "space",
  userId: "user",
  signal: new AbortController().signal,
};
type Row = {
  id: string;
  ciphertext?: string;
  userId?: string;
  spaceId?: string;
  botId?: string;
  organizationId?: string;
};
type Args = { where?: Record<string, unknown>; data?: Row; create?: Row; update?: Row };
type Hook = (input: {
  model: string;
  operation: string;
  args: Args;
  query: (args: Args) => Promise<unknown>;
}) => Promise<unknown>;
function database() {
  const tables = new Map<string, Row[]>([
    ["secret", []],
    ["botSecret", []],
    ["integrationProviderConfig", []],
    ["user", [{ id: "user" }]],
    ["space", [{ id: "space", organizationId: "organization" }]],
    ["organization", [{ id: "organization" }]],
    ["bot", []],
  ]);
  const matches = (row: Row, where: Record<string, unknown> = {}) =>
    Object.entries(where).every(([key, value]) => {
      const actual = row[key as keyof Row];
      if (value && typeof value === "object" && "in" in value)
        return (value.in as unknown[]).includes(actual);
      return actual === value;
    });
  const client: Record<string, unknown> = {};
  for (const [table, rows] of tables) {
    client[table] = {
      findMany: async (args: Args) =>
        rows.filter((row) => matches(row, args.where)).map((row) => ({ ...row })),
      count: async (args: Args) => rows.filter((row) => matches(row, args.where)).length,
      create: async (args: Args) => {
        rows.push({ ...args.data! });
        return args.data;
      },
      update: async (args: Args) => {
        const row = rows.find((row) => matches(row, args.where));
        if (!row) throw new Error("Missing row");
        Object.assign(row, args.data);
        return row;
      },
      upsert: async (args: Args) => {
        const row = rows.find((row) => matches(row, args.where));
        if (row) {
          Object.assign(row, args.update);
          return row;
        }
        rows.push({ ...args.create! });
        return args.create;
      },
      deleteMany: async (args: Args) => {
        const removed = rows.filter((row) => matches(row, args.where));
        for (const row of removed) rows.splice(rows.indexOf(row), 1);
        if (table === "user")
          for (const target of ["secret", "botSecret"]) {
            const children = tables.get(target)!;
            for (let i = children.length - 1; i >= 0; i--)
              if (removed.some((parent) => children[i]?.userId === parent.id))
                children.splice(i, 1);
          }
        if (["organization", "space", "bot"].includes(table)) {
          const spaces = tables.get("space")!;
          const removedSpaces =
            table === "organization"
              ? spaces.filter((space) =>
                  removed.some((parent) => space.organizationId === parent.id),
                )
              : removed;
          if (table === "organization")
            for (const space of removedSpaces) spaces.splice(spaces.indexOf(space), 1);
          for (const target of table === "bot" ? ["botSecret"] : ["secret", "botSecret"]) {
            const children = tables.get(target)!;
            for (let i = children.length - 1; i >= 0; i--)
              if (
                removedSpaces.some(
                  (parent) =>
                    (table === "bot" ? children[i]?.botId : children[i]?.spaceId) === parent.id,
                )
              )
                children.splice(i, 1);
          }
        }
        return { count: removed.length };
      },
    };
  }
  client.$queryRaw = async (query: { sql: string; values: unknown[] }) => {
    const table = query.sql.match(/FROM "([^"]+)"/)?.[1];
    const names: Record<string, string> = {
      secrets: "secret",
      bot_secrets: "botSecret",
      integration_provider_configs: "integrationProviderConfig",
      user: "user",
      spaces: "space",
      bots: "bot",
      organization: "organization",
    };
    return (
      tables
        .get(names[table ?? ""] ?? "")
        ?.filter((row) => query.values.includes(row.id))
        .map((row) => ({ ...row })) ?? []
    );
  };
  client.$extends = (extension: { query: { $allModels: { $allOperations: Hook } } }) => {
    const extended: Record<string, unknown> = {};
    for (const [table] of tables) {
      const delegate = client[table] as Record<string, (args: Args) => Promise<unknown>>;
      extended[table] = Object.fromEntries(
        Object.entries(delegate).map(([operation, query]) => [
          operation,
          (args: Args) => ({
            // biome-ignore lint/suspicious/noThenProperty: Prisma queries are lazy thenables in batch transactions.
            then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
              extension.query.$allModels
                .$allOperations({
                  model: table[0]!.toUpperCase() + table.slice(1),
                  operation,
                  args,
                  query,
                })
                .then(resolve, reject),
          }),
        ]),
      );
    }
    extended.$queryRaw = client.$queryRaw;
    extended.$transaction = async (
      callback: ((tx: Record<string, unknown>) => Promise<unknown>) | Promise<unknown>[],
    ) => {
      const snapshot = new Map(
        [...tables].map(([name, rows]) => [name, rows.map((row) => ({ ...row }))]),
      );
      try {
        return await (Array.isArray(callback) ? Promise.all(callback) : callback(extended));
      } catch (error) {
        for (const [name, rows] of tables) rows.splice(0, rows.length, ...snapshot.get(name)!);
        throw error;
      }
    };
    client.$transaction = extended.$transaction;
    return extended;
  };
  return { prisma: client as unknown as PrismaClient, tables };
}

describe("secret persistence cleanup", () => {
  it("deletes a replaced ref only after commit and removes refs on row deletion", async () => {
    const fake = infisicalFake();
    const store = new InfisicalSecretStore(fake.options);
    await store.start();
    const db = database();
    const prisma = withSecretPersistence(db.prisma, store);
    const old = await store.put("old", context, { recordId: "row" });
    const next = await store.put("next", context, { recordId: "row" });
    db.tables.get("secret")!.push({ id: "row", ciphertext: old.ref });
    const remove = vi.spyOn(store, "delete");
    try {
      await prisma.$transaction(async (tx) => {
        await tx.secret.update({ where: { id: "row" }, data: { ciphertext: next.ref } });
        expect(remove).not.toHaveBeenCalled();
        expect(fake.values.size).toBe(2);
      });
      expect(remove).toHaveBeenCalledWith(old.ref, "row");
      expect(fake.values.size).toBe(1);
      await prisma.secret.deleteMany({ where: { id: "row" } });
      expect(fake.values.size).toBe(0);
    } finally {
      await store.close();
    }
  });
  it("cleans the losing retry write while the committed fresh key remains loadable", async () => {
    const fake = infisicalFake();
    const store = new InfisicalSecretStore(fake.options);
    const db = database();
    const prisma = withSecretPersistence(db.prisma, store);
    let attempts = 0;
    try {
      await withTransactionRetry(async () => {
        const stored = await store.put("fake", context, { recordId: "row" });
        await prisma.$transaction(async (tx) => {
          await tx.secret.create({
            data: {
              id: stored.id,
              ciphertext: stored.ref,
              userId: "user",
              spaceId: "space",
              kind: "agent-environment",
            },
          });
          if (++attempts === 1) throw { code: "P2034" };
        });
      });
      expect(attempts).toBe(2);
      expect(fake.values.size).toBe(1);
      await expect(store.load(db.tables.get("secret")![0]!.ciphertext!, "row")).resolves.toBe(
        "fake",
      );
    } finally {
      await store.close();
    }
  });
  it("rollbacks preserve committed values and clean the losing new write", async () => {
    const fake = infisicalFake();
    const store = new InfisicalSecretStore(fake.options);
    await store.start();
    const db = database();
    const prisma = withSecretPersistence(db.prisma, store);
    const old = await store.put("old", context, { recordId: "row" });
    const next = await store.put("next", context, { recordId: "row" });
    db.tables.get("secret")!.push({ id: "row", ciphertext: old.ref });
    try {
      await expect(
        prisma.$transaction(async (tx) => {
          await tx.secret.update({ where: { id: "row" }, data: { ciphertext: next.ref } });
          throw new Error("fake DB failure");
        }),
      ).rejects.toThrow("fake DB failure");
      expect(fake.values.size).toBe(1);
      await expect(store.load(old.ref, "row")).resolves.toBe("old");
      expect(db.tables.get("secret")![0]!.ciphertext).toBe(old.ref);
    } finally {
      await store.close();
    }
  });
  it("cleans cascade deletions and uses the integration configuration AAD", async () => {
    const fake = infisicalFake();
    const store = new InfisicalSecretStore(fake.options);
    await store.start();
    const db = database();
    const prisma = withSecretPersistence(db.prisma, store);
    const bot = await store.put("bot", context, { recordId: "bot-row" });
    const config = await store.put("config", context, {
      recordId: "integration-provider:composio",
    });
    db.tables.get("botSecret")!.push({ id: "bot-row", ciphertext: bot.ref, userId: "user" });
    try {
      await prisma.user.deleteMany({ where: { id: "user" } });
      expect(fake.values.size).toBe(1);
      await prisma.integrationProviderConfig.upsert({
        where: { id: "composio" },
        create: { id: "composio", ciphertext: config.ref },
        update: { ciphertext: config.ref },
      });
      await prisma.integrationProviderConfig.deleteMany({ where: { id: "composio" } });
      expect(fake.values.size).toBe(0);
    } finally {
      await store.close();
    }
  });
  it("captures organization cascades and cleans only after the enclosing transaction commits", async () => {
    const fake = infisicalFake();
    const store = new InfisicalSecretStore(fake.options);
    await store.start();
    const db = database();
    const prisma = withSecretPersistence(db.prisma, store);
    const record = await store.put("fake", context, { recordId: "row" });
    db.tables.get("secret")!.push({ id: "row", ciphertext: record.ref, spaceId: "space" });
    try {
      await prisma.$transaction(async (tx) => {
        await tx.organization.deleteMany({ where: { id: "organization" } });
        expect(fake.values.size).toBe(1);
      });
      expect(fake.values.size).toBe(0);
    } finally {
      await store.close();
    }
  });
  it("preserves atomicity by rejecting secret mutations in batches that expose no transaction client", async () => {
    const fake = infisicalFake();
    const store = new InfisicalSecretStore(fake.options);
    await store.start();
    const db = database();
    const prisma = withSecretPersistence(db.prisma, store);
    const record = await store.put("fake", context, { recordId: "row" });
    db.tables.get("secret")!.push({ id: "row", ciphertext: record.ref });
    try {
      await expect(
        prisma.$transaction([prisma.secret.deleteMany({ where: { id: "row" } })]),
      ).rejects.toThrow("interactive transaction");
      expect(fake.values.size).toBe(1);
      expect(db.tables.get("secret")).toHaveLength(1);
      await expect(
        prisma.$transaction([prisma.secret.findMany({ where: { id: "row" } })]),
      ).resolves.toHaveLength(1);
    } finally {
      await store.close();
    }
  });
});
