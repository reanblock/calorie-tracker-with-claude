# Plan: Calorie Tracker Web App

## Task Description
Build a simple calorie tracker web app using plain HTML, CSS, and vanilla JavaScript with a JSON file as the data store. No frameworks, no build tools. The app must allow users to add food entries (name + calories), view a daily log, see a running total, delete entries, and reset/clear the day. Two builder agents work in parallel—one on the data layer (Opus), one on the UI (Sonnet)—followed by testing and validation.

## Objective
Deliver a fully functional, self-contained calorie tracker web application that runs from a single HTML file (or a small set of static files) with a Node.js backend serving a JSON-based data store. Users can track daily calorie intake through an intuitive interface.

## Problem Statement
Users need a lightweight, no-dependency calorie tracking tool that can run locally without complex setup. The app should persist data across page reloads using a simple JSON file store and provide a clean, responsive interface for daily food logging.

## Solution Approach
Build a minimal client-server architecture:
- **Backend**: A simple Node.js HTTP server (no Express, no frameworks) that reads/writes a `data.json` file and exposes REST-like API endpoints for CRUD operations on food entries.
- **Frontend**: A single `index.html` file with embedded or linked CSS and vanilla JavaScript that communicates with the backend via `fetch()`.
- **Data Model**: A JSON file storing entries organized by date, with each entry having an id, name, calories, and timestamp.

## Relevant Files

### New Files
- **server.js** — Node.js HTTP server handling API routes and serving static files. Reads/writes `data.json`.
- **data.json** — JSON data store for food entries, organized by date.
- **public/index.html** — Main HTML page with the calorie tracker UI.
- **public/style.css** — Stylesheet for the calorie tracker.
- **public/app.js** — Client-side JavaScript handling user interactions and API calls.
- **tests/test.sh** — Shell-based integration tests using curl to validate API endpoints.
- **tests/ui-test.js** — Node.js script to validate UI file structure and content.

## Implementation Phases

### Phase 1: Foundation
- Define the data model and JSON file structure
- Create the Node.js server with file I/O operations
- Establish API endpoint contracts

### Phase 2: Core Implementation
- **Data Layer (Parallel)**: Implement all server-side routes — GET entries, POST entry, DELETE entry, DELETE all (reset day), GET daily total
- **UI Layer (Parallel)**: Build HTML structure, CSS styling, and client-side JavaScript for all user interactions

### Phase 3: Integration & Polish
- Wire UI to API endpoints
- Test all happy paths, edge cases, and failure scenarios
- Validate end-to-end functionality

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- You're responsible for deploying the right team members with the right context to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to to the building, validating, testing, deploying, and other tasks.
  - This is critical. You're job is to act as a high level director of the team, not a builder.
  - You're role is to validate all work is going well and make sure the team is on track to complete the plan.
  - You'll orchestrate this by using the Task* Tools to manage coordination between the team members.
  - Communication is paramount. You'll use the Task* Tools to communicate with the team members and ensure they're on track to complete the plan.
- Take note of the session id of each team member. This is how you'll reference them.

### Team Members

- Builder
  - Name: data-builder
  - Role: Implement the Node.js server, JSON data store, and all API endpoints (data layer)
  - Agent Type: general-purpose
  - Model: opus
  - Resume: true

- Builder
  - Name: ui-builder
  - Role: Build the HTML page, CSS styling, and client-side JavaScript (UI layer)
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Tester
  - Name: tester
  - Role: Write and run integration tests covering happy paths, edge cases, and failure scenarios
  - Agent Type: tester
  - Model: sonnet
  - Resume: true

- Validator
  - Name: validator
  - Role: Wire everything together, verify the app meets all acceptance criteria end-to-end
  - Agent Type: validator
  - Model: sonnet
  - Resume: true

## Step by Step Tasks

- IMPORTANT: Execute every step in order, top to bottom. Each task maps directly to a `TaskCreate` call.
- Before you start, run `TaskCreate` to create the initial task list that all team members can see and execute.

