import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { getVehicleEvents, getLastHash, insertEvent, insertPhoto } from './db.js';
import { computeHash } from './crypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Schemas ──
const EventSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  type: z.enum(['HANDOVER', 'TRIP_START', 'TRIP_END', 'CORRECTION']),
  createdAt: z.string(),
  driverId: z.string(),
  payload: z.record(z.unknown()),
  prevHash: z.string().nullable(),
  hash: z.string(),
  syncStatus: z.string().optional(),
  serverId: z.string().optional(),
});

const SyncRequestSchema = z.object({
  vehicleId: z.string(),
  events: z.array(EventSchema),
});

// ── POST /api/events ──
app.post('/api/events', (req, res) => {
  try {
    const parsed = SyncRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const { vehicleId, events } = parsed.data;
    if (events.length === 0) {
      res.json({ accepted: [], newLastHash: getLastHash(vehicleId) });
      return;
    }

    // Get server's current last hash for this vehicle
    let currentLastHash = getLastHash(vehicleId);
    const accepted: Array<{ localEventId: string; serverId: string; acceptedAt: string }> = [];

    for (const event of events) {
      // Validate that prevHash matches server's chain
      if (event.prevHash !== currentLastHash) {
        res.status(409).json({
          error: 'Hash chain discontinuity',
          reason: `Event ${event.id}: expected prevHash "${currentLastHash}", got "${event.prevHash}"`,
          accepted,
          newLastHash: currentLastHash,
        });
        return;
      }

      // Recompute hash to validate integrity
      const recomputed = computeHash(
        {
          type: event.type,
          createdAt: event.createdAt,
          driverId: event.driverId,
          vehicleId: event.vehicleId,
          payload: event.payload,
        },
        event.prevHash,
      );

      if (recomputed !== event.hash) {
        res.status(400).json({
          error: 'Hash validation failed',
          reason: `Event ${event.id}: computed "${recomputed}", received "${event.hash}"`,
          accepted,
          newLastHash: currentLastHash,
        });
        return;
      }

      // Insert into server DB
      const serverId = crypto.randomUUID();
      insertEvent({
        ...event,
        id: serverId,
      });

      accepted.push({
        localEventId: event.id,
        serverId,
        acceptedAt: new Date().toISOString(),
      });

      currentLastHash = event.hash;
    }

    res.json({ accepted, newLastHash: currentLastHash });
  } catch (err) {
    console.error('POST /api/events error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/events ──
app.get('/api/events', (req, res) => {
  const vehicleId = req.query.vehicleId as string;
  if (!vehicleId) {
    res.status(400).json({ error: 'vehicleId query parameter required' });
    return;
  }

  const events = getVehicleEvents(vehicleId);
  // Parse payload JSON strings back to objects
  const parsed = events.map((e) => ({
    ...e,
    payload: typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload,
  }));

  res.json({ events: parsed });
});

// ── Photo upload ──
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => {
      const id = crypto.randomUUID();
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `${id}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

app.post('/api/photos', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No photo uploaded' });
      return;
    }

    const vehicleId = req.body.vehicleId || 'unknown';
    const photoId = req.body.photoId || crypto.randomUUID();

    // Compute SHA-256 of the uploaded file
    const fileBuffer = fs.readFileSync(req.file.path);
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    insertPhoto({
      id: photoId,
      vehicleId,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      sha256,
    });

    res.json({
      photoId,
      url: `/uploads/${req.file.filename}`,
      sha256,
    });
  } catch (err) {
    console.error('POST /api/photos error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Start server ──
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
