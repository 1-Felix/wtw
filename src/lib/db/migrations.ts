import type Database from "better-sqlite3";
import {
  CREATE_SETTINGS_TABLE,
  CREATE_WEBHOOKS_TABLE,
  CREATE_NOTIFICATION_LOG_TABLE,
  CREATE_DISMISSED_ITEMS_TABLE,
  CREATE_NOTIFICATION_LOG_INDEX,
} from "./schema";

interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

/**
 * All migrations in order. Each migration runs inside a transaction.
 * Never remove or reorder existing migrations — only append new ones.
 */
const migrations: Migration[] = [
  {
    version: 1,
    name: "create_initial_tables",
    up(db) {
      db.exec(CREATE_SETTINGS_TABLE);
      db.exec(CREATE_WEBHOOKS_TABLE);
      db.exec(CREATE_NOTIFICATION_LOG_TABLE);
      db.exec(CREATE_DISMISSED_ITEMS_TABLE);
      db.exec(CREATE_NOTIFICATION_LOG_INDEX);
    },
  },
];

const CREATE_MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS _migrations (
  version    INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

/**
 * Run all pending migrations. Migrations that have already been applied
 * (tracked in the _migrations table) are skipped.
 */
export function runMigrations(db: Database.Database): void {
  // Ensure the migrations tracking table exists
  db.exec(CREATE_MIGRATIONS_TABLE);

  const appliedVersions = new Set(
    db
      .prepare("SELECT version FROM _migrations")
      .all()
      .map((row) => (row as { version: number }).version)
  );

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    const runInTransaction = db.transaction(() => {
      migration.up(db);
      db.prepare(
        "INSERT INTO _migrations (version, name) VALUES (?, ?)"
      ).run(migration.version, migration.name);
    });

    runInTransaction();
    console.log(`Applied migration v${String(migration.version).padStart(3, "0")}: ${migration.name}`);
  }
}
