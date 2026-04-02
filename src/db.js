const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'reservations.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY,
    table_number INTEGER NOT NULL UNIQUE,
    capacity INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id INTEGER NOT NULL REFERENCES tables(id),
    date TEXT NOT NULL,
    time_slot TEXT NOT NULL CHECK(time_slot IN ('lunch', 'dinner')),
    guest_count INTEGER NOT NULL,
    guest_name TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    special_requests TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(table_id, date, time_slot)
  );
`);

// Seed tables: 1-3 (2 posti), 4-6 (4 posti), 7-8 (6 posti), 9-10 (8 posti)
const seed = db.prepare('INSERT OR IGNORE INTO tables (table_number, capacity) VALUES (?, ?)');
const seedAll = db.transaction(() => {
  for (let i = 1; i <= 3; i++) seed.run(i, 2);
  for (let i = 4; i <= 6; i++) seed.run(i, 4);
  for (let i = 7; i <= 8; i++) seed.run(i, 6);
  for (let i = 9; i <= 10; i++) seed.run(i, 8);
});
seedAll();

module.exports = db;