### 1. Build Data Layer (Server + API + JSON Store)
- **Task ID**: build-data-layer
- **Depends On**: none
- **Assigned To**: data-builder
- **Agent Type**: general-purpose
- **Model**: opus
- **Parallel**: true (runs alongside build-ui-layer)
- Create `data.json` with initial structure: `{ "entries": {} }` where keys are date strings (YYYY-MM-DD) and values are arrays of entry objects
- Each entry object: `{ "id": "<uuid>", "name": "<food name>", "calories": <number>, "timestamp": "<ISO string>" }`
- Create `server.js` with a plain Node.js HTTP server (no npm dependencies) that:
  - Serves static files from `public/` directory
  - Handles these API routes:
    - `GET /api/entries?date=YYYY-MM-DD` — Returns entries for a given date (defaults to today)
    - `GET /api/total?date=YYYY-MM-DD` — Returns `{ "total": <number> }` for the given date
    - `POST /api/entries` — Accepts `{ "name": "...", "calories": <number> }`, generates UUID, stores entry under today's date, returns created entry
    - `DELETE /api/entries/:id` — Deletes entry by ID from today's date, returns 204
    - `DELETE /api/entries?date=YYYY-MM-DD` — Clears all entries for the given date (reset day), returns 204
  - Returns proper JSON responses with correct Content-Type headers
  - Handles errors gracefully (400 for bad input, 404 for not found, 500 for server errors)
  - Listens on port 3000
- Implement file I/O with proper read/write locking (read full file, modify in memory, write back)
- Generate UUIDs using `crypto.randomUUID()` (built into Node.js)

### 2. Build UI Layer (HTML + CSS + Client JS)
- **Task ID**: build-ui-layer
- **Depends On**: none
- **Assigned To**: ui-builder
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (runs alongside build-data-layer)
- Create `public/index.html` with:
  - Page title "Calorie Tracker"
  - A form with inputs for food name (text) and calorie count (number), plus an "Add" button
  - A section showing today's date prominently
  - A running total display showing sum of all calories for today
  - A list/table of food entries showing name, calories, timestamp, and a delete button per row
  - A "Clear Day" / "Reset" button to wipe all entries for today
  - Link to `style.css` and `app.js`
- Create `public/style.css` with:
  - Clean, modern design with a centered container (max-width ~600px)
  - Responsive layout that works on mobile and desktop
  - Styled form inputs and buttons
  - Entry list with alternating row colors or subtle borders
  - Total display prominently styled (larger font, distinct color)
  - Delete buttons styled as small red/danger buttons
  - Clear Day button styled distinctly (warning color)
  - Smooth transitions for adding/removing entries
- Create `public/app.js` with:
  - On page load: fetch today's entries from `GET /api/entries` and render them
  - On page load: fetch today's total from `GET /api/total` and display it
  - Form submit handler: POST new entry to `/api/entries`, then refresh the list and total
  - Delete button handler: DELETE entry via `/api/entries/:id`, then refresh the list and total
  - Clear Day button handler: DELETE all via `/api/entries?date=today`, then refresh the list and total
  - Input validation: name must not be empty, calories must be a positive number
  - Display entries in reverse chronological order (newest first)
  - Show a friendly empty state message when no entries exist

### 3. Run Tests
- **Task ID**: run-tests
- **Depends On**: build-data-layer, build-ui-layer
- **Assigned To**: tester
- **Agent Type**: tester
- **Model**: sonnet
- **Parallel**: false
- Start the server and write integration tests using curl or a Node.js test script:
  - **Happy Paths**:
    - Add a food entry and verify it appears in GET response
    - Add multiple entries and verify total is correct
    - Delete a single entry and verify it's removed
    - Clear the day and verify all entries are gone
    - Verify entries are scoped to the correct date
  - **Edge Cases**:
    - Add entry with 0 calories
    - Add entry with very large calorie count
    - Add entry with special characters in name
    - Delete an entry that doesn't exist (expect 404)
    - Get entries for a date with no entries (expect empty array)
    - Clear a day that has no entries (expect 204, no error)
  - **Failure Scenarios**:
    - POST with missing name field (expect 400)
    - POST with missing calories field (expect 400)
    - POST with negative calories (expect 400)
    - POST with non-numeric calories (expect 400)
    - POST with empty name string (expect 400)
    - GET with invalid date format
