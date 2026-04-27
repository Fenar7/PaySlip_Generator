"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignupPage from "./page";

const {
  routerPushMock,
  routerRefreshMock,
  signUpMock,
  createSupabaseBrowserMock,
} = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  routerRefreshMock: vi.fn(),
  signUpMock: vi.fn(),
  createSupabaseBrowserMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    refresh: routerRefreshMock,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowser: createSupabaseBrowserMock,
}));

describe("SignupPage", () => {
  function getNameInput() {
    const input = document.querySelector('input[autocomplete="name"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Name input not found");
    }
    return input;
  }

  function getEmailInput() {
    const input = document.querySelector('input[autocomplete="email"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Email input not found");
    }
    return input;
  }

  function getPasswordInputs() {
    const inputs = Array.from(document.querySelectorAll('input[type="password"]'));
    if (inputs.length < 2 || !(inputs[0] instanceof HTMLInputElement) || !(inputs[1] instanceof HTMLInputElement)) {
      throw new Error("Password inputs not found");
    }
    return [inputs[0], inputs[1]];
  }

  beforeEach(() => {
    routerPushMock.mockReset();
    routerRefreshMock.mockReset();
    signUpMock.mockReset();
    createSupabaseBrowserMock.mockReset();

    signUpMock.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    createSupabaseBrowserMock.mockReturnValue({
      auth: {
        signUp: signUpMock,
      },
    });
  });

  it("shows a mismatch error without calling sign up", async () => {
    render(<SignupPage />);

    const [passwordInput, confirmInput] = getPasswordInputs();

    fireEvent.change(getNameInput(), { target: { value: "Jane Doe" } });
    fireEvent.change(getEmailInput(), { target: { value: "jane@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmInput, { target: { value: "password456" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("routes to verify email after successful signup when confirmation is required", async () => {
    render(<SignupPage />);

    const [passwordInput, confirmInput] = getPasswordInputs();

    fireEvent.change(getNameInput(), { target: { value: "Jane Doe" } });
    fireEvent.change(getEmailInput(), { target: { value: "jane@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmInput, { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "jane@example.com",
          password: "password123",
          options: expect.objectContaining({
            data: { name: "Jane Doe" },
          }),
        })
      );
      expect(routerPushMock).toHaveBeenCalledWith(
        "/auth/verify-email?email=jane%40example.com"
      );
    });

    expect(routerRefreshMock).not.toHaveBeenCalled();
  });
});
