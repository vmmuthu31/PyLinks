type LogLevel = "info" | "warn" | "error" | "debug";

class Logger {
  private log(level: LogLevel, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : "";

    const emoji = {
      info: "ℹ️",
      warn: "⚠️",
      error: "❌",
      debug: "🐛",
    }[level];

    console.log(
      `${emoji} [${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`
    );
  }

  info(message: string, meta?: any) {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: any) {
    this.log("warn", message, meta);
  }

  error(message: string, meta?: any) {
    this.log("error", message, meta);
  }

  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV === "development") {
      this.log("debug", message, meta);
    }
  }
}

export const logger = new Logger();
