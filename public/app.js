/* ===== Utilities ===== */

function getTodayString() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/* ===== DOM Refs ===== */
const todayDateEl   = document.getElementById('today-date');
const totalValueEl  = document.querySelector('[aria-label="daily total"]');
const entryForm     = document.getElementById('entry-form');
const foodNameInput = document.getElementById('food-name');
const caloriesInput = document.getElementById('calories');
const formErrorEl   = document.getElementById('form-error');
const apiErrorEl    = document.getElementById('api-error');
const entryListEl   = document.getElementById('entry-list');
const emptyStateEl  = document.getElementById('empty-state');
const clearDayBtn   = document.getElementById('clear-day-btn');

/* ===== Error helpers ===== */
function showFormError(msg) {
  formErrorEl.textContent = msg;
  formErrorEl.hidden = false;
}

function clearFormError() {
  formErrorEl.textContent = '';
  formErrorEl.hidden = true;
}

function showApiError(msg) {
  apiErrorEl.textContent = msg;
  apiErrorEl.hidden = false;
}

function clearApiError() {
  apiErrorEl.textContent = '';
  apiErrorEl.hidden = true;
}

/* ===== Render ===== */
function renderEntries(entries) {
  entryListEl.innerHTML = '';

  if (!entries || entries.length === 0) {
    emptyStateEl.hidden = false;
    return;
  }

  emptyStateEl.hidden = true;

  // Newest first
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  sorted.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'entry-item';
    li.dataset.id = entry.id;

    li.innerHTML = `
      <div class="entry-info">
        <div class="entry-name">${escapeHtml(entry.name)}</div>
        <div class="entry-time">${formatTime(entry.timestamp)}</div>
      </div>
      <span class="entry-calories">${entry.calories}</span>
      <button
        class="btn btn--danger"
        aria-label="delete entry"
        data-id="${escapeHtml(entry.id)}"
      >Delete</button>
    `;

    entryListEl.appendChild(li);
  });
}

function renderTotal(total) {
  totalValueEl.textContent = total;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ===== API calls ===== */
async function fetchEntries() {
  const res = await fetch('/api/entries');
  if (!res.ok) throw new Error(`Failed to fetch entries (${res.status})`);
  return res.json();
}

async function fetchTotal() {
  const res = await fetch('/api/total');
  if (!res.ok) throw new Error(`Failed to fetch total (${res.status})`);
  const data = await res.json();
  return data.total;
}

async function refreshAll() {
  clearApiError();
  try {
    const [entries, total] = await Promise.all([fetchEntries(), fetchTotal()]);
    renderEntries(entries);
    renderTotal(total);
  } catch (err) {
    console.error('Failed to refresh data:', err);
    showApiError('Could not load entries. Please refresh the page.');
  }
}

/* ===== Validation ===== */
function validateForm(name, caloriesRaw) {
  if (!name) {
    return 'Food name cannot be empty.';
  }
  if (caloriesRaw === '' || caloriesRaw === null) {
    return 'Calories are required.';
  }
  const cal = Number(caloriesRaw);
  if (!Number.isInteger(cal) || cal < 0) {
    return 'Calories must be a whole number (0 or greater).';
  }
  return null;
}

/* ===== Form submit ===== */
entryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFormError();

  const name = foodNameInput.value.trim();
  const caloriesRaw = caloriesInput.value.trim();

  const validationError = validateForm(name, caloriesRaw);
  if (validationError) {
    showFormError(validationError);
    return;
  }

  const calories = parseInt(caloriesRaw, 10);

  try {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, calories }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showFormError(data.error || `Server error (${res.status})`);
      return;
    }

    // Success: clear form and refresh
    entryForm.reset();
    foodNameInput.focus();
    await refreshAll();
  } catch (err) {
    console.error('Failed to add entry:', err);
    showFormError('Could not add entry. Check your connection and try again.');
  }
});

/* ===== Delete single entry ===== */
entryListEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('[aria-label="delete entry"]');
  if (!btn) return;

  const id = btn.dataset.id;
  if (!id) return;

  // Animate removal
  const item = btn.closest('.entry-item');
  if (item) item.classList.add('removing');

  try {
    const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });

    if (!res.ok && res.status !== 404) {
      const data = await res.json().catch(() => ({}));
      showApiError(data.error || `Failed to delete entry (${res.status})`);
      if (item) item.classList.remove('removing');
      return;
    }

    await refreshAll();
  } catch (err) {
    console.error('Failed to delete entry:', err);
    showApiError('Could not delete entry. Check your connection and try again.');
    if (item) item.classList.remove('removing');
  }
});

/* ===== Clear Day ===== */
clearDayBtn.addEventListener('click', async () => {
  if (!confirm('Clear all entries for today?')) return;

  try {
    const today = getTodayString();
    const res = await fetch(`/api/entries?date=${today}`, { method: 'DELETE' });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showApiError(data.error || `Failed to clear day (${res.status})`);
      return;
    }

    await refreshAll();
  } catch (err) {
    console.error('Failed to clear day:', err);
    showApiError('Could not clear day. Check your connection and try again.');
  }
});

/* ===== Init ===== */
(function init() {
  // Display today's date
  todayDateEl.textContent = formatDate(new Date());

  // Load entries and total
  refreshAll();
})();
