// Main application logic
class SecureChatApp {
    constructor() {
        this.ws = null;
        this.crypto = new CryptoManager();
        this.username = '';
        this.roomName = '';
        this.isConnected = false;
        this.isMobile = this.detectMobile();
        this.keyboardHeight = 0;
        this.originalViewportHeight = window.innerHeight;
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkCryptoSupport();
        
        if (this.isMobile) {
            this.setupMobileKeyboardHandling();
        }
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
        
        // Textarea auto-resize and enter handling
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());
        this.messageInput.addEventListener('keydown', (e) => this.handleTextareaKeydown(e));

        // Mobile keyboard handling
        if (this.isMobile) {
            this.messageInput.addEventListener('focus', () => this.handleInputFocus());
            this.messageInput.addEventListener('blur', () => this.handleInputBlur());
        }
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
        
        // Basic validation
        if (!username || !roomName || !passphrase) {
            this.showError('All fields are required');
            return;
        }
        
        // Show loading state during key derivation (don't change button text)
        const submitBtn = this.loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        
        try {
            // Derive encryption key from passphrase
            console.log('🔐 Starting key derivation...');
            const keyDerived = await this.crypto.deriveKey(passphrase, roomName);
            
            if (!keyDerived) {
                this.showError('Failed to initialize encryption. Please try again.');
                return;
            }
            
            console.log('✅ Key derivation successful');
            
            // Connect to WebSocket server
            this.username = username;
            this.roomName = roomName;
            this.connectToServer();
        } catch (error) {
            console.error('Encryption initialization error:', error);
            this.showError(`Connection failed: ${error.message}`);
        } finally {
            // Don't change button text - keep it as "Join Room"
            submitBtn.disabled = false;
        }
    }

    checkPassphraseStrength(passphrase) {
        let score = 0;
        const feedback = [];
        
        // Length check
        if (passphrase.length >= 12) score++;
        else if (passphrase.length >= 8) {
            score += 0.5;
            feedback.push('consider 12+ characters');
        } else {
            feedback.push('use 8+ characters');
        }
        
        // Character variety
        if (/[a-z]/.test(passphrase)) score++;
        else feedback.push('add lowercase letters');
        
        if (/[A-Z]/.test(passphrase)) score++;
        else feedback.push('add uppercase letters');
        
        if (/[0-9]/.test(passphrase)) score++;
        else feedback.push('add numbers');
        
        if (/[^a-zA-Z0-9]/.test(passphrase)) score++;
        else feedback.push('add symbols');
        
        // Common patterns check
        if (!/(.)\1{2,}/.test(passphrase)) score += 0.5;
        else feedback.push('avoid repeated characters');
        
        return {
            score,
            feedback: feedback.join(', ')
        };
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
        
        // Update UI with simple status
        this.roomTitle.textContent = `Room: ${this.roomName}`;
        this.encryptionStatus.textContent = 'End-to-End Encrypted';
        
        // ABSOLUTELY FORCE TO TOP - NO SCROLLING AT ALL
        this.messageContainer.scrollTop = 0;
        this.messageContainer.scrollLeft = 0;
        
        // DON'T FOCUS INPUT ON STARTUP - this causes auto-scroll!
        // User can tap input when they want to type
        
        // Add welcome message AFTER everything is positioned
        setTimeout(() => {
            this.addSystemMessage('You joined the room. Messages are encrypted.', false);
            // FORCE BACK TO TOP after adding message
            this.messageContainer.scrollTop = 0;
            this.messageContainer.scrollLeft = 0;
        }, 10);
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
            
            // Force immediate scroll to show new message
            this.scrollToBottom();
            
            // Additional scrolls to ensure it works on all devices
            setTimeout(() => {
                this.scrollToBottom();
            }, 50);
            
            setTimeout(() => {
                this.scrollToBottom();
            }, 200);
            
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
            
            // Clear input and reset height
            this.messageInput.value = '';
            this.messageInput.style.height = 'auto';
            
            // Keep focus on mobile to maintain keyboard
            if (this.isMobile) {
                // Keep keyboard open by maintaining focus
                this.messageInput.focus();
                // Immediate scroll after sending
                this.scrollToBottom();
                // Additional scroll after potential layout changes
                setTimeout(() => {
                    this.scrollToBottom();
                }, 100);
                setTimeout(() => {
                    this.scrollToBottom();
                }, 300);
            } else {
                this.messageInput.focus();
                this.scrollToBottom();
            }
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

    addSystemMessage(text, autoScroll = true) {
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
        
        // NEVER auto-scroll for system messages - only for regular messages
        if (autoScroll && this.messageContainer.children.length > 2) {
            this.scrollToBottom();
        }
    }

    scrollToBottom() {
        // Only scroll if there are messages and container has content
        if (this.messageContainer.children.length === 0) {
            return;
        }
        
        // Check if we need to scroll (content overflows)
        const needsScroll = this.messageContainer.scrollHeight > this.messageContainer.clientHeight;
        
        if (needsScroll) {
            // Temporarily disable smooth scrolling for immediate effect
            const originalBehavior = this.messageContainer.style.scrollBehavior;
            this.messageContainer.style.scrollBehavior = 'auto';
            
            // Method 1: Direct scroll
            this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
            
            // Method 2: Using scrollTo
            this.messageContainer.scrollTo(0, this.messageContainer.scrollHeight);
            
            // Re-enable smooth scrolling
            setTimeout(() => {
                this.messageContainer.style.scrollBehavior = originalBehavior || 'smooth';
            }, 50);
            
            // Method 3: RequestAnimationFrame for timing
            requestAnimationFrame(() => {
                this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
                
                // Additional scroll for mobile after layout changes
                if (this.isMobile) {
                    setTimeout(() => {
                        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
                    }, 50);
                }
            });
        }
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768 && 'ontouchstart' in window);
    }

    setupMobileKeyboardHandling() {
        // Handle viewport changes (keyboard open/close)
        const handleViewportChange = () => {
            const currentHeight = window.innerHeight;
            const heightDifference = this.originalViewportHeight - currentHeight;
            
            // If height decreased significantly, keyboard is likely open
            if (heightDifference > 150) {
                this.keyboardHeight = heightDifference;
                this.handleKeyboardOpen();
            } else {
                this.keyboardHeight = 0;
                this.handleKeyboardClose();
            }
        };

        // Listen for viewport changes
        window.addEventListener('resize', handleViewportChange);
        
        // Visual viewport API support (better for mobile)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                const keyboardHeight = window.innerHeight - window.visualViewport.height;
                if (keyboardHeight > 50) {
                    this.keyboardHeight = keyboardHeight;
                    this.handleKeyboardOpen();
                } else {
                    this.keyboardHeight = 0;
                    this.handleKeyboardClose();
                }
            });
        }

        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.originalViewportHeight = window.innerHeight;
                this.scrollToBottom();
            }, 500);
        });
    }

    handleKeyboardOpen() {
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.classList.add('keyboard-open');
        }
        
        // Scroll to bottom when keyboard opens
        setTimeout(() => {
            this.scrollToBottom();
        }, 300);
    }

    handleKeyboardClose() {
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.classList.remove('keyboard-open');
        }
    }

    handleInputFocus() {
        // Mark that keyboard is open
        if (this.isMobile) {
            document.body.classList.add('keyboard-open');
            
            // Only scroll if there are enough messages AND we're already near the bottom
            const hasMessages = this.messageContainer.children.length > 1;
            const isNearBottom = this.messageContainer.scrollTop >= 
                (this.messageContainer.scrollHeight - this.messageContainer.clientHeight - 100);
            
            if (hasMessages && isNearBottom) {
                // Only scroll if we were already at the bottom and have messages
                setTimeout(() => {
                    this.scrollToBottom();
                }, 300);
            }
        }
    }

    handleInputBlur() {
        // Only remove keyboard class if not refocusing immediately
        if (this.isMobile) {
            setTimeout(() => {
                if (document.activeElement !== this.messageInput) {
                    document.body.classList.remove('keyboard-open');
                }
            }, 100);
        }
    }

    autoResizeTextarea() {
        const textarea = this.messageInput;
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 100); // Max 100px height
        textarea.style.height = newHeight + 'px';
        
        // Only scroll if not on mobile to prevent keyboard issues
        if (!this.isMobile) {
            setTimeout(() => this.scrollToBottom(), 50);
        }
    }

    handleTextareaKeydown(e) {
        if (e.key === 'Enter') {
            if (this.isMobile) {
                // On mobile, Enter always creates new line
                // Only send with the send button
                return; // Allow default behavior (new line)
            } else {
                // On desktop, Shift+Enter = new line, Enter = send
                if (e.shiftKey) {
                    return; // Allow new line with Shift+Enter
                } else {
                    e.preventDefault();
                    this.handleSendMessage(e);
                }
            }
        }
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
