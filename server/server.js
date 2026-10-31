/**
 * Field Reports Mock Backend Server
 * 
 * Features:
 * 1. Idempotent uploads (Reports with identical IDs are not duplicated).
 * 2. 5MB hard limit verification per image.
 * 3. On-demand failure simulation (Latency, HTTP 500, socket drops).
 * 4. In-memory / local storage for reports so Review screen can query server state.
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Setup multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Unique filename using timestamp and original name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// 5MB limit check via multer
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB in bytes
  },
});

app.use(cors());
app.use(express.json());
// Serve uploaded images statically so the app can display them
app.use('/uploads', express.static(UPLOAD_DIR));

// ----------------------------------------------------
// In-Memory Database for Reports
// ----------------------------------------------------
let reportsDatabase = [];

// ----------------------------------------------------
// Failure Simulation Knobs
// Evaluator or app can control these via /api/simulation
// ----------------------------------------------------
const simulationConfig = {
  // 'none' | 'slow_2g' | 'error_500' | 'drop_connection'
  mode: 'none',
  delayMs: 3500, // 3.5 seconds to simulate slow 2G
};

// Middleware: Applies on-demand failure simulation
app.use((req, res, next) => {
  // Don't simulate failure on the simulation control endpoint or GET health
  if (req.path.startsWith('/api/simulation') || req.path === '/health') {
    return next();
  }

  // Check if request header overrides mode
  const headerMode = req.headers['x-simulate-mode'] || simulationConfig.mode;

  if (headerMode === 'drop_connection') {
    console.log(`[SIMULATION] Dropping connection mid-request for ${req.method} ${req.path}`);
    return req.socket.destroy(); // Instantly terminates socket
  }

  if (headerMode === 'error_500') {
    console.log(`[SIMULATION] Returning HTTP 500 for ${req.method} ${req.path}`);
    return res.status(500).json({ error: 'Simulated 500 Internal Server Error' });
  }

  if (headerMode === 'slow_2g') {
    console.log(`[SIMULATION] Simulating 2G latency (${simulationConfig.delayMs}ms) for ${req.method} ${req.path}`);
    return setTimeout(() => next(), simulationConfig.delayMs);
  }

  next();
});

// ----------------------------------------------------
// API Routes
// ----------------------------------------------------

// 1. Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    simulation: simulationConfig,
    totalReports: reportsDatabase.length,
  });
});

// 2. Control simulation settings (to test failures on demand)
app.get('/api/simulation', (req, res) => {
  res.json(simulationConfig);
});

app.post('/api/simulation', (req, res) => {
  const { mode, delayMs } = req.body;
  if (mode !== undefined) simulationConfig.mode = mode;
  if (delayMs !== undefined) simulationConfig.delayMs = delayMs;

  console.log('[SIMULATION] Updated config:', simulationConfig);
  res.json({ success: true, currentConfig: simulationConfig });
});

// 3. Review: Fetch reports directly from server
app.get('/api/reports', (req, res) => {
  res.json({
    success: true,
    count: reportsDatabase.length,
    reports: reportsDatabase,
  });
});

// 4. Deliver: Upload a report (with 1-5 images)
app.post('/api/reports', (req, res) => {
  // Use multer to handle up to 5 images
  upload.array('images', 5)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'File size exceeds 5MB ceiling. App must compress before sending.',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          error: 'Maximum 5 images allowed per report.',
        });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(500).json({ error: 'Server file upload error: ' + err.message });
    }

    const { id, description, createdAt } = req.body;

    // Validate required fields
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Report id is required (for idempotency).' });
    }

    if (!description || description.trim() === '') {
      return res.status(400).json({ error: 'Description is required and cannot be blank.' });
    }

    const uploadedFiles = req.files || [];
    if (uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'At least 1 image is required.' });
    }

    // IDEMPOTENCY CHECK:
    // If report ID already exists, do NOT duplicate it. Return existing record.
    const existing = reportsDatabase.find((r) => r.id === id);
    if (existing) {
      console.log(`[IDEMPOTENT] Duplicate report received for ID: ${id}. Returning existing.`);
      return res.status(200).json({
        success: true,
        message: 'Report already processed (Idempotent replay)',
        report: existing,
      });
    }

    // Save report
    const newReport = {
      id,
      description: description.trim(),
      createdAt: createdAt || new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      images: uploadedFiles.map((file) => ({
        originalName: file.originalname,
        fileName: file.filename,
        sizeBytes: file.size,
        url: `/uploads/${file.filename}`,
      })),
    };

    reportsDatabase.unshift(newReport); // Newest first

    console.log(`[REPORT SAVED] ID: ${id} with ${newReport.images.length} images.`);
    res.status(201).json({
      success: true,
      message: 'Report delivered successfully',
      report: newReport,
    });
  });
});

// 5. Reset: Start Over
app.post('/api/reset', (req, res) => {
  reportsDatabase = [];
  console.log('[RESET] Server database cleared.');
  res.json({ success: true, message: 'Server reports cleared.' });
});

// Start listening
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(` Field Reports Mock Server is running!`);
  console.log(` Port: ${PORT}`);
  console.log(` Local:   http://localhost:${PORT}`);
  console.log(` Android: http://10.0.2.2:${PORT}`);
  console.log(`===============================================`);
});

