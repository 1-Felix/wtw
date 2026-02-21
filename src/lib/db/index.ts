import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { runMigrations } from "./migrations";

const DB_DIR = "/config";
const DB_FILENAME = "wtw.db";
const DB_PATH = path.join(DB_DIR, DB_FILENAME);

const GLOBAL_KEY = "__wtw_db" as const;

declare global {
  // eslint-disable-next-line no-var
  var __wtw_db: Database.Database | undefined;
}

/**
 * Get the singleton database connection. Creates and initializes the DB
 * on first call, reuses the same connection on subsequent calls.
 * Uses globalThis to bridge potential Next.js module isolation between
 * instrumentation and request handlers (same pattern as the cache).
 */
export function getDb(): Database.Database {
  if (globalThis[GLOBAL_KEY]) {
    return globalThis[GLOBAL_KEY];
  }

  const db = openDatabase();
  globalThis[GLOBAL_KEY] = db;
  return db;
}

/**
 * Initialize the database. Call once at startup (from instrumentation.ts).
 * Creates the DB file, enables WAL mode, runs migrations.
 */
export function initDatabase(): void {
  const db = getDb();
  runMigrations(db);
  console.log(`Database initialized at ${DB_PATH}`);
}

/**
 * Check if the database is available (i.e., /config/ directory is writable).
 */
export function isDatabaseAvailable(): boolean {
  try {
    if (!fs.existsSync(DB_DIR)) {
      return false;
    }
    fs.accessSync(DB_DIR, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the path to the database file.
 */
export function getDatabasePath(): string {
  return DB_PATH;
}

function openDatabase(): Database.Database {
  // Ensure the config directory exists
  if (!fs.existsSync(DB_DIR)) {
    try {
      fs.mkdirSync(DB_DIR, { recursive: true });
    } catch (err) {
      console.error(
        `Cannot create database directory ${DB_DIR}: ${err instanceof Error ? err.message : String(err)}`
      );
      console.error("Falling back to in-memory database. Settings will not persist.");
      return createInMemoryDb();
    }
  }

  // Check write permissions
  try {
    fs.accessSync(DB_DIR, fs.constants.W_OK);
  } catch {
    console.error(
      `Database directory ${DB_DIR} is not writable. Falling back to in-memory database.`
    );
    return createInMemoryDb();
  }

  try {
    const db = new Database(DB_PATH);
    configurePragmas(db);
    return db;
  } catch (err) {
    console.error(
      `Failed to open database at ${DB_PATH}: ${err instanceof Error ? err.message : String(err)}`
    );
    console.error("Falling back to in-memory database. Settings will not persist.");
    return createInMemoryDb();
  }
}

function createInMemoryDb(): Database.Database {
  const db = new Database(":memory:");
  configurePragmas(db);
  return db;
}

function configurePragmas(db: Database.Database): void {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
}
