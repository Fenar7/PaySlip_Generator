"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

const {
  routerPushMock,
  routerRefreshMock,
  signInWithPasswordMock,
  resendMock,
  signOutMock,
  clearSupabaseBrowserSessionStorageMock,
  setBrowserSessionPersistenceMock,
  createSupabaseBrowserMock,
  locationAssignMock,
} = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  routerRefreshMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  resendMock: vi.fn(),
  signOutMock: vi.fn(),
  clearSupabaseBrowserSessionStorageMock: vi.fn(),
  setBrowserSessionPersistenceMock: vi.fn(),
  createSupabaseBrowserMock: vi.fn(),
  locationAssignMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    refresh: routerRefreshMock,
  }),
  useSearchParams: () =>
    new URLSearchParams(),
}));

vi.mock("@/lib/supabase/client", () => ({
  clearSupabaseBrowserSessionStorage: clearSupabaseBrowserSessionStorageMock,
  createSupabaseBrowser: createSupabaseBrowserMock,
  setBrowserSessionPersistence: setBrowserSessionPersistenceMock,
}));

const authenticatePasskeyMock = vi.fn();
const browserSupportsWebAuthnMock = vi.fn().mockReturnValue(true);

vi.mock("@/lib/passkey/client", () => ({
  authenticatePasskey: (...args: unknown[]) => authenticatePasskeyMock(...args),
  browserSupportsWebAuthn: () => browserSupportsWebAuthnMock(),
}));

describe("LoginForm", () => {
  function getEmailInput() {
    const input = document.querySelector('input[type="email"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Email input not found");
    }
    return input;
  }

  function getPasswordInput() {
    const input = document.querySelector('input[type="password"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Password input not found");
    }
    return input;
  }

  beforeEach(() => {
    routerPushMock.mockReset();
    routerRefreshMock.mockReset();
    signInWithPasswordMock.mockReset();
    resendMock.mockReset();
    signOutMock.mockReset();
    clearSupabaseBrowserSessionStorageMock.mockReset();
    setBrowserSessionPersistenceMock.mockReset();
    createSupabaseBrowserMock.mockReset();

    clearSupabaseBrowserSessionStorageMock.mockResolvedValue(undefined);
    signInWithPasswordMock.mockResolvedValue({ error: null });
    resendMock.mockResolvedValue({ error: null });
    signOutMock.mockResolvedValue(undefined);
    createSupabaseBrowserMock.mockReturnValue({
      auth: {
        signInWithPassword: signInWithPasswordMock,
        resend: resendMock,
        signOut: signOutMock,
      },
    });

    vi.stubGlobal("location", {
      ...window.location,
      assign: locationAssignMock,
      origin: "http://localhost:3001",
    });
  });

  it("hard redirects after a successful password sign-in", async () => {
    render(<LoginForm />);

    expect(
      screen.getByText(/passkey.*second verification step after sign-in/i)
    ).toBeInTheDocument();

    fireEvent.change(getEmailInput(), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(getPasswordInput(), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(clearSupabaseBrowserSessionStorageMock).toHaveBeenCalled();
      expect(setBrowserSessionPersistenceMock).toHaveBeenCalledWith("remembered");
      expect(signInWithPasswordMock).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "secret123",
      });
      expect(locationAssignMock).toHaveBeenCalledWith("/onboarding");
    });

    expect(routerPushMock).not.toHaveBeenCalled();
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });

  it("passes session persistence when remember me is disabled", async () => {
    render(<LoginForm />);

    fireEvent.change(getEmailInput(), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(getPasswordInput(), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByLabelText(/remember me/i));
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(setBrowserSessionPersistenceMock).toHaveBeenCalledWith("session");
      expect(createSupabaseBrowserMock).toHaveBeenCalledWith({
        rememberSession: false,
      });
    });
  });

  it("hard redirects after a successful primary passkey sign-in", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          options: { challenge: "challenge_1" },
          signinSessionId: "session_1",
          callbackUrl: "/app",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          callbackUrl: "/app",
        }),
      });

    authenticatePasskeyMock.mockResolvedValue({
      id: "cred_1",
      rawId: "cred_1",
      response: {},
      clientExtensionResults: {},
      type: "public-key",
    });

    render(<LoginForm />);

    const passkeyButton = await screen.findByRole("button", { name: /sign in with passkey/i });
    fireEvent.click(passkeyButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        "/api/auth/passkey/signin-options",
        expect.objectContaining({ method: "POST" })
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/auth/passkey/signin",
        expect.objectContaining({ method: "POST" })
      );
      expect(locationAssignMock).toHaveBeenCalledWith("/app");
    });
  });

  it("shows error when passkey sign-in fails", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        options: { challenge: "challenge_1" },
        signinSessionId: "session_1",
        callbackUrl: "/app",
      }),
    });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ success: false, error: "Passkey verification failed" }),
    });

    authenticatePasskeyMock.mockResolvedValue({
      id: "cred_1",
      rawId: "cred_1",
      response: {},
      clientExtensionResults: {},
      type: "public-key",
    });

    render(<LoginForm />);

    const passkeyButton = await screen.findByRole("button", { name: /sign in with passkey/i });
    fireEvent.click(passkeyButton);

    expect(
      await screen.findByText("Passkey verification failed")
    ).toBeInTheDocument();
  });
});
