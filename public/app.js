const dateInput = document.getElementById('date');
const guestsSelect = document.getElementById('guests');
const timeSlotRadios = document.querySelectorAll('input[name="time_slot"]');
const tablesList = document.getElementById('tables-list');
const noTables = document.getElementById('no-tables');
const form = document.getElementById('reservation-form');
const confirmBtn = document.getElementById('btn-confirm');

const liveSummary = document.getElementById('live-summary');
const successDiv = document.getElementById('success');
const successDetails = document.getElementById('success-details');
const stepTable = document.getElementById('step-table');
const stepInfo = document.getElementById('step-info');

const nameInput = document.getElementById('guest_name');
const phoneInput = document.getElementById('guest_phone');
const specialReqInput = document.getElementById('special_requests');

let state = {
  date: '',
  time_slot: '',
  guests: '',
  table_id: null,
  table_number: null,
  table_capacity: null,
  name: '',
  phone: '',
  specialReq: ''
};

// Set min date to today
const today = new Date().toISOString().split('T')[0];
dateInput.min = today;

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// ----------------------------------------------------
// UI Update & Live Summary
// ----------------------------------------------------
function updateLiveSummary() {
  let html = '';
  
  if (state.date || state.time_slot) {
    const slotLabel = state.time_slot === 'lunch' ? 'Pranzo (12:00-15:00)' : (state.time_slot === 'dinner' ? 'Cena (19:00-24:00)' : '');
    html += `
      <div class="summary-row">
        <span class="summary-label">Data e Ora:</span>
        <span class="summary-val">${formatDate(state.date)} ${state.date ? '-' : ''} ${slotLabel}</span>
      </div>
    `;
  }

  if (state.guests) {
    html += `
      <div class="summary-row">
        <span class="summary-label">Ospiti:</span>
        <span class="summary-val">${state.guests} persone</span>
      </div>
    `;
  }

  if (state.table_id) {
    html += `
      <div class="summary-row">
        <span class="summary-label">Tavolo:</span>
        <span class="summary-val">Nr. ${state.table_number} (${state.table_capacity} posti)</span>
      </div>
    `;
  }

  if (state.name) {
    html += `
      <div class="summary-row">
        <span class="summary-label">Nominativo:</span>
        <span class="summary-val">${state.name}</span>
      </div>
    `;
  }

  if (state.phone) {
    html += `
      <div class="summary-row">
        <span class="summary-label">Telefono:</span>
        <span class="summary-val">${state.phone}</span>
      </div>
    `;
  }

  if (!html) {
    liveSummary.innerHTML = '<div class="summary-row empty-state">Inizia a compilare il modulo a sinistra per visualizzare il tuo riepilogo in tempo reale.</div>';
  } else {
    liveSummary.innerHTML = html;
  }

  validateForm();
}

function validateForm() {
  const isValid = state.date && state.time_slot && state.guests && state.table_id && state.name && state.phone;
  confirmBtn.disabled = !isValid;
}

// ----------------------------------------------------
// Event Listeners
// ----------------------------------------------------
dateInput.addEventListener('input', () => {
  state.date = dateInput.value;
  checkStep2();
  fetchTablesIfReady();
  updateLiveSummary();
});

timeSlotRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    state.time_slot = e.target.value;
    checkStep2();
    fetchTablesIfReady();
    updateLiveSummary();
  });
});

function checkStep2() {
  if (state.date && state.time_slot) {
    guestsSelect.disabled = false;
  } else {
    guestsSelect.disabled = true;
    guestsSelect.value = '';
    state.guests = '';
    resetTable();
  }
}

guestsSelect.addEventListener('change', () => {
  state.guests = guestsSelect.value;
  resetTable();
  if (state.guests) {
    fetchTablesIfReady();
  }
  updateLiveSummary();
});

['input', 'change'].forEach(evt => {
  nameInput.addEventListener(evt, () => { state.name = nameInput.value.trim(); updateLiveSummary(); });
  phoneInput.addEventListener(evt, () => { state.phone = phoneInput.value.trim(); updateLiveSummary(); });
  specialReqInput.addEventListener(evt, () => { state.specialReq = specialReqInput.value.trim(); updateLiveSummary(); });
});

// ----------------------------------------------------
// Table Fetching
// ----------------------------------------------------
async function fetchTablesIfReady() {
  if (!state.date || !state.time_slot || !state.guests) return;
  
  stepTable.classList.remove('hidden');
  tablesList.innerHTML = '<div class="info-msg" style="grid-column: 1/-1;">Ricerca tavoli disponibili...</div>';
  
  try {
    const res = await fetch(`/api/tables/available?date=${state.date}&time_slot=${state.time_slot}&guests=${state.guests}`);
    const tables = await res.json();
    
    tablesList.innerHTML = '';
    state.table_id = null;
    
    if (!res.ok || tables.length === 0) {
      noTables.classList.remove('hidden');
      stepInfo.style.opacity = '0.5';
      stepInfo.style.pointerEvents = 'none';
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
  } catch (err) {
    tablesList.innerHTML = '<div class="info-msg" style="grid-column: 1/-1; color: var(--danger);">Errore di connessione. Riprova.</div>';
  }
}

function selectTable(table, card) {
  document.querySelectorAll('.table-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  
  state.table_id = table.id;
  state.table_number = table.table_number;
  state.table_capacity = table.capacity;
  
  stepInfo.style.opacity = '1';
  stepInfo.style.pointerEvents = 'auto';
  
  updateLiveSummary();
}

function resetTable() {
  state.table_id = null;
  state.table_number = null;
  state.table_capacity = null;
  stepTable.classList.add('hidden');
  tablesList.innerHTML = '';
  noTables.classList.add('hidden');
  
  stepInfo.style.opacity = '0.5';
  stepInfo.style.pointerEvents = 'none';
  nameInput.value = ''; state.name = '';
  phoneInput.value = ''; state.phone = '';
  specialReqInput.value = ''; state.specialReq = '';
}

// ----------------------------------------------------
// Submit
// ----------------------------------------------------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (confirmBtn.disabled) return;

  const body = {
    table_id: state.table_id,
    date: state.date,
    time_slot: state.time_slot,
    guest_count: parseInt(state.guests, 10),
    guest_name: state.name,
    guest_phone: state.phone,
    special_requests: state.specialReq
  };

  try {
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

    // Successo
    const slotLabel = body.time_slot === 'lunch' ? 'Pranzo (12:00-15:00)' : 'Cena (19:00-24:00)';
    successDetails.innerHTML = `
      <strong>Codice prenotazione:</strong> #${data.id}<br>
      <strong>Data:</strong> ${formatDate(body.date)}<br>
      <strong>Fascia:</strong> ${slotLabel}<br>
      <strong>Ospiti:</strong> ${body.guest_count}<br>
      <strong>Tavolo:</strong> Nr. ${state.table_number}
    `;
    
    successDiv.classList.remove('hidden');
  } catch(err) {
    alert('Errore di connessione al server.');
  }
});

// ----------------------------------------------------
// Nuova prenotazione
// ----------------------------------------------------
document.getElementById('new-reservation').addEventListener('click', () => {
  location.reload();
});
