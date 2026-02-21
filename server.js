'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { getTodayDate, sendJSON, parseBody } = require('./utils');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

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

function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJSON(res, 404, { error: 'File not found' });
      return;
    }
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  try {
    // API routes
    if (pathname.startsWith('/api/')) {
      // GET /api/total
      if (pathname === '/api/total' && method === 'GET') {
        const date = parsedUrl.searchParams.get('date') || getTodayDate();
        const data = readData();
        const entries = data.entries || [];
        const total = entries.reduce((sum, e) => sum + e.calories, 0);
        sendJSON(res, 200, { total });
        return;
      }

      // Routes under /api/entries
      if (pathname === '/api/entries' || pathname.startsWith('/api/entries/')) {
        const segments = pathname.split('/').filter(Boolean); // ['api', 'entries', ...id?]
        const hasIdSegment = segments.length > 2;

        if (method === 'GET' && !hasIdSegment) {
          // GET /api/entries?date=YYYY-MM-DD
          const date = parsedUrl.searchParams.get('date') || getTodayDate();
          const data = readData();
          const entries = data.entries || [];
          sendJSON(res, 200, entries);
          return;
        }

        if (method === 'POST' && !hasIdSegment) {
          // POST /api/entries
          let body;
          try {
            body = await parseBody(req);
          } catch {
            sendJSON(res, 400, { error: 'Invalid JSON' });
            return;
          }

          if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
            sendJSON(res, 400, { error: 'Name is required' });
            return;
          }

          if (body.calories === undefined || body.calories === null) {
            sendJSON(res, 400, { error: 'Calories must be a positive number' });
            return;
          }

          const calories = Number(body.calories);
          if (!Number.isFinite(calories) || calories <= 0) {
            sendJSON(res, 400, { error: 'Calories must be a positive number' });
            return;
          }

          const date = getTodayDate();
          const entry = {
            id: crypto.randomUUID(),
            name: body.name.trim(),
            calories: calories,
            timestamp: new Date().toISOString(),
          };

          const data = readData();
          if (!data.entries) {
            data.entries = [];
          }
          data.entries.push(entry);
          writeData(data);

          sendJSON(res, 201, entry);
          return;
        }

        if (method === 'DELETE') {
          if (hasIdSegment) {
            // DELETE /api/entries/:id
            const id = segments[2];
            const date = getTodayDate();
            const data = readData();
            const entries = data.entries || [];
            const idx = entries.findIndex(e => e.id === id);
            if (idx === -1) {
              sendJSON(res, 404, { error: 'Entry not found' });
              return;
            }
            entries.splice(idx, 1);
            data.entries = entries;
            writeData(data);
            res.writeHead(204);
            res.end();
            return;
          } else {
            // DELETE /api/entries?date=YYYY-MM-DD — clear day
            const date = parsedUrl.searchParams.get('date') || getTodayDate();
            const data = readData();
            data.entries = [];
            writeData(data);
            res.writeHead(204);
            res.end();
            return;
          }
        }

        // Method not allowed for /api/entries
        sendJSON(res, 405, { error: 'Method not allowed' });
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
      const safePath = path.normalize(pathname).replace(/^(\.\.[\\/])+/, '');
      filePath = path.join(PUBLIC_DIR, safePath);
    }

    // Ensure the resolved path is within PUBLIC_DIR
    if (!filePath.startsWith(PUBLIC_DIR)) {
      sendJSON(res, 403, { error: 'Forbidden' });
      return;
    }

    serveStaticFile(res, filePath);
  } catch (err) {
    console.error('Server error:', err);
    sendJSON(res, 500, { error: 'Internal server error' });
  }
});

// Ensure data file exists on startup
if (!fs.existsSync(DATA_FILE)) {
  writeData({ entries: {} });
}

server.listen(PORT, () => {
  console.log(`Calorie Tracker server running at http://localhost:${PORT}`);
});
