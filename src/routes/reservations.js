const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/tables/available?date=YYYY-MM-DD&time_slot=lunch|dinner&guests=N
router.get('/tables/available', (req, res) => {
  const { date, time_slot, guests } = req.query;

  if (!date || !time_slot || !guests) {
    return res.status(400).json({ error: 'Parametri richiesti: date, time_slot, guests' });
  }

  if (!['lunch', 'dinner'].includes(time_slot)) {
    return res.status(400).json({ error: 'time_slot deve essere "lunch" o "dinner"' });
  }

  const guestCount = parseInt(guests, 10);
  if (isNaN(guestCount) || guestCount < 1) {
    return res.status(400).json({ error: 'guests deve essere almeno 1' });
  }

  const today = new Date().toISOString().split('T')[0];
  if (date < today) {
    return res.status(400).json({ error: 'Non puoi prenotare nel passato' });
  }

  const tables = db.prepare(`
    SELECT t.id, t.table_number, t.capacity
    FROM tables t
    WHERE t.capacity >= ?
      AND t.id NOT IN (
        SELECT r.table_id FROM reservations r
        WHERE r.date = ? AND r.time_slot = ?
      )
    ORDER BY t.capacity ASC, t.table_number ASC
  `).all(guestCount, date, time_slot);

  res.json(tables);
});

// POST /api/reservations
router.post('/reservations', (req, res) => {
  const { table_id, date, time_slot, guest_count, guest_name, guest_phone, special_requests } = req.body;

  if (!table_id || !date || !time_slot || !guest_count || !guest_name || !guest_phone) {
    return res.status(400).json({ error: 'Campi obbligatori: table_id, date, time_slot, guest_count, guest_name, guest_phone' });
  }

  if (!['lunch', 'dinner'].includes(time_slot)) {
    return res.status(400).json({ error: 'time_slot deve essere "lunch" o "dinner"' });
  }

  const today = new Date().toISOString().split('T')[0];
  if (date < today) {
    return res.status(400).json({ error: 'Non puoi prenotare nel passato' });
  }

  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(table_id);
  if (!table) {
    return res.status(404).json({ error: 'Tavolo non trovato' });
  }

  if (guest_count > table.capacity) {
    return res.status(400).json({ error: `Il tavolo ${table.table_number} ha solo ${table.capacity} posti` });
  }

  try {
    const result = db.prepare(`
      INSERT INTO reservations (table_id, date, time_slot, guest_count, guest_name, guest_phone, special_requests)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(table_id, date, time_slot, guest_count, guest_name, guest_phone, special_requests || '');

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(reservation);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Questo tavolo è già prenotato per questa data e fascia oraria' });
    }
    res.status(500).json({ error: 'Errore del server' });
  }
});

// GET /api/reservations/:id
router.get('/reservations/:id', (req, res) => {
  const reservation = db.prepare(`
    SELECT r.*, t.table_number, t.capacity
    FROM reservations r
    JOIN tables t ON t.id = r.table_id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!reservation) {
    return res.status(404).json({ error: 'Prenotazione non trovata' });
  }

  res.json(reservation);
});

// DELETE /api/reservations/:id
router.delete('/reservations/:id', (req, res) => {
  const result = db.prepare('DELETE FROM reservations WHERE id = ?').run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Prenotazione non trovata' });
  }

  res.json({ message: 'Prenotazione cancellata' });
});

module.exports = router;
