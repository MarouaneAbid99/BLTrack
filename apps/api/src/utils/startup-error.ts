const SECRET_ENVIRONMENT_NAMES = new Set([
  'DATABASE_URL',
  'JWT_SECRET',
  'RENDER_API_KEY',
  'RENDER_TOKEN',
]);

const connectionUrlPattern = /\b(?:mysql|mariadb|postgres(?:ql)?|mongodb(?:\+srv)?|redis):\/\/[^\s"'`]+/gi;
const credentialUrlPattern = /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@[^\s"'`]+/gi;
const namedCredentialPattern = /\b(DATABASE_URL|JWT_SECRET|RENDER_API_KEY|RENDER_TOKEN|BLTRACK_BOOTSTRAP_ADMIN_[A-Z_]+|password(?:Hash)?|token|secret)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi;

const secretValues = (environment: NodeJS.ProcessEnv): string[] =>
  Object.entries(environment)
    .filter(([name, value]) => Boolean(value) && (
      SECRET_ENVIRONMENT_NAMES.has(name)
      || name.startsWith('BLTRACK_BOOTSTRAP_ADMIN_')
    ))
    .map(([, value]) => value!)
    .filter((value) => value.length >= 3)
    .sort((left, right) => right.length - left.length);

export const redactStartupDiagnostic = (
  input: string,
  environment: NodeJS.ProcessEnv = process.env,
): string => {
  let sanitized = input;
  for (const value of secretValues(environment)) {
    sanitized = sanitized.split(value).join('[REDACTED]');
  }

  return sanitized
    .replace(connectionUrlPattern, '[REDACTED_CONNECTION_URL]')
    .replace(credentialUrlPattern, '[REDACTED_CONNECTION_URL]')
    .replace(namedCredentialPattern, '$1=[REDACTED]');
};

export interface SanitizedStartupError {
  name: string;
  message: string;
  stack?: string;
}

export const sanitizeStartupError = (
  error: unknown,
  environment: NodeJS.ProcessEnv = process.env,
): SanitizedStartupError => {
  if (error instanceof Error) {
    return {
      name: redactStartupDiagnostic(error.name || 'Error', environment),
      message: redactStartupDiagnostic(error.message || 'No error message available', environment),
      ...(typeof error.stack === 'string' && error.stack.length > 0
        ? { stack: redactStartupDiagnostic(error.stack, environment) }
        : {}),
    };
  }

  let message = 'Unknown non-Error startup failure';
  try {
    if (typeof error === 'string') message = error;
    else if (error !== undefined && error !== null) message = String(error);
  } catch {
    // Keep the fixed fallback; never inspect or serialize an unsafe thrown value.
  }

  return {
    name: 'NonErrorThrown',
    message: redactStartupDiagnostic(message, environment),
  };
};
