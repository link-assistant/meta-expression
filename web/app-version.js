const unknownVersionInfo = Object.freeze({
  packageVersion: '',
  commitSha: '',
  ref: '',
  buildTime: '',
  source: 'runtime',
});

export function formatAppVersion(info = unknownVersionInfo) {
  const packageVersion = info.packageVersion
    ? `v${info.packageVersion}`
    : 'version unknown';
  const shortSha = info.commitSha ? info.commitSha.slice(0, 7) : '';
  return shortSha ? `${packageVersion} (${shortSha})` : packageVersion;
}

export async function loadAppVersionInfo({
  fetch: fetchImpl = globalThis.fetch?.bind(globalThis),
  preferPackageInfo = isLocalDevelopment(),
} = {}) {
  if (!fetchImpl) {
    return unknownVersionInfo;
  }

  const sources = preferPackageInfo
    ? [
        ['../package.json', 'package'],
        ['./app-version.json', 'github-pages'],
      ]
    : [
        ['./app-version.json', 'github-pages'],
        ['../package.json', 'package'],
      ];

  for (const [url, source] of sources) {
    const info = await readJson(fetchImpl, url);
    if (info) {
      return normalizeVersionInfo(
        source === 'package' ? { packageVersion: info.version } : info,
        source
      );
    }
  }

  return unknownVersionInfo;
}

async function readJson(fetchImpl, url) {
  try {
    const response = await fetchImpl(url, { cache: 'no-store' });
    if (!response?.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeVersionInfo(value, fallbackSource) {
  return {
    packageVersion: String(value.packageVersion ?? value.version ?? ''),
    commitSha: String(value.commitSha ?? value.sha ?? ''),
    ref: String(value.ref ?? ''),
    buildTime: String(value.buildTime ?? ''),
    source: String(value.source ?? fallbackSource),
  };
}

function isLocalDevelopment() {
  const hostname = globalThis.location?.hostname;
  return (
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  );
}
