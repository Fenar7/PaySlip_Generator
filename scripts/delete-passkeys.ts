import { db } from "../src/lib/db";

async function main() {
  const profile = await db.profile.findUnique({
    where: { email: "fenarkhan@gmail.com" },
    select: { id: true },
  });

  if (!profile) {
    console.log("User fenarkhan@gmail.com not found.");
    return;
  }

  const passkeys = await db.passkeyCredential.findMany({
    where: { userId: profile.id },
    select: { id: true, credentialId: true, deviceName: true },
  });

  if (passkeys.length === 0) {
    console.log("No passkeys found for fenarkhan@gmail.com.");
    return;
  }

  console.log(`Found ${passkeys.length} passkey(s):`);
  for (const p of passkeys) {
    console.log(`  - ${p.deviceName ?? "Unnamed"} (${p.credentialId})`);
  }

  const result = await db.passkeyCredential.deleteMany({
    where: { userId: profile.id },
  });

  console.log(`Deleted ${result.count} passkey credential(s).`);

  // Also clear passkeyEnabled flag
  await db.profile.update({
    where: { id: profile.id },
    data: { passkeyEnabled: false, passkeyEnabledAt: null },
  });
  console.log("Cleared passkeyEnabled flag on profile.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
