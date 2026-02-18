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

- Node.js 19+ (uses `crypto.randomUUID()`)

## Running in Development

```bash
node server.js
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

The `data.json` file is created automatically on first run. No installation or configuration needed.

## Project Structure

```
.
├── server.js        # Node.js HTTP server — API routes and static file serving
├── data.json        # JSON data store — entries organized by date (auto-created)
├── public/
│   ├── index.html   # Main UI
│   ├── style.css    # Styles
│   └── app.js       # Client-side JavaScript
└── tests/
    └── integration.js  # Integration tests
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/entries?date=YYYY-MM-DD` | List entries for a date (defaults to today) |
| `POST` | `/api/entries` | Add an entry `{ "name": "...", "calories": 123 }` |
| `DELETE` | `/api/entries/:id` | Delete a single entry |
| `DELETE` | `/api/entries?date=YYYY-MM-DD` | Clear all entries for a date |
| `GET` | `/api/total?date=YYYY-MM-DD` | Get calorie total for a date |
