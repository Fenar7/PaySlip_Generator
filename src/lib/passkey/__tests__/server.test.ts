import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createRegistrationOptions,
  createAuthenticationOptions,
  getRpId,
  getOrigin,
} from "../server";
import { storeChallenge, consumeChallenge, getAndConsumeChallenge } from "../challenge-store";

vi.mock("../challenge-store", () => ({
  storeChallenge: vi.fn(),
  consumeChallenge: vi.fn(),
  getAndConsumeChallenge: vi.fn(),
}));

beforeEach(() => {
  vi.stubEnv("WEBAUTHN_RP_NAME", "Slipwise Test");
  vi.stubEnv("WEBAUTHN_RP_ID", "localhost");
  vi.stubEnv("WEBAUTHN_ORIGIN", "http://localhost:3001");
  vi.stubEnv("NODE_ENV", "test");
  vi.clearAllMocks();
});

describe("getRpId / getOrigin", () => {
  it("reads from environment variables", () => {
    expect(getRpId()).toBe("localhost");
    expect(getOrigin()).toBe("http://localhost:3001");
  });
});

describe("createRegistrationOptions", () => {
  it("generates options with the correct user info and required userVerification", async () => {
    const userId = "user_reg_1";
    const email = "test@example.com";
    const opts = await createRegistrationOptions(userId, email, []);
    expect(opts.rp.name).toBe("Slipwise");
    expect(opts.rp.id).toBe("localhost");
    expect(opts.user.name).toBe(email);
    expect(opts.user.displayName).toBe(email);
    expect(opts.challenge).toBeDefined();
    expect(opts.excludeCredentials).toEqual([]);
    // User verification must be required for production MFA
    expect(opts.authenticatorSelection?.userVerification).toBe("required");
  });

  it("excludes existing credentials", async () => {
    const userId = "user_reg_2";
    const opts = await createRegistrationOptions(userId, "test@example.com", ["cred1", "cred2"]);
    expect(opts.excludeCredentials).toHaveLength(2);
    expect(opts.excludeCredentials![0].id).toBe("cred1");
    expect(opts.excludeCredentials![1].id).toBe("cred2");
  });

  it("stores the challenge durably", async () => {
    const userId = "user_reg_3";
    await createRegistrationOptions(userId, "test@example.com", []);
    expect(storeChallenge).toHaveBeenCalledWith(userId, "registration", expect.any(String));
  });
});

describe("createAuthenticationOptions", () => {
  it("generates options with allowed credentials and required userVerification", async () => {
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
    // User verification must be required for production MFA
    expect(opts.userVerification).toBe("required");
  });

  it("generates options with no credentials when array is empty", async () => {
    const userId = "user_auth_2";
    const opts = await createAuthenticationOptions(userId, []);
    expect(opts.allowCredentials).toEqual([]);
  });

  it("stores the challenge durably", async () => {
    const userId = "user_auth_3";
    await createAuthenticationOptions(userId, [{ id: "cred1" }]);
    expect(storeChallenge).toHaveBeenCalledWith(userId, "authentication", expect.any(String));
  });
});
