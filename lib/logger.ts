/**
 * Server-side structured logger.
 *
 * Writes JSON lines to stdout/stderr so log aggregators can parse them.
 * In production: NEVER include stack traces, DB errors, or internal details
 * in anything that reaches the client. Log full details server-side only.
 */

import "server-only";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogFields {
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, fields: LogFields = {}): void {
  const line = JSON.stringify({
    ts:      new Date().toISOString(),
    level,
    message,
    ...fields,
  });
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, fields?: LogFields) => write("debug", message, fields),
  info:  (message: string, fields?: LogFields) => write("info",  message, fields),
  warn:  (message: string, fields?: LogFields) => write("warn",  message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields),
};

/**
 * Log an unexpected server error with full detail server-side.
 * Returns a safe generic message safe to send to the client.
 */
export function logServerError(
  context: string,
  err: unknown,
  fields: LogFields = {}
): string {
  const message  = err instanceof Error ? err.message : String(err);
  const stack    = err instanceof Error ? err.stack    : undefined;

  logger.error(`Unhandled error in ${context}`, {
    error: message,
    stack,
    ...fields,
  });

  return "Something went wrong. Please try again later.";
}
