type NetworkInterfaceLike = {
  address: string;
  family: string | number;
  internal?: boolean;
};

type NetworkInterfaceMap = Record<string, NetworkInterfaceLike[] | undefined>;

type CollectAllowedDevOriginsOptions = {
  appUrl?: string;
  extraOrigins?: string;
  networkInterfaces?: NetworkInterfaceMap;
};

function normalizeOriginHost(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const withScheme = trimmed.includes("://") ? trimmed : `http://${trimmed}`;
    return new URL(withScheme).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

function isIpv4Family(family: string | number) {
  return family === "IPv4" || family === 4;
}

export function collectAllowedDevOrigins({
  appUrl,
  extraOrigins,
  networkInterfaces = {},
}: CollectAllowedDevOriginsOptions = {}) {
  const hosts = new Set(["localhost", "127.0.0.1"]);

  const appHost = appUrl ? normalizeOriginHost(appUrl) : null;
  if (appHost) {
    hosts.add(appHost);
  }

  if (extraOrigins) {
    for (const origin of extraOrigins.split(",")) {
      const host = normalizeOriginHost(origin);
      if (host) {
        hosts.add(host);
      }
    }
  }

  for (const entries of Object.values(networkInterfaces)) {
    if (!entries) continue;

    for (const entry of entries) {
      if (entry.internal || !isIpv4Family(entry.family)) {
        continue;
      }

      hosts.add(entry.address);
    }
  }

  return [...hosts].sort();
}
