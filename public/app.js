// Main application logic
class SecureChatApp {
    constructor() {
        this.ws = null;
        this.crypto = new CryptoManager();
        this.username = '';
        this.roomName = '';
        this.isConnected = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkCryptoSupport();
    }

    initializeElements() {
        // Screens
        this.loginScreen = document.getElementById('loginScreen');
        this.chatScreen = document.getElementById('chatScreen');
        
        // Login form elements
        this.loginForm = document.getElementById('loginForm');
        this.usernameInput = document.getElementById('username');
        this.roomNameInput = document.getElementById('roomName');
        this.passphraseInput = document.getElementById('passphrase');
        this.togglePassphraseBtn = document.getElementById('togglePassphrase');
        this.loginError = document.getElementById('loginError');
        
        // Chat elements
        this.messageContainer = document.getElementById('messageContainer');
        this.messageForm = document.getElementById('messageForm');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.leaveBtn = document.getElementById('leaveBtn');
        this.roomTitle = document.getElementById('roomTitle');
        this.encryptionStatus = document.getElementById('encryptionStatus');
    }

    attachEventListeners() {
        // Login form
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.togglePassphraseBtn.addEventListener('click', () => this.togglePassphraseVisibility());
        
        // Message form
        this.messageForm.addEventListener('submit', (e) => this.handleSendMessage(e));
        
        // Leave button
        this.leaveBtn.addEventListener('click', () => this.handleLeave());
        
        // Enter key in message input
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage(e);
            }
        });
    }

    checkCryptoSupport() {
        if (!CryptoManager.isSupported()) {
            this.showError('Your browser does not support Web Crypto API. Please use a modern browser.');
            this.loginForm.querySelector('button[type="submit"]').disabled = true;
        }
    }

    togglePassphraseVisibility() {
        const type = this.passphraseInput.type === 'password' ? 'text' : 'password';
        this.passphraseInput.type = type;
        
        const eyeOpen = this.togglePassphraseBtn.querySelector('.eye-open');
        const eyeClosed = this.togglePassphraseBtn.querySelector('.eye-closed');
        
        if (type === 'text') {
            eyeOpen.style.display = 'none';
            eyeClosed.style.display = 'block';
        } else {
            eyeOpen.style.display = 'block';
            eyeClosed.style.display = 'none';
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        this.hideError();
        
        const username = this.usernameInput.value.trim();
        const roomName = this.roomNameInput.value.trim();
        const passphrase = this.passphraseInput.value;
        
        // Validation
        if (!username || !roomName || !passphrase) {
            this.showError('All fields are required');
            return;
        }
        
        if (passphrase.length < 8) {
            this.showError('Passphrase must be at least 8 characters');
            return;
        }
        
        // Derive encryption key from passphrase
        const keyDerived = await this.crypto.deriveKey(passphrase, roomName);
        
        if (!keyDerived) {
            this.showError('Failed to initialize encryption');
            return;
        }
        
        // Connect to WebSocket server
        this.username = username;
        this.roomName = roomName;
        this.connectToServer();
    }

    connectToServer() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => this.handleConnectionOpen();
            this.ws.onmessage = (event) => this.handleMessage(event);
            this.ws.onclose = () => this.handleConnectionClose();
            this.ws.onerror = (error) => this.handleConnectionError(error);
        } catch (error) {
            this.showError('Failed to connect to server');
        }
    }

    handleConnectionOpen() {
        this.isConnected = true;
        
        // Send join message
        this.ws.send(JSON.stringify({
            type: 'join',
            room: this.roomName,
            username: this.username
        }));
        
        // Switch to chat screen
        this.loginScreen.classList.remove('active');
        this.chatScreen.classList.add('active');
        
        // Update UI
        this.roomTitle.textContent = `Room: ${this.roomName}`;
        this.encryptionStatus.textContent = 'End-to-End Encrypted';
        
        // Add welcome message
        this.addSystemMessage('You joined the room. All messages are end-to-end encrypted.');
        
        // Focus on message input
        this.messageInput.focus();
    }

    async handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'message':
                    await this.displayMessage(data);
                    break;
                    
                case 'user_joined':
                    if (data.userId !== this.username) {
                        this.addSystemMessage(`${data.userId} joined the room`);
                    }
                    break;
                    
                case 'user_left':
                    this.addSystemMessage(`${data.userId} left the room`);
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    async displayMessage(data) {
        try {
            // Decrypt the message
            const plaintext = await this.crypto.decrypt(data.encryptedData);
            
            // Create message element
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${data.userId === this.username ? 'own' : 'other'}`;
            
            const timestamp = new Date(data.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            messageDiv.innerHTML = `
                <div class="message-header">
                    <strong>${data.userId}</strong>
                    <span>${timestamp}</span>
                    <div class="encryption-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        Encrypted
                    </div>
                </div>
                <div class="message-content">${this.escapeHtml(plaintext)}</div>
            `;
            
            this.messageContainer.appendChild(messageDiv);
            this.scrollToBottom();
        } catch (error) {
            console.error('Error displaying message:', error);
        }
    }

    async handleSendMessage(e) {
        e.preventDefault();
        
        const message = this.messageInput.value.trim();
        
        if (!message || !this.isConnected) {
            return;
        }
        
        try {
            // Encrypt the message
            const encryptedData = await this.crypto.encrypt(message);
            
            // Send encrypted message to server
            this.ws.send(JSON.stringify({
                type: 'message',
                username: this.username,
                encryptedData: encryptedData
            }));
            
            // Clear input
            this.messageInput.value = '';
            this.messageInput.focus();
        } catch (error) {
            console.error('Error sending message:', error);
            this.addSystemMessage('Failed to send message');
        }
    }

    handleLeave() {
        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify({
                type: 'leave',
                username: this.username
            }));
            this.ws.close();
        }
        
        this.cleanup();
    }

    handleConnectionClose() {
        this.isConnected = false;
        if (this.chatScreen.classList.contains('active')) {
            this.addSystemMessage('Connection closed. Please rejoin.');
        }
    }

    handleConnectionError(error) {
        console.error('WebSocket error:', error);
        this.showError('Connection error. Please try again.');
    }

    cleanup() {
        // Clear crypto keys
        this.crypto.clear();
        
        // Clear UI
        this.messageContainer.innerHTML = '';
        
        // Reset form
        this.loginForm.reset();
        
        // Switch back to login screen
        this.chatScreen.classList.remove('active');
        this.loginScreen.classList.add('active');
        
        // Reset state
        this.username = '';
        this.roomName = '';
        this.isConnected = false;
    }

    addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            ${this.escapeHtml(text)}
        `;
        this.messageContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
    }

    showError(message) {
        this.loginError.textContent = message;
        this.loginError.style.display = 'block';
    }

    hideError() {
        this.loginError.style.display = 'none';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SecureChatApp();
});
