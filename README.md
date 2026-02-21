# Calorie Tracker

A lightweight, zero-dependency daily calorie tracking web app. Built with a plain Node.js HTTP server and vanilla HTML/CSS/JavaScript — no npm install, no build step required.

## What It Does

- Add food entries with a name and calorie count
- View a daily log of all entries for today
- See a running calorie total that updates as you add or remove entries
- Delete individual entries
- Clear all entries for the day with a single button
- Data persists across page reloads in a local `data.json` file
- Entries are scoped by date, so each day starts fresh

## Requirements

- Node.js 20+ (uses `crypto.randomUUID()` and the built-in test runner)

## Running in Development

```bash
node server.js
```

Then open (http://localhost:3000) in your browser.

The `data.json` file is created automatically on first run. No installation or configuration needed.

## Running Tests

### Unit Tests

Unit tests cover the core utility functions (`getTodayDate`, `sendJSON`, `parseBody`) using Node's built-in test runner — no external dependencies required.

```bash
npm test
```

### Integration Tests

Integration tests exercise the full HTTP API end-to-end and require the server to be running first.

```bash
# Terminal 1 — start the server
node server.js

# Terminal 2 — run integration tests
npm run test:integration
```

## Project Structure

```
.
├── server.js           # Node.js HTTP server — API routes and static file serving
├── utils.js            # Shared utility functions (getTodayDate, sendJSON, parseBody)
├── package.json        # npm scripts for running tests
├── data.json           # JSON data store — entries organized by date (auto-created)
├── public/
│   ├── index.html      # Main UI
│   ├── style.css       # Styles
│   └── app.js          # Client-side JavaScript
└── tests/
    ├── unit.test.js    # Unit tests (Node built-in test runner)
    └── integration.js  # Integration tests (requires running server)
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/entries?date=YYYY-MM-DD` | List entries for a date (defaults to today) |
| `POST` | `/api/entries` | Add an entry `{ "name": "...", "calories": 123 }` |
| `DELETE` | `/api/entries/:id` | Delete a single entry |
| `DELETE` | `/api/entries?date=YYYY-MM-DD` | Clear all entries for a date |
| `GET` | `/api/total?date=YYYY-MM-DD` | Get calorie total for a date |
