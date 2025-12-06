/**
 * Simple Logger for omakase-ai
 * Structured logging with levels and context
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private context: string;
  private minLevel: LogLevel;

  constructor(context: string = 'app') {
    this.context = context;
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context, data } = entry;
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
    const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : '';
    return `${prefix} ${message}${dataStr}`;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      data,
    };

    const formatted = this.formatMessage(entry);

    switch (level) {
      case 'debug':
      case 'info':
        // eslint-disable-next-line no-console
        console.log(formatted);
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(formatted);
        break;
      case 'error':
        // eslint-disable-next-line no-console
        console.error(formatted);
        break;
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }
}

/**
 * Create a logger with context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Default logger instance
 */
export const logger = new Logger('omakase');

export default logger;
