export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  DEBUG = "DEBUG",
}

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    let metaString = "";
    if (meta) {
      if (meta instanceof Error) {
        metaString = ` ${meta.stack || meta.message}`;
      } else {
        metaString = ` ${JSON.stringify(meta)}`;
      }
    }
    return `[${timestamp}] [${level}] [${this.context}] ${message}${metaString}`;
  }

  info(message: string, meta?: any) {
    console.log(this.formatMessage(LogLevel.INFO, message, meta));
  }

  warn(message: string, meta?: any) {
    console.warn(this.formatMessage(LogLevel.WARN, message, meta));
  }

  error(message: string, error?: any) {
    console.error(this.formatMessage(LogLevel.ERROR, message, error));
  }

  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV === "development") {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, meta));
    }
  }
}
