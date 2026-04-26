import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  storeChallenge,
  consumeChallenge,
  createRegistrationOptions,
  createAuthenticationOptions,
  getRpId,
  getOrigin,
} from "../server";

beforeEach(() => {
  vi.stubEnv("WEBAUTHN_RP_NAME", "Slipwise Test");
  vi.stubEnv("WEBAUTHN_RP_ID", "localhost");
  vi.stubEnv("WEBAUTHN_ORIGIN", "http://localhost:3001");
  // Clear the in-memory challenge store between tests
  // We need to access the private map; we do this by consuming with a dummy key
  // Actually, we can't easily clear the private map. Let's work around by using unique userIds per test.
});

describe("getRpId / getOrigin", () => {
  it("reads from environment variables", () => {
    // In tests, env stubs apply after module import for default values
    expect(getRpId()).toBe("localhost");
    expect(getOrigin()).toBe("http://localhost:3001");
  });
});

describe("storeChallenge / consumeChallenge", () => {
  it("stores and consumes a challenge successfully", () => {
    const userId = "user_store_1";
    storeChallenge(userId, "registration", "challenge_abc");
    expect(consumeChallenge(userId, "registration", "challenge_abc")).toBe(true);
  });

  it("rejects a challenge consumed twice (one-time use)", () => {
    const userId = "user_store_2";
    storeChallenge(userId, "registration", "challenge_def");
    expect(consumeChallenge(userId, "registration", "challenge_def")).toBe(true);
    expect(consumeChallenge(userId, "registration", "challenge_def")).toBe(false);
  });

  it("rejects a challenge with wrong purpose", () => {
    const userId = "user_store_3";
    storeChallenge(userId, "registration", "challenge_ghi");
    expect(consumeChallenge(userId, "authentication", "challenge_ghi")).toBe(false);
  });

  it("rejects a challenge with mismatched value", () => {
    const userId = "user_store_4";
    storeChallenge(userId, "registration", "challenge_real");
    expect(consumeChallenge(userId, "registration", "challenge_fake")).toBe(false);
  });

  it("rejects a non-existent challenge", () => {
    const userId = "user_store_5";
    expect(consumeChallenge(userId, "registration", "challenge_missing")).toBe(false);
  });

  it("rejects expired challenges (simulated by waiting)", async () => {
    const userId = "user_store_6";
    vi.useFakeTimers();
    storeChallenge(userId, "registration", "challenge_exp");
    vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes > 5 min TTL
    expect(consumeChallenge(userId, "registration", "challenge_exp")).toBe(false);
    vi.useRealTimers();
  });
});

describe("createRegistrationOptions", () => {
  it("generates options with the correct user info", async () => {
    const userId = "user_reg_1";
    const email = "test@example.com";
    const opts = await createRegistrationOptions(userId, email, []);
    expect(opts.rp.name).toBe("Slipwise");
    expect(opts.rp.id).toBe("localhost");
    expect(opts.user.id).toBeTruthy();
    expect(opts.user.name).toBe(email);
    expect(opts.user.displayName).toBe(email);
    expect(opts.challenge).toBeDefined();
    expect(opts.excludeCredentials).toEqual([]);
  });

  it("excludes existing credentials", async () => {
    const userId = "user_reg_2";
    const opts = await createRegistrationOptions(userId, "test@example.com", ["cred1", "cred2"]);
    expect(opts.excludeCredentials).toHaveLength(2);
    expect(opts.excludeCredentials![0].id).toBe("cred1");
    expect(opts.excludeCredentials![1].id).toBe("cred2");
  });
});

describe("createAuthenticationOptions", () => {
  it("generates options with allowed credentials", async () => {
    const userId = "user_auth_1";
    const allowCredentials = [
      { id: "credA", transports: ["internal"] as string[] },
      { id: "credB" },
    ];
    const opts = await createAuthenticationOptions(userId, allowCredentials);
    expect(opts.rpId).toBe("localhost");
    expect(opts.allowCredentials).toHaveLength(2);
    expect(opts.allowCredentials![0].id).toBe("credA");
    expect(opts.challenge).toBeDefined();
  });

  it("generates options with no credentials when array is empty", async () => {
    const userId = "user_auth_2";
    const opts = await createAuthenticationOptions(userId, []);
    expect(opts.allowCredentials).toEqual([]);
  });
});
