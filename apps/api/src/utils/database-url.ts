const SUPPORTED_PROTOCOLS = new Set(['mysql:', 'mariadb:']);

export const mariaDbAdapterUrl = (value: string): string => {
  const databaseUrl = value.trim();
  if (!databaseUrl) throw new Error('DATABASE_URL must be configured for database operations');

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid MySQL/MariaDB connection URL');
  }

  if (!SUPPORTED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error('DATABASE_URL must use the mysql: or mariadb: protocol');
  }
  if (!parsed.hostname || !parsed.pathname.slice(1)) {
    throw new Error('DATABASE_URL must include a host and database name');
  }

  // The MariaDB connector requires mariadb:, while Prisma deployments commonly
  // provide mysql:. Replace only the scheme so TLS and all other query options
  // remain byte-for-byte intact for the underlying driver.
  return parsed.protocol === 'mysql:'
    ? `mariadb:${databaseUrl.slice(databaseUrl.indexOf(':') + 1)}`
    : databaseUrl;
};
