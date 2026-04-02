// In-memory mock per evitare la dipendenza da better-sqlite3

const db = {
  tables: [],
  reservations: [],
  _reservationId: 1
};

// Seed tables: 1-3 (2 posti), 4-6 (4 posti), 7-8 (6 posti), 9-10 (8 posti)
let tableId = 1;

for (let i = 1; i <= 3; i++) db.tables.push({ id: tableId++, table_number: i, capacity: 2 });
for (let i = 4; i <= 6; i++) db.tables.push({ id: tableId++, table_number: i, capacity: 4 });
for (let i = 7; i <= 8; i++) db.tables.push({ id: tableId++, table_number: i, capacity: 6 });
for (let i = 9; i <= 10; i++) db.tables.push({ id: tableId++, table_number: i, capacity: 8 });

module.exports = db;
