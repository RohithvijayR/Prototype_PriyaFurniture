/**
 * Resolves static assets located in /public across both root deployments
 * (local dev, custom domains) and subpath deployments (e.g. GitHub Pages).
 */
export function getAppBasePath(): string {
  const configuredBase = import.meta.env.BASE_URL || '/';

  // Respect an explicit non-root base configured at build time (e.g. "/priya-furniture/").
  if (configuredBase.startsWith('/') && configuredBase !== '/') {
    return configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`;
  }

  // In production builds, Vite emits JS bundles under "<deploy-base>/assets/<chunk>.js".
  // Deriving the mount prefix from import.meta.url works reliably even on nested routes
  // (e.g. "/repo/product/barber-chairs-pf-001") and regardless of "./" vs "/" base config.
  if (!import.meta.env.DEV && typeof import.meta.url === 'string') {
    try {
      const modulePath = new URL(import.meta.url).pathname;
      const assetsMarker = '/assets/';
      const markerIdx = modulePath.lastIndexOf(assetsMarker);
      if (markerIdx !== -1) {
        const prefix = modulePath.slice(0, markerIdx + 1);
        return prefix.endsWith('/') ? prefix : `${prefix}/`;
      }
    } catch {
      // Fallback to root path below.
    }
  }

  return '/';
}

/**
 * Returns the React Router basename for subpath deployments, or undefined at root.
 */
export function getRouterBasename(): string | undefined {
  const base = getAppBasePath();
  if (base === '/') return undefined;
  return base.replace(/\/+$/, '');
}

/**
 * Prefixes a public asset path (e.g. "/assets/catalogue/...") with the active app base path.
 */
export function resolvePublicAsset(assetPath: string): string {
  if (!assetPath) return '';
  if (/^(?:https?:)?\/\//i.test(assetPath) || assetPath.startsWith('data:')) {
    return assetPath;
  }
  const normalized = assetPath.replace(/^\/+/, '');
  return `${getAppBasePath()}${normalized}`;
}
