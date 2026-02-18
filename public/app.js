'use strict';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatTimestamp(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const dateDisplay  = document.getElementById('date-display');
const totalDisplay = document.getElementById('total-display');
const entryList    = document.getElementById('entry-list');
const emptyState   = document.getElementById('empty-state');
const entryForm    = document.getElementById('entry-form');
const foodNameInput = document.getElementById('food-name');
const caloriesInput = document.getElementById('calories');
const nameError    = document.getElementById('name-error');
const caloriesError = document.getElementById('calories-error');
const clearBtn     = document.getElementById('clear-btn');

// ─── Init ─────────────────────────────────────────────────────────────────────

(function initDate() {
  const now = new Date();
  dateDisplay.textContent = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
})();

// ─── API ─────────────────────────────────────────────────────────────────────

async function fetchEntries() {
  const res = await fetch(`/api/entries?date=${todayStr()}`);
  if (!res.ok) throw new Error('Failed to fetch entries');
  return res.json();
}

async function fetchTotal() {
  const res = await fetch(`/api/total?date=${todayStr()}`);
  if (!res.ok) throw new Error('Failed to fetch total');
  return res.json();
}

async function postEntry(name, calories) {
  const res = await fetch('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, calories }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to add entry');
  }
  return res.json();
}

async function deleteEntry(id) {
  const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete entry');
  }
}

async function clearDay() {
  const res = await fetch(`/api/entries?date=${todayStr()}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to clear day');
  }
}

// ─── Render ──────────────────────────────────────────────────────────────────

function renderEntries(entries) {
  entryList.innerHTML = '';

  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  if (sorted.length === 0) {
    emptyState.style.display = '';
    return;
  }

  emptyState.style.display = 'none';

  sorted.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'entry-item';
    li.dataset.id = entry.id;

    li.innerHTML = `
      <div class="entry-info">
        <div class="entry-name">${escapeHtml(entry.name)}</div>
        <div class="entry-meta">${formatTimestamp(entry.timestamp)}</div>
      </div>
      <span class="entry-calories">${entry.calories} cal</span>
      <button class="btn btn-danger delete-btn" aria-label="Delete ${escapeHtml(entry.name)}">Delete</button>
    `;

    li.querySelector('.delete-btn').addEventListener('click', () => onDelete(entry.id));
    entryList.appendChild(li);
  });
}

function renderTotal(total) {
  totalDisplay.textContent = `Total: ${total} cal`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Refresh ─────────────────────────────────────────────────────────────────

async function refresh() {
  try {
    const [entries, totalData] = await Promise.all([fetchEntries(), fetchTotal()]);
    renderEntries(entries);
    renderTotal(totalData.total);
  } catch (err) {
    console.error('Refresh error:', err);
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────

function clearErrors() {
  nameError.textContent = '';
  caloriesError.textContent = '';
  foodNameInput.classList.remove('invalid');
  caloriesInput.classList.remove('invalid');
}

function validateForm() {
  clearErrors();
  let valid = true;

  const name = foodNameInput.value.trim();
  if (!name) {
    nameError.textContent = 'Food name is required.';
    foodNameInput.classList.add('invalid');
    valid = false;
  }

  const calRaw = caloriesInput.value.trim();
  const calories = Number(calRaw);
  if (!calRaw || !Number.isInteger(calories) || calories < 1) {
    caloriesError.textContent = 'Calories must be a positive whole number.';
    caloriesInput.classList.add('invalid');
    valid = false;
  }

  return valid ? { name, calories } : null;
}

// ─── Event handlers ───────────────────────────────────────────────────────────

entryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = validateForm();
  if (!data) return;

  const submitBtn = entryForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Adding…';

  try {
    await postEntry(data.name, data.calories);
    entryForm.reset();
    clearErrors();
    await refresh();
  } catch (err) {
    nameError.textContent = err.message || 'Could not add entry.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Entry';
  }
});

async function onDelete(id) {
  try {
    await deleteEntry(id);
    await refresh();
  } catch (err) {
    console.error('Delete error:', err);
    alert('Could not delete entry: ' + err.message);
  }
}

clearBtn.addEventListener('click', async () => {
  const confirmed = window.confirm('Clear all entries for today?');
  if (!confirmed) return;

  clearBtn.disabled = true;
  try {
    await clearDay();
    await refresh();
  } catch (err) {
    console.error('Clear error:', err);
    alert('Could not clear day: ' + err.message);
  } finally {
    clearBtn.disabled = false;
  }
});

// ─── Bootstrap ───────────────────────────────────────────────────────────────

refresh();
