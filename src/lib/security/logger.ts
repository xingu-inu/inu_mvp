/**
 * Secure server-side logger.
 * - Development: logs full error details (message + stack + raw objects).
 * - Production: logs only error message, never stack traces or raw objects.
 */

type LogLevel = 'error' | 'warn' | 'info'

const isDev = process.env.NODE_ENV === 'development'

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return isDev ? `${error.message}\n${error.stack}` : error.message
  }
  if (typeof error === 'string') return error
  return isDev ? JSON.stringify(error, null, 2) : '[redacted]'
}

function log(level: LogLevel, label: string, error?: unknown): void {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}] ${label}`

  if (error !== undefined) {
    console[level](prefix, formatError(error))
  } else {
    console[level](prefix)
  }
}

export const secureLog = {
  error: (label: string, error?: unknown) => log('error', label, error),
  warn: (label: string, error?: unknown) => log('warn', label, error),
  info: (label: string) => log('info', label),
}
