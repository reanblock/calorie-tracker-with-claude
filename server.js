const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types for static file serving
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// --- Data helpers ---

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    const initial = { entries: {} };
    writeData(initial);
    return initial;
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

// --- Request helpers ---

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendEmpty(res, statusCode) {
  res.writeHead(statusCode);
  res.end();
}

// --- API route handlers ---

function handleGetEntries(req, res, query) {
  const date = query.get('date') || getToday();
  const data = readData();
  const entries = data.entries[date] || [];
  sendJSON(res, 200, entries);
}

function handleGetTotal(req, res, query) {
  const date = query.get('date') || getToday();
  const data = readData();
  const entries = data.entries[date] || [];
  const total = entries.reduce((sum, e) => sum + e.calories, 0);
  sendJSON(res, 200, { total });
}

async function handlePostEntry(req, res) {
  let body;
  try {
    body = await parseBody(req);
  } catch {
    sendJSON(res, 400, { error: 'Invalid JSON' });
    return;
  }

  // Validation
  if (body.name === undefined || body.name === null || (typeof body.name === 'string' && body.name.trim() === '')) {
    sendJSON(res, 400, { error: 'Name is required' });
    return;
  }

  if (body.calories === undefined || body.calories === null) {
    sendJSON(res, 400, { error: 'Calories is required' });
    return;
  }

  if (typeof body.calories !== 'number' || isNaN(body.calories)) {
    sendJSON(res, 400, { error: 'Calories must be a number' });
    return;
  }

  if (body.calories < 0) {
    sendJSON(res, 400, { error: 'Calories cannot be negative' });
    return;
  }

  const today = getToday();
  const entry = {
    id: crypto.randomUUID(),
    name: body.name.trim(),
    calories: body.calories,
    timestamp: new Date().toISOString(),
  };

  const data = readData();
  if (!data.entries[today]) {
    data.entries[today] = [];
  }
  data.entries[today].push(entry);
  writeData(data);

  sendJSON(res, 201, entry);
}

function handleDeleteEntryById(req, res, entryId) {
  const data = readData();
  let found = false;

  for (const date of Object.keys(data.entries)) {
    const idx = data.entries[date].findIndex(e => e.id === entryId);
    if (idx !== -1) {
      data.entries[date].splice(idx, 1);
      if (data.entries[date].length === 0) {
        delete data.entries[date];
      }
      found = true;
      break;
    }
  }

  if (!found) {
    sendJSON(res, 404, { error: 'Entry not found' });
    return;
  }

  writeData(data);
  sendEmpty(res, 204);
}

function handleClearDay(req, res, query) {
  const date = query.get('date') || getToday();
  const data = readData();
  delete data.entries[date];
  writeData(data);
  sendEmpty(res, 204);
}

// --- Static file serving ---

function serveStaticFile(req, res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        sendJSON(res, 404, { error: 'Not found' });
      } else {
        sendJSON(res, 500, { error: 'Internal server error' });
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

// --- Main request router ---

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.searchParams;
    const method = req.method;

    // API routes
    if (pathname.startsWith('/api/')) {
      // GET /api/entries
      if (method === 'GET' && pathname === '/api/entries') {
        handleGetEntries(req, res, query);
        return;
      }

      // GET /api/total
      if (method === 'GET' && pathname === '/api/total') {
        handleGetTotal(req, res, query);
        return;
      }

      // POST /api/entries
      if (method === 'POST' && pathname === '/api/entries') {
        await handlePostEntry(req, res);
        return;
      }

      // DELETE /api/entries (clear day) vs DELETE /api/entries/:id
      if (method === 'DELETE' && pathname === '/api/entries') {
        handleClearDay(req, res, query);
        return;
      }

      if (method === 'DELETE' && pathname.startsWith('/api/entries/')) {
        const entryId = pathname.slice('/api/entries/'.length);
        handleDeleteEntryById(req, res, entryId);
        return;
      }

      // Unknown API route
      sendJSON(res, 404, { error: 'Not found' });
      return;
    }

    // Static file serving
    let filePath;
    if (pathname === '/') {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    } else {
      // Prevent directory traversal
      const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
      filePath = path.join(PUBLIC_DIR, safePath);
    }

    // Ensure the resolved path is within PUBLIC_DIR
    if (!filePath.startsWith(PUBLIC_DIR)) {
      sendJSON(res, 403, { error: 'Forbidden' });
      return;
    }

    serveStaticFile(req, res, filePath);
  } catch (err) {
    console.error('Server error:', err);
    sendJSON(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:3000`);
});
