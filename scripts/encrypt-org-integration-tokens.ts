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

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function encryptOrgIntegrationTokens() {
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

  let updated = 0;

  for (const integration of integrations) {
    const accessTokenEncrypted = isEncryptedIntegrationSecret(
      integration.accessToken,
    );
    const refreshTokenEncrypted = isEncryptedIntegrationSecret(
      integration.refreshToken,
    );

    if (accessTokenEncrypted && refreshTokenEncrypted) {
      continue;
    }

    await db.orgIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: accessTokenEncrypted
          ? integration.accessToken
          : encryptIntegrationSecret(integration.accessToken),
        refreshToken: refreshTokenEncrypted
          ? integration.refreshToken
          : encryptIntegrationSecret(integration.refreshToken),
        config: mergeIntegrationConfig(integration.config, {
          credentialVersion: "encrypted_v1",
          lastTokenRefreshAt: new Date().toISOString(),
        }),
      },
    });

    updated += 1;
    console.log(
      `Encrypted legacy ${integration.provider} tokens for org integration ${integration.id}`,
    );
  }

  console.log(`Finished encrypting org integration tokens. Updated ${updated} row(s).`);
}

encryptOrgIntegrationTokens()
  .catch((error) => {
    console.error("Failed to encrypt org integration tokens:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
