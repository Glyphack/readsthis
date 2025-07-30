type LogFn = (msg: string, attrs?: Record<string, unknown>) => void;

interface Logger {
  trace: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal: LogFn;
}

// Only emit noisy `trace` logs when debugging locally. Enable by either:
//   – Setting process.env.DEBUG_TRACE="true" (Node / wrangler dev)
//   – Setting globalThis.DEBUG_TRACE = true (during unit tests, etc.)
// In production these logs become a no-op, avoiding excessive log volume.

const DEBUG_TRACE: boolean =
  (typeof globalThis !== "undefined" && (globalThis as any).DEBUG_TRACE === true) ||
  (typeof process !== "undefined" && process.env.DEBUG_TRACE === "true") ||
  (typeof process !== "undefined" && process.env.NODE_ENV === "development");

const noop: LogFn = () => {};

// Attempt to use `Sentry.logger`, otherwise fallback to console.
export const logger: Logger = {
  trace: DEBUG_TRACE ? console.debug.bind(console) : noop,
  debug: console.debug.bind(console),
  info: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  fatal: console.error.bind(console),
};
