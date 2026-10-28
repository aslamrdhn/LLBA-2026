import winston from "winston";
import path from "path";
import fs from "fs";

// Ensure logs directory exists at runtime startup
const LOGS_DIR = path.join(process.cwd(), "logs");
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Custom human-readable format for the console streams
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf((info) => {
    return `[${info.timestamp}] [${info.level.toUpperCase()}]: ${info.message}`;
  }),
);

// Format for local persistent log files (JSON structured)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    // 1. Log errors to a dedicated error file
    new winston.transports.File({
      filename: path.join(LOGS_DIR, "error.log"),
      level: "error",
      format: fileFormat,
    }),
    // 2. Log all system info & updates to combined logs
    new winston.transports.File({
      filename: path.join(LOGS_DIR, "combined.log"),
      format: fileFormat,
    }),
    // 3. Output to developer container console
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
  ],
});

export const securityLogger = winston.createLogger({
  level: "warn",
  format: winston.format.json(),
  transports: [
    // 1. Write warning/error security logs to a private ledger file
    new winston.transports.File({
      filename: path.join(LOGS_DIR, "security.log"),
      level: "warn",
      format: fileFormat,
    }),
    // 2. Output to console stream
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
  ],
});

export const requestLogger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    // 1. Record POS network client requests in a requests file log
    new winston.transports.File({
      filename: path.join(LOGS_DIR, "requests.log"),
      format: fileFormat,
    }),
    // 2. Output to console
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
  ],
});
