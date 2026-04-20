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

    fireEvent.change(getEmailInput(), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(getPasswordInput(), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

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
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(setBrowserSessionPersistenceMock).toHaveBeenCalledWith("session");
      expect(createSupabaseBrowserMock).toHaveBeenCalledWith({
        rememberSession: false,
      });
    });
  });
});
