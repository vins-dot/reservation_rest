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

  // Trova gli id dei tavoli già prenotati per la data e fascia
  const reservedTableIds = db.reservations
    .filter(r => r.date === date && r.time_slot === time_slot)
    .map(r => r.table_id);

  const availableTables = db.tables
    .filter(t => t.capacity >= guestCount && !reservedTableIds.includes(t.id))
    .sort((a, b) => {
      if (a.capacity !== b.capacity) return a.capacity - b.capacity;
      return a.table_number - b.table_number;
    });

  res.json(availableTables);
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

  const table = db.tables.find(t => t.id === parseInt(table_id));
  if (!table) {
    return res.status(404).json({ error: 'Tavolo non trovato' });
  }

  if (guest_count > table.capacity) {
    return res.status(400).json({ error: `Il tavolo ${table.table_number} ha solo ${table.capacity} posti` });
  }

  const conflict = db.reservations.find(r => r.table_id === parseInt(table_id) && r.date === date && r.time_slot === time_slot);
  if (conflict) {
     return res.status(409).json({ error: 'Questo tavolo è già prenotato per questa data e fascia oraria' });
  }

  const newReservation = {
    id: db._reservationId++,
    table_id: parseInt(table_id),
    date,
    time_slot,
    guest_count: parseInt(guest_count),
    guest_name,
    guest_phone,
    special_requests: special_requests || '',
    created_at: new Date().toISOString()
  };

  db.reservations.push(newReservation);
  res.status(201).json(newReservation);
});

// GET /api/reservations/:id
router.get('/reservations/:id', (req, res) => {
  const rId = parseInt(req.params.id);
  const reservation = db.reservations.find(r => r.id === rId);

  if (!reservation) {
    return res.status(404).json({ error: 'Prenotazione non trovata' });
  }

  const table = db.tables.find(t => t.id === reservation.table_id);
  res.json({ ...reservation, table_number: table.table_number, capacity: table.capacity });
});

// DELETE /api/reservations/:id
router.delete('/reservations/:id', (req, res) => {
  const rId = parseInt(req.params.id);
  const index = db.reservations.findIndex(r => r.id === rId);

  if (index === -1) {
    return res.status(404).json({ error: 'Prenotazione non trovata' });
  }

  db.reservations.splice(index, 1);
  res.json({ message: 'Prenotazione cancellata' });
});

module.exports = router;
