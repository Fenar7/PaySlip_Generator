import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

export {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
};

export async function registerPasskey(
  options: PublicKeyCredentialCreationOptionsJSON
): Promise<RegistrationResponseJSON> {
  if (!browserSupportsWebAuthn()) {
    throw new Error("WebAuthn is not supported in this browser");
  }
  return startRegistration({ optionsJSON: options });
}

export async function authenticatePasskey(
  options: PublicKeyCredentialRequestOptionsJSON,
  opts?: { useBrowserAutofill?: boolean }
): Promise<AuthenticationResponseJSON> {
  if (!browserSupportsWebAuthn()) {
    throw new Error("WebAuthn is not supported in this browser");
  }
  return startAuthentication({
    optionsJSON: options,
    useBrowserAutofill: opts?.useBrowserAutofill ?? false,
  });
}
