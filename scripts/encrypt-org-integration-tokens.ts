import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  encryptIntegrationSecret,
  isEncryptedIntegrationSecret,
  mergeIntegrationConfig,
} from "../src/lib/integrations/secrets";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL must be set to encrypt integration tokens");
}

const isDryRun = process.argv.includes("--dry-run");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function encryptOrgIntegrationTokens() {
  if (isDryRun) {
    console.log("[DRY RUN] No changes will be written to the database.");
  }

  const integrations = await db.orgIntegration.findMany({
    where: {
      provider: {
        in: ["quickbooks", "zoho"],
      },
    },
    select: {
      id: true,
      provider: true,
      accessToken: true,
      refreshToken: true,
      config: true,
    },
  });

  let scanned = 0;
  let alreadyEncrypted = 0;
  let needsEncryption = 0;
  let updated = 0;
  let failed = 0;
  const failedIds: string[] = [];

  for (const integration of integrations) {
    scanned++;
    const accessTokenEncrypted = isEncryptedIntegrationSecret(integration.accessToken);
    const refreshTokenEncrypted = isEncryptedIntegrationSecret(integration.refreshToken);

    if (accessTokenEncrypted && refreshTokenEncrypted) {
      alreadyEncrypted++;
      continue;
    }

    needsEncryption++;

    if (isDryRun) {
      console.log(
        `[DRY RUN] Would encrypt ${integration.provider} tokens for org integration ${integration.id}` +
          ` (accessToken: ${accessTokenEncrypted ? "already encrypted" : "plaintext"},` +
          ` refreshToken: ${refreshTokenEncrypted ? "already encrypted" : "plaintext"})`,
      );
      continue;
    }

    try {
      await db.orgIntegration.update({
        where: { id: integration.id },
        data: {
          accessToken: accessTokenEncrypted
            ? integration.accessToken
            : encryptIntegrationSecret(integration.accessToken),
          refreshToken: refreshTokenEncrypted
            ? integration.refreshToken
            : encryptIntegrationSecret(integration.refreshToken),
          // credentialVersion records the encryption format — NOT a token refresh with the provider
          config: mergeIntegrationConfig(integration.config, {
            credentialVersion: "encrypted_v2",
          }),
        },
      });

      updated++;
      console.log(
        `Encrypted ${integration.provider} tokens for org integration ${integration.id}`,
      );
    } catch (error) {
      failed++;
      failedIds.push(integration.id);
      console.error(
        `Failed to encrypt tokens for org integration ${integration.id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.log(
    `\nSummary:` +
      `\n  Scanned:           ${scanned}` +
      `\n  Already encrypted: ${alreadyEncrypted}` +
      `\n  Needed encryption: ${needsEncryption}` +
      (isDryRun
        ? `\n  [DRY RUN — no writes performed]`
        : `\n  Updated:           ${updated}` +
          `\n  Failed:            ${failed}` +
          (failedIds.length > 0 ? `\n  Failed IDs:        ${failedIds.join(", ")}` : "")),
  );

  if (!isDryRun && failed > 0) {
    process.exitCode = 1;
  }
}

encryptOrgIntegrationTokens()
  .catch((error) => {
    console.error("Fatal error during token encryption backfill:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
