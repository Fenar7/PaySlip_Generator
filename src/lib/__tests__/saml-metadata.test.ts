import { describe, expect, it } from "vitest";
import {
  HTTP_POST_BINDING,
  HTTP_REDIRECT_BINDING,
  parseIdentityProviderMetadata,
} from "@/lib/saml-metadata";

const SAMPLE_CERT =
  "MIIC8DCCAdigAwIBAgIBADANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAlFeGFtcGxlSWRQMB4XDTI0MDEwMTAwMDAwMFoXDTM0MDEwMTAwMDAwMFowFDESMBAGA1UEAwwJRXhhbXBsZUlkUDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALDkQ9mA3Yt4K5q9rT50qW0n1K9U7fJYQKJmdu3D3GxRIBk7S9Ct0f7zP8W3VhXksH0Yd3g6yv6f8k7qg5I4hW7VJqk8A4iOf1VQWfGgXH0x2F6Zy3y1fG5W6xO5s6uV7uY0TQv8EdH6I1Fkh0Q0y4szdC2x0JjW2kzv2ZlJ3T8kF6fK8TleYlV0F4qsR8Rr8NQX4Dw2C7c8S7V8S1Yk9KxVSm0w1wW6V8F7mG2kFrp6Ly2rVj8PmXK5+8Xv8Tx2xkMvj2gM+YjH+9u2Qv9bS6x9j5tW6QwVjlwmZlXf9x0dVJ9v9w2d2l9n5x2fQ5q5h2g0c9r7JmY7jVj4q7mT4uYg3g7D5jFQ2kCAwEAATANBgkqhkiG9w0BAQsFAAOCAQEAT8rXxv5oD7V3WgH5eVv6c8m4Sl2m3L5FjW6v7n2y8j5m2V4G4Vv4Y5j2nF6nV9K1L4cG0Vf4sX2w6Y0Kx7T0u1E4z7r1l5v8bY0yN6m9h1Qf6R8d9L2a4s5q8x0n4m9r6k5v2t8c7b1q3r2s9p6k3n1t5x2y4z6a8b0c2d4e6f8g0h2i4j6k8l0m2n4p6q8r0";

describe("parseIdentityProviderMetadata", () => {
  it("extracts entity ID, preferred SSO binding, and certificates", () => {
    const parsed = parseIdentityProviderMetadata(`
      <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://idp.example.com/metadata">
        <md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
          <md:KeyDescriptor use="signing">
            <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
              <ds:X509Data>
                <ds:X509Certificate>${SAMPLE_CERT}</ds:X509Certificate>
              </ds:X509Data>
            </ds:KeyInfo>
          </md:KeyDescriptor>
          <md:SingleSignOnService Binding="${HTTP_POST_BINDING}" Location="https://idp.example.com/post"/>
          <md:SingleSignOnService Binding="${HTTP_REDIRECT_BINDING}" Location="https://idp.example.com/redirect"/>
        </md:IDPSSODescriptor>
      </md:EntityDescriptor>
    `);

    expect(parsed.entityId).toBe("https://idp.example.com/metadata");
    expect(parsed.ssoBinding).toBe(HTTP_REDIRECT_BINDING);
    expect(parsed.ssoUrl).toBe("https://idp.example.com/redirect");
    expect(parsed.certificates).toHaveLength(1);
    expect(parsed.certificates[0]).toContain("BEGIN CERTIFICATE");
  });

  it("throws when metadata does not contain an IdP descriptor", () => {
    expect(() =>
      parseIdentityProviderMetadata(`
        <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://idp.example.com/metadata">
          <md:SPSSODescriptor />
        </md:EntityDescriptor>
      `),
    ).toThrow(/IDPSSODescriptor/);
  });
});
