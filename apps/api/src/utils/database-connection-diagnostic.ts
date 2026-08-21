import { existsSync } from 'node:fs';
import { lookup } from 'node:dns/promises';
import { Socket } from 'node:net';
import mariadb, { Connection } from 'mariadb';

const DEFAULT_MYSQL_PORT = 3306;
const DEFAULT_CONNECTION_LIMIT = 10;
const MAX_DIAGNOSTIC_TIMEOUT_MS = 10_000;

export interface SafeDatabaseConnectionConfiguration {
  databaseUrlPresent: boolean;
  hostname: string | null;
  port: number | null;
  databaseName: string | null;
  usernamePresent: boolean;
  passwordPresent: boolean;
  tlsEnabled: boolean;
  nodeExtraCaCertsPresent: boolean;
  caFilePathExists: boolean;
  connectionLimit: number | null;
}

type DiagnosticStatus = 'PASS' | 'FAIL' | 'NOT_REACHED';

export interface DatabaseConnectionDiagnosticResult {
  dns: DiagnosticStatus;
  tcp: DiagnosticStatus;
  tls: DiagnosticStatus;
  authentication: DiagnosticStatus;
  select1: DiagnosticStatus;
  failureLayer?: 'configuration' | 'dns' | 'tcp' | 'tls' | 'authentication' | 'database-query' | 'driver-connection';
  failureCode?: string;
}

const safeErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  const code = String(error.code);
  return /^[A-Z0-9_]+$/.test(code) ? code : undefined;
};

const parseConnectionLimit = (url: URL): number | null => {
  const configured = url.searchParams.get('connectionLimit');
  if (configured === null) return DEFAULT_CONNECTION_LIMIT;
  const value = Number(configured);
  return Number.isInteger(value) && value > 0 ? value : null;
};

export const safeDatabaseConnectionConfiguration = (
  environment: NodeJS.ProcessEnv = process.env,
): SafeDatabaseConnectionConfiguration => {
  const databaseUrl = environment.DATABASE_URL?.trim();
  const extraCaPath = environment.NODE_EXTRA_CA_CERTS?.trim();
  const unavailable: SafeDatabaseConnectionConfiguration = {
    databaseUrlPresent: Boolean(databaseUrl),
    hostname: null,
    port: null,
    databaseName: null,
    usernamePresent: false,
    passwordPresent: false,
    tlsEnabled: false,
    nodeExtraCaCertsPresent: Boolean(extraCaPath),
    caFilePathExists: Boolean(extraCaPath && existsSync(extraCaPath)),
    connectionLimit: null,
  };

  if (!databaseUrl) return unavailable;

  try {
    const parsed = new URL(databaseUrl);
    return {
      ...unavailable,
      hostname: parsed.hostname || null,
      port: Number(parsed.port || DEFAULT_MYSQL_PORT),
      databaseName: parsed.pathname.length > 1 ? decodeURIComponent(parsed.pathname.slice(1)) : null,
      usernamePresent: Boolean(parsed.username),
      passwordPresent: Boolean(parsed.password),
      tlsEnabled: parsed.searchParams.get('ssl')?.toLowerCase() === 'true',
      connectionLimit: parseConnectionLimit(parsed),
    };
  } catch {
    return unavailable;
  }
};

const connectTcp = (hostname: string, port: number, timeoutMs: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const socket = new Socket();
    let settled = false;

    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve();
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish());
    socket.once('timeout', () => {
      const error = new Error('TCP diagnostic timed out');
      Object.assign(error, { code: 'ETIMEDOUT' });
      finish(error);
    });
    socket.once('error', (error) => finish(error));
    socket.connect(port, hostname);
  });

const isTlsError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const value = `${error.name} ${safeErrorCode(error) ?? ''} ${error.message}`;
  return /CERT|SSL|TLS|SELF_SIGNED|UNABLE_TO_VERIFY|HOSTNAME.*CERTIFICATE/i.test(value);
};

const isAuthenticationError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const code = safeErrorCode(error);
  return code === 'ER_ACCESS_DENIED_ERROR' || /access denied/i.test(error.message);
};

export const diagnoseDatabaseConnection = async (
  environment: NodeJS.ProcessEnv = process.env,
): Promise<DatabaseConnectionDiagnosticResult> => {
  const configuration = safeDatabaseConnectionConfiguration(environment);
  const result: DatabaseConnectionDiagnosticResult = {
    dns: 'NOT_REACHED',
    tcp: 'NOT_REACHED',
    tls: 'NOT_REACHED',
    authentication: 'NOT_REACHED',
    select1: 'NOT_REACHED',
  };

  if (!configuration.databaseUrlPresent || !configuration.hostname || !configuration.port || !configuration.tlsEnabled) {
    return { ...result, failureLayer: 'configuration' };
  }

  try {
    await lookup(configuration.hostname);
    result.dns = 'PASS';
  } catch (error) {
    return { ...result, dns: 'FAIL', failureLayer: 'dns', failureCode: safeErrorCode(error) };
  }

  try {
    await connectTcp(configuration.hostname, configuration.port, MAX_DIAGNOSTIC_TIMEOUT_MS);
    result.tcp = 'PASS';
  } catch (error) {
    return { ...result, tcp: 'FAIL', failureLayer: 'tcp', failureCode: safeErrorCode(error) };
  }

  let connection: Connection | undefined;
  try {
    const parsed = new URL(environment.DATABASE_URL!);
    const configuredConnectTimeout = Number(parsed.searchParams.get('connectTimeout'));
    const connectTimeout = Number.isInteger(configuredConnectTimeout) && configuredConnectTimeout > 0
      ? Math.min(configuredConnectTimeout, MAX_DIAGNOSTIC_TIMEOUT_MS)
      : MAX_DIAGNOSTIC_TIMEOUT_MS;

    // Pass only the options required for a read-only connection probe. In
    // particular, do not forward arbitrary URL options such as initSql.
    connection = await mariadb.createConnection({
      host: parsed.hostname,
      port: Number(parsed.port || DEFAULT_MYSQL_PORT),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: decodeURIComponent(parsed.pathname.slice(1)),
      ssl: true,
      connectTimeout,
    });
    result.tls = 'PASS';
    result.authentication = 'PASS';
  } catch (error) {
    const failureCode = safeErrorCode(error);
    if (isTlsError(error)) {
      return { ...result, tls: 'FAIL', failureLayer: 'tls', failureCode };
    }
    if (isAuthenticationError(error)) {
      return {
        ...result,
        tls: 'PASS',
        authentication: 'FAIL',
        failureLayer: 'authentication',
        failureCode,
      };
    }
    return { ...result, failureLayer: 'driver-connection', failureCode };
  }

  try {
    const rows = await connection.query('SELECT 1 AS ok') as Array<{ ok: number | bigint }>;
    if (Number(rows[0]?.ok) !== 1) {
      return { ...result, select1: 'FAIL', failureLayer: 'database-query' };
    }
    return { ...result, select1: 'PASS' };
  } catch (error) {
    return {
      ...result,
      select1: 'FAIL',
      failureLayer: 'database-query',
      failureCode: safeErrorCode(error),
    };
  } finally {
    await connection.end().catch(() => undefined);
  }
};
