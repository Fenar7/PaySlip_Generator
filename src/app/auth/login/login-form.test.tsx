"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

const {
  routerPushMock,
  routerReplaceMock,
  routerRefreshMock,
  locationAssignMock,
  fetchMock,
  searchParamsMock,
} = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  routerRefreshMock: vi.fn(),
  locationAssignMock: vi.fn(),
  fetchMock: vi.fn(),
  searchParamsMock: vi.fn(() => new URLSearchParams()),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    replace: routerReplaceMock,
    refresh: routerRefreshMock,
  }),
  useSearchParams: () => searchParamsMock(),
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
    routerReplaceMock.mockReset();
    routerRefreshMock.mockReset();
    searchParamsMock.mockReset();
    searchParamsMock.mockReturnValue(new URLSearchParams());
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ redirectTo: "/onboarding" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    vi.stubGlobal("location", {
      ...window.location,
      assign: locationAssignMock,
      origin: "http://localhost:3001",
    });
  });

  it("navigates with the app router after a successful password sign-in", async () => {
    render(<LoginForm />);

    fireEvent.change(getEmailInput(), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(getPasswordInput(), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/password-login",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
      expect(routerReplaceMock).toHaveBeenCalledWith("/onboarding");
      expect(routerRefreshMock).toHaveBeenCalled();
    });

    expect(routerPushMock).not.toHaveBeenCalled();
    expect(locationAssignMock).not.toHaveBeenCalled();
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
      expect(fetchMock).toHaveBeenCalled();
    });

    const [, options] = fetchMock.mock.calls[0] ?? [];
    expect(options?.body).toContain('"rememberMe":false');
  });

  it("shows inline API errors and does not navigate", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Invalid email or password" }),
    });

    render(<LoginForm />);

    fireEvent.change(getEmailInput(), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(getPasswordInput(), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await screen.findByText("Invalid email or password");
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("renders server-returned login errors and preserves the submitted email", async () => {
    searchParamsMock.mockReturnValue(
      new URLSearchParams("error=Invalid%20email%20or%20password&email=user%40example.com"),
    );

    render(<LoginForm />);

    expect(screen.getByDisplayValue("user@example.com")).toBeInTheDocument();
    expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
  });

  it("routes unconfirmed users to verify email", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValue({ code: "email_not_confirmed" }),
    });

    render(<LoginForm />);

    fireEvent.change(getEmailInput(), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(getPasswordInput(), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith(
        "/auth/verify-email?email=user%40example.com",
      );
    });
  });
});
