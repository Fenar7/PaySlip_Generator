"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TwoChallengeForm } from "./2fa-form";

const {
  routerReplaceMock,
  routerRefreshMock,
  routerPushMock,
  getMfaFactorsMock,
  verifyPasskeyChallengeMock,
  verifyTotpChallengeMock,
  verifyRecoveryChallengeMock,
  beginPasskeyAuthenticationMock,
  authenticatePasskeyMock,
  browserSupportsWebAuthnMock,
  signOutSupabaseBrowserMock,
} = vi.hoisted(() => ({
  routerReplaceMock: vi.fn(),
  routerRefreshMock: vi.fn(),
  routerPushMock: vi.fn(),
  getMfaFactorsMock: vi.fn(),
  verifyPasskeyChallengeMock: vi.fn(),
  verifyTotpChallengeMock: vi.fn(),
  verifyRecoveryChallengeMock: vi.fn(),
  beginPasskeyAuthenticationMock: vi.fn(),
  authenticatePasskeyMock: vi.fn(),
  browserSupportsWebAuthnMock: vi.fn(),
  signOutSupabaseBrowserMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    replace: routerReplaceMock,
    refresh: routerRefreshMock,
  }),
  useSearchParams: () =>
    new URLSearchParams("callbackUrl=%2Fapp%2Fsettings%2Fsecurity"),
}));

vi.mock("./actions", () => ({
  getMfaFactors: getMfaFactorsMock,
  verifyPasskeyChallenge: verifyPasskeyChallengeMock,
  verifyTotpChallenge: verifyTotpChallengeMock,
  verifyRecoveryChallenge: verifyRecoveryChallengeMock,
}));

vi.mock("@/app/app/settings/security/passkey-actions", () => ({
  beginPasskeyAuthentication: beginPasskeyAuthenticationMock,
}));

vi.mock("@/lib/passkey/client", () => ({
  authenticatePasskey: authenticatePasskeyMock,
  browserSupportsWebAuthn: browserSupportsWebAuthnMock,
}));

vi.mock("@/lib/supabase/client", () => ({
  signOutSupabaseBrowser: signOutSupabaseBrowserMock,
}));

describe("TwoChallengeForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    browserSupportsWebAuthnMock.mockReturnValue(true);
    getMfaFactorsMock.mockResolvedValue({
      success: true,
      data: {
        status: "challenge",
        callbackUrl: "/app/settings/security",
        hasPasskey: true,
        hasTotp: true,
        hasRecoveryCodes: true,
      },
    });
    beginPasskeyAuthenticationMock.mockResolvedValue({
      success: true,
      data: { options: { challenge: "challenge_1" } },
    });
    authenticatePasskeyMock.mockResolvedValue({
      id: "credential_1",
      rawId: "credential_1",
      type: "public-key",
      response: {},
      clientExtensionResults: {},
    });
    verifyPasskeyChallengeMock.mockResolvedValue({
      success: true,
      data: { callbackUrl: "/app/settings/security" },
    });
    signOutSupabaseBrowserMock.mockResolvedValue(undefined);
  });

  it("redirects with replace and refresh after successful passkey verification", async () => {
    render(<TwoChallengeForm />);

    fireEvent.click(await screen.findByRole("button", { name: "Use passkey" }));

    await waitFor(() => {
      expect(verifyPasskeyChallengeMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: "credential_1" }),
        "/app/settings/security"
      );
      expect(routerReplaceMock).toHaveBeenCalledWith("/app/settings/security");
      expect(routerRefreshMock).toHaveBeenCalled();
    });
  });

  it("resets loading and shows retry when the browser passkey prompt is cancelled", async () => {
    const notAllowedError = new Error("The operation either timed out or was not allowed.");
    notAllowedError.name = "NotAllowedError";
    authenticatePasskeyMock.mockRejectedValue(notAllowedError);

    render(<TwoChallengeForm />);

    fireEvent.click(await screen.findByRole("button", { name: "Use passkey" }));

    expect(
      await screen.findByText("Passkey verification was cancelled or timed out. Try again.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use passkey" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Try passkey again" })).not.toBeDisabled();
  });

  it("resets loading and shows retry when server verification fails", async () => {
    verifyPasskeyChallengeMock.mockResolvedValue({
      success: false,
      error: "Invalid or expired authentication challenge",
    });

    render(<TwoChallengeForm />);

    fireEvent.click(await screen.findByRole("button", { name: "Use passkey" }));

    expect(await screen.findByText("Invalid or expired authentication challenge")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use passkey" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Try passkey again" })).not.toBeDisabled();
  });

  it("offers a back-to-sign-in escape for passkey-only users", async () => {
    getMfaFactorsMock.mockResolvedValue({
      success: true,
      data: {
        status: "challenge",
        callbackUrl: "/app/settings/security",
        hasPasskey: true,
        hasTotp: false,
        hasRecoveryCodes: false,
      },
    });

    render(<TwoChallengeForm />);

    fireEvent.click(await screen.findByRole("button", { name: "Back to sign in" }));

    await waitFor(() => {
      expect(signOutSupabaseBrowserMock).toHaveBeenCalled();
      expect(routerReplaceMock).toHaveBeenCalledWith("/auth/login");
      expect(routerRefreshMock).toHaveBeenCalled();
    });
  });

  it("redirects to the callback when the server says MFA can be skipped", async () => {
    getMfaFactorsMock.mockResolvedValue({
      success: true,
      data: {
        status: "skip",
        callbackUrl: "/onboarding",
        hasPasskey: false,
        hasTotp: false,
        hasRecoveryCodes: false,
      },
    });

    render(<TwoChallengeForm />);

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith("/onboarding");
      expect(routerRefreshMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole("button", { name: "Use passkey" })).not.toBeInTheDocument();
  });

  it("redirects to MFA setup when the server says enrollment is required", async () => {
    getMfaFactorsMock.mockResolvedValue({
      success: true,
      data: {
        status: "setup",
        callbackUrl: "/app/home",
        setupUrl: "/app/settings/security?setupMfa=1&callbackUrl=%2Fapp%2Fhome",
        hasPasskey: false,
        hasTotp: false,
        hasRecoveryCodes: false,
      },
    });

    render(<TwoChallengeForm />);

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith(
        "/app/settings/security?setupMfa=1&callbackUrl=%2Fapp%2Fhome"
      );
      expect(routerRefreshMock).toHaveBeenCalled();
    });
  });

  it("does not show passkey when no passkey credential exists", async () => {
    getMfaFactorsMock.mockResolvedValue({
      success: true,
      data: {
        status: "challenge",
        callbackUrl: "/app/settings/security",
        hasPasskey: false,
        hasTotp: true,
        hasRecoveryCodes: false,
      },
    });

    render(<TwoChallengeForm />);

    expect(await screen.findByText("Authenticator code")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use passkey" })).not.toBeInTheDocument();
  });

  it("hides passkey and shows fallback when WebAuthn is unsupported", async () => {
    browserSupportsWebAuthnMock.mockReturnValue(false);

    render(<TwoChallengeForm />);

    expect(await screen.findByText("Authenticator code")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use passkey" })).not.toBeInTheDocument();
  });
});
