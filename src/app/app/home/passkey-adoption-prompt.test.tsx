import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PasskeyAdoptionPrompt } from "./passkey-adoption-prompt";

describe("PasskeyAdoptionPrompt", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows a passkey adoption CTA when requested", () => {
    render(<PasskeyAdoptionPrompt show />);

    expect(screen.getByText("Add a passkey for faster MFA")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add passkey" })).toHaveAttribute(
      "href",
      "/app/settings/security"
    );
  });

  it("does not render when the user already has a passkey", () => {
    render(<PasskeyAdoptionPrompt show={false} />);

    expect(screen.queryByText("Add a passkey for faster MFA")).not.toBeInTheDocument();
  });

  it("stays dismissed after the user dismisses it", () => {
    render(<PasskeyAdoptionPrompt show />);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss passkey prompt" }));

    expect(window.localStorage.getItem("slipwise_passkey_adoption_dismissed")).toBe("true");
    expect(screen.queryByText("Add a passkey for faster MFA")).not.toBeInTheDocument();
  });

  it("honors a previous dismissal from localStorage", () => {
    window.localStorage.setItem("slipwise_passkey_adoption_dismissed", "true");

    render(<PasskeyAdoptionPrompt show />);

    expect(screen.queryByText("Add a passkey for faster MFA")).not.toBeInTheDocument();
  });
});
