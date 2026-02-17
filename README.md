# Car LogBook

Offline-first PWA for recording mileage and driver logs for shared company cars. Works without internet (e.g., in a garage) and syncs when online.

## Features

- **Offline-first**: Works fully without network. Installable as a PWA.
- **Handover & Trip tracking**: Record car key exchanges and trips with odometer readings.
- **Tamper-evident**: Append-only events with SHA-256 hash-chain integrity.
- **Photo proof**: Capture odometer photos stored in IndexedDB.
- **Sync**: Automatic/manual sync to server when online.
- **Export**: Monthly CSV and PDF reports for accounting.
- **QR-friendly**: Open with `?v=CAR-01` to preselect a vehicle.

## Tech Stack

- **Client**: Vite + React + TypeScript, Dexie.js (IndexedDB), Workbox (PWA), Zod, pdf-lib
- **Server**: Node.js + Express + SQLite (better-sqlite3)

## Setup

```bash
# Install all dependencies (root + workspaces)
npm install

# Start development (client on :5173, server on :3001)
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## How to Install as PWA

1. Open `http://localhost:5173` in Chrome/Edge/Safari.
2. Click the "Install" prompt in the browser address bar (or go to browser menu > "Install app").
3. The app will work offline after installation.

## How to Test Offline

1. Install the PWA (see above).
2. Enable airplane mode or disconnect from network.
3. Create handover/trip events — they persist locally in IndexedDB.
4. The header shows an **Offline** badge and **Unsynced: N** counter.
5. Reconnect and press **Sync** — events upload to the server.

## How to Export

1. Go to **Admin** tab (bottom nav).
2. Enter PIN: `1234` (default).
3. Select vehicle and month.
4. Click **Export CSV** or **Export PDF**.
5. Click **Verify Hash Chain** to check data integrity.

## Data Model

### Event Types

| Type | Description |
|------|-------------|
| `HANDOVER` | Car key exchange at the garage |
| `TRIP_START` | Beginning of a trip |
| `TRIP_END` | End of a trip |
| `CORRECTION` | Corrective event (never mutates originals) |

### Hash Chain

Each event contains:
- `prevHash`: hash of the immediately previous event for the same vehicle
- `hash`: SHA-256 of `canonicalJSON(type, createdAt, driverId, vehicleId, payload, prevHash) + "|" + prevHash`

The `canonicalize()` function sorts all object keys recursively to ensure deterministic serialization. The chain is verified by recomputing each hash and checking `prevHash` continuity.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/events` | Sync events from client (validates hash chain) |
| `GET` | `/api/events?vehicleId=CAR-01` | Get all events for a vehicle |
| `POST` | `/api/photos` | Upload odometer photo (multipart) |

## Project Structure

```
/
├── client/                 # Vite + React PWA
│   ├── src/
│   │   ├── app/            # App component, context, styles
│   │   ├── components/     # Reusable UI components
│   │   ├── crypto/         # Canonicalize, hash, verify
│   │   ├── db/             # Dexie database, schemas, event ops
│   │   ├── routes/         # Page components
│   │   └── utils/          # Trip pairing, sync, CSV/PDF export
│   └── public/             # PWA icons
├── server/                 # Express + SQLite backend
│   └── src/
│       ├── index.ts        # API routes
│       ├── db.ts           # SQLite setup + queries
│       └── crypto.ts       # Server-side hash verification
├── package.json            # Workspace root
└── README.md
```

## Manual Test Checklist

- [ ] Open app, select CAR-01 and add a driver
- [ ] Create a HANDOVER event with odometer reading
- [ ] Create a TRIP_START with from-location and purpose
- [ ] Create a TRIP_END with to-location
- [ ] View Log tab — trip appears with computed KM
- [ ] Enable airplane mode — "Offline" badge appears
- [ ] Create events offline — "Unsynced" counter increments
- [ ] Disable airplane mode — press Sync — events sync to server
- [ ] Go to Admin, enter PIN 1234, export CSV and PDF
- [ ] Click "Verify Hash Chain" — should show green "verified"
- [ ] Open `/handover?v=CAR-01` — vehicle is preselected
- [ ] Install as PWA and verify offline navigation works
