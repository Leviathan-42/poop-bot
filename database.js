const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'toilet.db');
const db = new Database(dbPath);

// Create sessions table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    device_token TEXT,
    check_in_time INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  )
`);

// Add device_token column if it doesn't exist (migration for existing databases)
try {
  db.prepare('SELECT device_token FROM sessions LIMIT 1').get();
} catch (error) {
  // Column doesn't exist, add it
  db.exec('ALTER TABLE sessions ADD COLUMN device_token TEXT');
}

// Get current active session
function getCurrentSession() {
  const now = Math.floor(Date.now() / 1000);
  const session = db.prepare(`
    SELECT * FROM sessions 
    WHERE active = 1 AND expires_at > ?
    ORDER BY check_in_time DESC
    LIMIT 1
  `).get(now);
  
  return session || null;
}

// Create a new check-in session
function createSession(username = null, deviceToken = null) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (45 * 60); // 45 minutes from now
  
  const result = db.prepare(`
    INSERT INTO sessions (username, device_token, check_in_time, expires_at, active)
    VALUES (?, ?, ?, ?, 1)
  `).run(username || null, deviceToken || null, now, expiresAt);
  
  return {
    id: result.lastInsertRowid,
    username: username || null,
    device_token: deviceToken || null,
    check_in_time: now,
    expires_at: expiresAt,
    active: 1
  };
}

// End a session (check out)
function endSession(sessionId, deviceToken = null) {
  let result;
  if (deviceToken) {
    // Only allow checkout if device token matches
    result = db.prepare(`
      UPDATE sessions 
      SET active = 0 
      WHERE id = ? AND active = 1 AND device_token = ?
    `).run(sessionId, deviceToken);
  } else {
    // Admin force kick (no token required)
    result = db.prepare(`
      UPDATE sessions 
      SET active = 0 
      WHERE id = ? AND active = 1
    `).run(sessionId);
  }
  
  return result.changes > 0;
}

// Cleanup expired sessions
function cleanupExpiredSessions() {
  const now = Math.floor(Date.now() / 1000);
  const result = db.prepare(`
    UPDATE sessions 
    SET active = 0 
    WHERE active = 1 AND expires_at <= ?
  `).run(now);
  
  return result.changes;
}

// Get current status
function getStatus() {
  const session = getCurrentSession();
  
  if (!session) {
    return {
      occupied: false,
      free: true
    };
  }
  
  const now = Math.floor(Date.now() / 1000);
  const timeRemaining = Math.max(0, session.expires_at - now);
  const minutesRemaining = Math.floor(timeRemaining / 60);
  const secondsRemaining = timeRemaining % 60;
  
  return {
    occupied: true,
    free: false,
    username: session.username,
    check_in_time: session.check_in_time,
    expires_at: session.expires_at,
    time_remaining: timeRemaining,
    minutes_remaining: minutesRemaining,
    seconds_remaining: secondsRemaining,
    session_id: session.id,
    device_token: session.device_token
  };
}

module.exports = {
  getCurrentSession,
  createSession,
  endSession,
  cleanupExpiredSessions,
  getStatus
};