- Report test results clearly (pass/fail for each test)
- If any tests fail, document the failure clearly so a builder can fix it

### 4. Fix Test Failures (If Any)
- **Task ID**: fix-test-failures
- **Depends On**: run-tests
- **Assigned To**: data-builder (resume with existing context)
- **Agent Type**: general-purpose
- **Model**: opus
- **Parallel**: false
- Review test results from the tester
- Fix any bugs in server.js, app.js, or other files
- Only execute this step if tests from step 3 reported failures
- If no failures, skip this step and proceed to validation

### 5. Re-run Tests After Fixes (If Needed)
- **Task ID**: rerun-tests
- **Depends On**: fix-test-failures
- **Assigned To**: tester
- **Agent Type**: tester
- **Model**: sonnet
- **Parallel**: false
- Re-run all tests to confirm fixes resolved the failures
- Only execute this step if step 4 was executed
- All tests must pass before proceeding to validation

### 6. Final Validation
- **Task ID**: validate-all
- **Depends On**: run-tests, fix-test-failures, rerun-tests
- **Assigned To**: validator
- **Agent Type**: validator
- **Model**: sonnet
- **Parallel**: false
- Start the server and verify the complete application end-to-end:
  - Verify `server.js` starts without errors on port 3000
  - Verify `public/index.html` is served at `http://localhost:3000/`
  - Verify all API endpoints respond correctly
  - Verify the HTML contains all required UI elements (form, entry list, total display, clear button)
  - Verify CSS file loads and contains styling rules
  - Verify app.js connects to all API endpoints
  - Verify data persists in `data.json` after adding entries
  - Verify data.json is properly formatted JSON
  - Walk through the full user flow: add entry → see it in list → see total update → delete entry → clear day
- Confirm all acceptance criteria are met
- Report final status

## Acceptance Criteria
- [ ] App runs with `node server.js` — no npm install, no build step required
- [ ] Users can add a food entry with a name and calorie count via a form
- [ ] Entries appear in a daily log list immediately after adding
- [ ] A running calorie total for the day is displayed and updates when entries change
- [ ] Users can delete individual entries
- [ ] Users can reset/clear all entries for the day
- [ ] Data persists across page reloads (stored in `data.json`)
- [ ] Input validation prevents empty names and non-positive calorie counts
- [ ] UI is clean, responsive, and works on mobile viewports
- [ ] No external dependencies — pure Node.js backend, vanilla HTML/CSS/JS frontend
- [ ] All integration tests pass

## Validation Commands
Execute these commands to validate the task is complete:

- `node -c server.js` — Verify server.js has valid syntax
- `node -c public/app.js` — Verify app.js has valid syntax
- `node server.js &` then `curl http://localhost:3000/` — Verify server starts and serves HTML
- `curl -X POST http://localhost:3000/api/entries -H "Content-Type: application/json" -d '{"name":"Apple","calories":95}'` — Verify adding an entry works
- `curl http://localhost:3000/api/entries` — Verify listing entries works
- `curl http://localhost:3000/api/total` — Verify total endpoint works
- `kill %1` — Stop the test server

## Notes
- No `package.json` or `node_modules` needed — the entire app runs with just `node server.js`
- The JSON data file will be created automatically if it doesn't exist when the server starts
- UUIDs are generated using Node.js built-in `crypto.randomUUID()` (requires Node 19+, or use a simple counter-based ID if running older Node)
- The server should handle concurrent requests safely by reading the full JSON file, modifying in memory, and writing back (acceptable for a single-user local app)
- Date handling uses the local system date for "today" scoping
