# Calorie Tracker

A simple, self-contained daily calorie tracking web app. No frameworks, no build tools, no dependencies — just Node.js, HTML, CSS, and vanilla JavaScript.

## Features

- Add food entries with a name and calorie count
- View a daily log of all entries (newest first)
- See a running calorie total for the day
- Delete individual entries
- Clear all entries for the day
- Data persists across page reloads via a local JSON file
- Clean, responsive UI that works on mobile and desktop

## Project Structure

```
calorie-tracker/
├── server.js        # Node.js HTTP server + REST API
├── data.json        # JSON data store (auto-created if missing)
├── public/
│   ├── index.html   # Main UI
│   ├── style.css    # Styles
│   └── app.js       # Client-side JavaScript
└── README.md
```

## Requirements

- Node.js 19 or later (uses `crypto.randomUUID()` built-in)

Check your version:
```bash
node --version
```

## Running Locally

1. Clone or download the project
2. Start the server:
   ```bash
   node server.js
   ```
3. Open your browser at [http://localhost:3000](http://localhost:3000)

No `npm install` required. There are no external dependencies.

## API Reference

The server exposes a simple REST API on port 3000:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/entries` | List today's entries |
| `GET` | `/api/entries?date=YYYY-MM-DD` | List entries for a specific date |
| `GET` | `/api/total` | Get today's calorie total |
| `GET` | `/api/total?date=YYYY-MM-DD` | Get calorie total for a specific date |
| `POST` | `/api/entries` | Add a new entry |
| `DELETE` | `/api/entries/:id` | Delete a single entry by ID |
| `DELETE` | `/api/entries?date=YYYY-MM-DD` | Clear all entries for a date |

### Add an entry

```bash
curl -X POST http://localhost:3000/api/entries \
  -H "Content-Type: application/json" \
  -d '{"name": "Apple", "calories": 95}'
```

Response (201):
```json
{
  "id": "7b197d3d-...",
  "name": "Apple",
  "calories": 95,
  "timestamp": "2026-02-18T09:25:04.314Z"
}
```

### List today's entries

```bash
curl http://localhost:3000/api/entries
```

### Get today's total

```bash
curl http://localhost:3000/api/total
```

Response:
```json
{ "total": 95 }
```

## Data Storage

All entries are stored in `data.json` in the project root. The file is created automatically on first run. Data is organised by date (UTC):

```json
{
  "entries": {
    "2026-02-18": [
      {
        "id": "7b197d3d-d6ea-4841-b405-fddd0116938f",
        "name": "Apple",
        "calories": 95,
        "timestamp": "2026-02-18T09:25:04.314Z"
      }
    ]
  }
}
```

To reset all data, stop the server and delete `data.json` (or replace its contents with `{"entries":{}}`).

## Input Validation

The API rejects invalid entries with a `400` response:

- Name is required and cannot be blank
- Calories must be a number (integers only via the UI)
- Calories cannot be negative (0 is allowed)
