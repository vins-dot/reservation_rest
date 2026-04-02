const dateInput = document.getElementById('date');
const guestsSelect = document.getElementById('guests');
const tablesList = document.getElementById('tables-list');
const noTables = document.getElementById('no-tables');
const form = document.getElementById('reservation-form');
const summaryDiv = document.getElementById('summary');
const successDiv = document.getElementById('success');
const successDetails = document.getElementById('success-details');

let selectedTableId = null;
let selectedTableNumber = null;
let selectedTableCapacity = null;

// Set min date to today
const today = new Date().toISOString().split('T')[0];
dateInput.min = today;

// Step visibility helpers
function showStep(id) {
  document.getElementById(id).classList.remove('hidden');
}

function hideStep(id) {
  document.getElementById(id).classList.add('hidden');
}

function resetFrom(stepId) {
  const steps = ['step-slot', 'step-guests', 'step-table', 'step-info', 'step-confirm'];
  const idx = steps.indexOf(stepId);
  for (let i = idx; i < steps.length; i++) {
    hideStep(steps[i]);
  }
  selectedTableId = null;
  selectedTableNumber = null;
  tablesList.innerHTML = '';
  noTables.classList.add('hidden');
}

// Step 1: Date selected
dateInput.addEventListener('change', () => {
  resetFrom('step-slot');
  if (dateInput.value) {
    // Reset radio selection
    document.querySelectorAll('input[name="time_slot"]').forEach(r => r.checked = false);
    showStep('step-slot');
  }
});

// Step 2: Time slot selected
document.querySelectorAll('input[name="time_slot"]').forEach(radio => {
  radio.addEventListener('change', () => {
    resetFrom('step-guests');
    guestsSelect.value = '';
    showStep('step-guests');
  });
});

// Step 3: Guests selected → fetch tables
guestsSelect.addEventListener('change', () => {
  resetFrom('step-table');
  if (!guestsSelect.value) return;
  fetchAvailableTables();
});

async function fetchAvailableTables() {
  const date = dateInput.value;
  const timeSlot = document.querySelector('input[name="time_slot"]:checked').value;
  const guests = guestsSelect.value;

  const res = await fetch(`/api/tables/available?date=${date}&time_slot=${timeSlot}&guests=${guests}`);
  const tables = await res.json();

  tablesList.innerHTML = '';
  selectedTableId = null;

  if (!res.ok || tables.length === 0) {
    noTables.classList.remove('hidden');
    showStep('step-table');
    return;
  }

  noTables.classList.add('hidden');

  tables.forEach(t => {
    const card = document.createElement('div');
    card.className = 'table-card';
    card.innerHTML = `<div class="table-num">Tavolo ${t.table_number}</div><div class="table-cap">${t.capacity} posti</div>`;
    card.addEventListener('click', () => selectTable(t, card));
    tablesList.appendChild(card);
  });

  showStep('step-table');
}

function selectTable(table, card) {
  document.querySelectorAll('.table-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  selectedTableId = table.id;
  selectedTableNumber = table.table_number;
  selectedTableCapacity = table.capacity;

  showStep('step-info');
}

// Step 5: When user fills info, show summary
document.getElementById('guest_name').addEventListener('input', tryShowSummary);
document.getElementById('guest_phone').addEventListener('input', tryShowSummary);

function tryShowSummary() {
  const name = document.getElementById('guest_name').value.trim();
  const phone = document.getElementById('guest_phone').value.trim();

  if (!name || !phone || !selectedTableId) {
    hideStep('step-confirm');
    return;
  }

  const timeSlot = document.querySelector('input[name="time_slot"]:checked').value;
  const slotLabel = timeSlot === 'lunch' ? 'Pranzo (12:00-15:00)' : 'Cena (19:00-24:00)';
  const dateFormatted = formatDate(dateInput.value);
  const specialReq = document.getElementById('special_requests').value.trim();

  summaryDiv.innerHTML = `
    <strong>Data:</strong> ${dateFormatted}<br>
    <strong>Fascia:</strong> ${slotLabel}<br>
    <strong>Ospiti:</strong> ${guestsSelect.value}<br>
    <strong>Tavolo:</strong> ${selectedTableNumber} (${selectedTableCapacity} posti)<br>
    <strong>Nome:</strong> ${name}<br>
    <strong>Telefono:</strong> ${phone}
    ${specialReq ? `<br><strong>Richieste:</strong> ${specialReq}` : ''}
  `;

  showStep('step-confirm');
}

// Also update summary when special requests changes
document.getElementById('special_requests').addEventListener('input', tryShowSummary);

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// Submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const body = {
    table_id: selectedTableId,
    date: dateInput.value,
    time_slot: document.querySelector('input[name="time_slot"]:checked').value,
    guest_count: parseInt(guestsSelect.value, 10),
    guest_name: document.getElementById('guest_name').value.trim(),
    guest_phone: document.getElementById('guest_phone').value.trim(),
    special_requests: document.getElementById('special_requests').value.trim()
  };

  const res = await fetch('/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || 'Errore durante la prenotazione');
    return;
  }

  const slotLabel = body.time_slot === 'lunch' ? 'Pranzo (12:00-15:00)' : 'Cena (19:00-24:00)';
  successDetails.innerHTML = `
    <strong>Codice prenotazione:</strong> #${data.id}<br>
    <strong>Data:</strong> ${formatDate(body.date)}<br>
    <strong>Fascia:</strong> ${slotLabel}<br>
    <strong>Ospiti:</strong> ${body.guest_count}<br>
    <strong>Tavolo:</strong> ${selectedTableNumber}<br>
    <strong>Nome:</strong> ${body.guest_name}<br>
    <strong>Telefono:</strong> ${body.guest_phone}
    ${body.special_requests ? `<br><strong>Richieste:</strong> ${body.special_requests}` : ''}
  `;

  form.classList.add('hidden');
  successDiv.classList.remove('hidden');
});

// New reservation
document.getElementById('new-reservation').addEventListener('click', () => {
  form.reset();
  form.classList.remove('hidden');
  successDiv.classList.add('hidden');
  resetFrom('step-slot');
  dateInput.value = '';
});
