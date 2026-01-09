const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const os = require('os');

// Detect OS and set port accordingly
// Arch Linux (or any Linux): port 80 (requires sudo)
// Windows: port 3000 (for testing, no admin needed)
function getDefaultPort() {
    const platform = os.platform();
    if (platform === 'linux') {
        return 80; // Arch Linux - production port
    } else {
        return 3000; // Windows/Mac - testing port
    }
}

const PORT = process.env.PORT || getDefaultPort();
const HOST = '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Broadcast status to all connected clients
function broadcastStatus() {
  const status = db.getStatus();
  io.emit('status', status);
}

// REST API endpoints

// Get current status
app.get('/api/status', (req, res) => {
  const status = db.getStatus();
  res.json(status);
});

// Generate a unique device token
function generateDeviceToken() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) + 
         Date.now().toString(36);
}

// Check in to toilet
app.post('/api/checkin', (req, res) => {
  const currentSession = db.getCurrentSession();
  
  if (currentSession) {
    return res.status(409).json({ 
      error: 'Toilet is already occupied',
      status: db.getStatus()
    });
  }
  
  const username = req.body.username || null;
  const deviceToken = generateDeviceToken();
  const session = db.createSession(username, deviceToken);
  
  // Broadcast to all clients
  io.emit('checkin', db.getStatus());
  broadcastStatus();
  
  res.json({
    success: true,
    session: session,
    device_token: deviceToken, // Return token to client
    status: db.getStatus()
  });
});

// Check out of toilet
app.post('/api/checkout', (req, res) => {
  const currentSession = db.getCurrentSession();
  
  if (!currentSession) {
    return res.status(404).json({ 
      error: 'No active session found',
      status: db.getStatus()
    });
  }
  
  const deviceToken = req.body.device_token;
  
  if (!deviceToken) {
    return res.status(400).json({ 
      error: 'Device token required',
      status: db.getStatus()
    });
  }
  
  // Only allow checkout if device token matches
  const success = db.endSession(currentSession.id, deviceToken);
  
  if (success) {
    // Broadcast to all clients
    io.emit('checkout', db.getStatus());
    broadcastStatus();
    
    res.json({
      success: true,
      message: 'Checked out successfully',
      status: db.getStatus()
    });
  } else {
    res.status(403).json({ 
      error: 'You can only check out from the device you checked in with',
      status: db.getStatus()
    });
  }
});

// Admin force kick
app.post('/api/admin/kick', (req, res) => {
  const password = req.body.password;
  
  if (password !== 'poop-bot') {
    return res.status(401).json({ 
      error: 'Invalid password',
      status: db.getStatus()
    });
  }
  
  const currentSession = db.getCurrentSession();
  
  if (!currentSession) {
    return res.status(404).json({ 
      error: 'No active session found',
      status: db.getStatus()
    });
  }
  
  // Admin can kick without device token
  const success = db.endSession(currentSession.id);
  
  if (success) {
    // Broadcast to all clients
    io.emit('checkout', db.getStatus());
    broadcastStatus();
    
    res.json({
      success: true,
      message: 'User kicked successfully',
      status: db.getStatus()
    });
  } else {
    res.status(500).json({ 
      error: 'Failed to kick user',
      status: db.getStatus()
    });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current status to newly connected client
  socket.emit('status', db.getStatus());
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Background cleanup interval (runs every 60 seconds)
setInterval(() => {
  const expiredCount = db.cleanupExpiredSessions();
  if (expiredCount > 0) {
    console.log(`Cleaned up ${expiredCount} expired session(s)`);
    broadcastStatus();
  }
}, 60000); // 60 seconds

// Start server
server.listen(PORT, HOST, () => {
  const platform = os.platform();
  const platformName = platform === 'linux' ? 'Arch Linux' : platform === 'win32' ? 'Windows' : platform;
  
  console.log(`Poop Bot server running on ${platformName}`);
  console.log(`Server running on http://${HOST}:${PORT}`);
  
  if (platform === 'linux' && PORT === 80) {
    console.log(`Access from any device on your network at http://<your-ip-address>`);
    console.log(`Local access: http://localhost`);
    console.log(`Note: Port 80 requires root privileges. Run with: sudo node server.js`);
  } else {
    console.log(`Access from any device on your network at http://<your-ip-address>:${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
  }
});
