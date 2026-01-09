# Poop Bot - Toilet Check-in System

A Node.js web application that tracks toilet occupancy with real-time status updates and automatic 45-minute session expiration.

## Features

- **Network accessible**: Accessible from any device on the local network via IP address at `http://192.xxx.xxx.xxx` (no port number needed)
- **Real-time updates**: All devices see status changes immediately via WebSocket
- **45-minute timeout**: Automatic expiration if user doesn't check out
- **Persistent storage**: Status survives server restarts
- **Simple UI**: Works on desktop and mobile browsers
- **No authentication**: Anyone on the network can check in/out

## Requirements

- Node.js (v14 or higher)
- npm
- Root/admin privileges (for port 80) or configure alternative port

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Server

### Default (Port 3000 - No Admin Required)

For testing, the server runs on port 3000 by default (no admin privileges needed):

```bash
node server.js
```

Or:

```bash
npm start
```

Access at: `http://localhost:3000` or `http://192.xxx.xxx.xxx:3000`

### Production (Port 80 - Requires Admin)

For production on Arch Linux, run with `sudo` to use port 80:

```bash
sudo PORT=80 node server.js
```

Or on Windows, run PowerShell/Command Prompt as Administrator and set the port:

```powershell
$env:PORT=80; node server.js
```

Or modify `server.js` to set `const PORT = 80;` and run as Administrator.

## Accessing the Application

Once the server is running:

- **Local access**: `http://localhost:3000` (or `http://localhost` if using port 80)
- **Network access**: `http://<your-ip-address>:3000` (or `http://<your-ip-address>` if using port 80)

To find your IP address on Arch Linux:
```bash
ip addr show
# or
hostname -I
```

## Usage

1. Open the web interface in any browser on any device on your network
2. When the toilet is free, click "Check In" (optionally enter your name)
3. The status will update in real-time on all connected devices
4. Click "Check Out" when you're done
5. If you forget to check out, the system will automatically free the toilet after 45 minutes

## API Endpoints

- `GET /api/status` - Get current toilet status
- `POST /api/checkin` - Check in to toilet (body: `{ "username": "optional name" }`)
- `POST /api/checkout` - Check out of toilet

## Socket.io Events

- `status` - Broadcasts current status to all clients
- `checkin` - Emitted when someone checks in
- `checkout` - Emitted when someone checks out

## Database

The application uses SQLite and automatically creates a `toilet.db` file in the project directory. The database stores session information including:
- Session ID
- Username (optional)
- Check-in time
- Expiration time
- Active status

## Technical Stack

- **Runtime**: Node.js
- **Server**: Express.js
- **Real-time**: Socket.io
- **Database**: better-sqlite3 (SQLite)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3

## Troubleshooting

- **Port 80 permission denied**: Run with `sudo` or change the port in `server.js`
- **Can't access from other devices**: Make sure the server is binding to `0.0.0.0` (not just `localhost`) and check your firewall settings
- **Database errors**: Make sure the application has write permissions in the project directory

## License

ISC
