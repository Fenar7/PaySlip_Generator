import { describe, expect, it } from "vitest";
import { collectAllowedDevOrigins } from "../allowed-dev-origins";

describe("collectAllowedDevOrigins", () => {
  it("includes localhost, app url host, extra origins, and LAN ipv4 addresses", () => {
    const origins = collectAllowedDevOrigins({
      appUrl: "http://192.168.29.173:3001",
      extraOrigins:
        "http://devbox.local:3001, preview.slipwise.test:3001, invalid value",
      networkInterfaces: {
        lo0: [
          { address: "127.0.0.1", family: "IPv4", internal: true },
          { address: "::1", family: "IPv6", internal: true },
        ],
        en0: [
          { address: "192.168.29.173", family: "IPv4", internal: false },
          { address: "fe80::1", family: "IPv6", internal: false },
        ],
        bridge0: [{ address: "10.0.0.7", family: 4, internal: false }],
      },
    });

    expect(origins).toEqual([
      "10.0.0.7",
      "127.0.0.1",
      "192.168.29.173",
      "devbox.local",
      "localhost",
      "preview.slipwise.test",
    ]);
  });

  it("ignores blanks, invalid entries, ipv6, and internal-only interfaces", () => {
    const origins = collectAllowedDevOrigins({
      extraOrigins: " , not a host , ",
      networkInterfaces: {
        lo0: [{ address: "127.0.0.1", family: "IPv4", internal: true }],
        en0: [{ address: "fe80::2", family: "IPv6", internal: false }],
      },
    });

    expect(origins).toEqual(["127.0.0.1", "localhost"]);
  });
});
