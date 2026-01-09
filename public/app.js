const socket = io();

let currentStatus = null;
let countdownInterval = null;
let myDeviceToken = null;

// Get device token from localStorage
function getDeviceToken() {
    return localStorage.getItem('device_token');
}

// Store device token in localStorage
function setDeviceToken(token) {
    localStorage.setItem('device_token', token);
    myDeviceToken = token;
}

// Clear device token
function clearDeviceToken() {
    localStorage.removeItem('device_token');
    myDeviceToken = null;
}

// Initialize device token from localStorage
myDeviceToken = getDeviceToken();

// DOM elements
const statusCard = document.getElementById('statusCard');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const statusDetails = document.getElementById('statusDetails');
const usernameValue = document.getElementById('usernameValue');
const timeRemaining = document.getElementById('timeRemaining');
const usernameGroup = document.getElementById('usernameGroup');
const usernameInput = document.getElementById('usernameInput');
const checkinBtn = document.getElementById('checkinBtn');
const checkoutBtn = document.getElementById('checkoutBtn');
const adminBtn = document.getElementById('adminBtn');
const message = document.getElementById('message');

// Update UI based on status
function updateUI(status) {
    currentStatus = status;
    
    if (status.occupied) {
        // Toilet is occupied
        statusDot.className = 'status-dot occupied';
        statusText.className = 'status-text occupied';
        statusText.textContent = 'Occupied';
        
        statusDetails.style.display = 'block';
        usernameValue.textContent = status.username || 'Anonymous';
        
        // Only show checkout button if this device checked in
        const canCheckout = myDeviceToken && status.device_token === myDeviceToken;
        
        checkinBtn.style.display = 'none';
        checkoutBtn.style.display = canCheckout ? 'block' : 'none';
        usernameGroup.style.display = 'none';
        
        // Start countdown timer
        startCountdown(status.time_remaining);
    } else {
        // Toilet is free
        statusDot.className = 'status-dot free';
        statusText.className = 'status-text free';
        statusText.textContent = 'Free';
        
        statusDetails.style.display = 'none';
        
        // Show checkin button, hide checkout
        checkinBtn.style.display = 'block';
        checkoutBtn.style.display = 'none';
        usernameGroup.style.display = 'block';
        
        // Clear device token when toilet becomes free
        clearDeviceToken();
        
        // Stop countdown
        stopCountdown();
    }
}

// Start countdown timer
function startCountdown(seconds) {
    stopCountdown(); // Clear any existing interval
    
    let remaining = seconds;
    
    function updateTimer() {
        if (remaining <= 0) {
            timeRemaining.textContent = 'Expired';
            stopCountdown();
            return;
        }
        
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        timeRemaining.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
        remaining--;
    }
    
    updateTimer(); // Initial update
    countdownInterval = setInterval(updateTimer, 1000);
}

// Stop countdown timer
function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

// Show message
function showMessage(text, type = 'info') {
    message.textContent = text;
    message.className = `message ${type}`;
    setTimeout(() => {
        message.className = 'message';
    }, 5000);
}

// Check in
checkinBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim() || null;
    
    try {
        const response = await fetch('/api/checkin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store device token
            if (data.device_token) {
                setDeviceToken(data.device_token);
            }
            showMessage('Checked in successfully!', 'success');
            usernameInput.value = '';
        } else {
            showMessage(data.error || 'Failed to check in', 'error');
        }
    } catch (error) {
        showMessage('Error connecting to server', 'error');
        console.error('Check-in error:', error);
    }
});

// Check out
checkoutBtn.addEventListener('click', async () => {
    if (!myDeviceToken) {
        showMessage('Device token not found', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ device_token: myDeviceToken })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            clearDeviceToken();
            showMessage('Checked out successfully!', 'success');
        } else {
            showMessage(data.error || 'Failed to check out', 'error');
        }
    } catch (error) {
        showMessage('Error connecting to server', 'error');
        console.error('Check-out error:', error);
    }
});

// Admin force kick
adminBtn.addEventListener('click', async () => {
    if (!currentStatus || !currentStatus.occupied) {
        showMessage('Toilet is already free', 'info');
        return;
    }
    
    const password = prompt('Enter admin password:');
    if (!password) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/kick', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('User kicked successfully!', 'success');
        } else {
            showMessage(data.error || 'Failed to kick user', 'error');
        }
    } catch (error) {
        showMessage('Error connecting to server', 'error');
        console.error('Admin kick error:', error);
    }
});

// Socket.io event listeners
socket.on('connect', () => {
    console.log('Connected to server');
    showMessage('Connected to server', 'success');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    showMessage('Disconnected from server', 'error');
});

socket.on('status', (status) => {
    console.log('Status update:', status);
    updateUI(status);
});

socket.on('checkin', (status) => {
    console.log('Someone checked in:', status);
    updateUI(status);
    if (!status.occupied) {
        showMessage('Someone just checked in!', 'info');
    }
});

socket.on('checkout', (status) => {
    console.log('Someone checked out:', status);
    updateUI(status);
    if (status.free) {
        showMessage('Toilet is now free!', 'info');
    }
});

// Initial status fetch
fetch('/api/status')
    .then(response => response.json())
    .then(status => {
        updateUI(status);
    })
    .catch(error => {
        console.error('Error fetching status:', error);
        showMessage('Error loading status', 'error');
    });
