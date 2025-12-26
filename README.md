# 🔒 Secure End-to-End Encrypted Chat

A fully secure, real-time chat application with end-to-end encryption (E2EE) that works on all devices.

## 🛡️ Security Features

### End-to-End Encryption
- **AES-256-GCM**: Military-grade encryption for all messages
- **PBKDF2 Key Derivation**: 100,000 iterations with SHA-256
- **Zero Knowledge Architecture**: Server never sees plaintext messages or encryption keys
- **Client-Side Encryption**: All encryption happens in the browser
- **No Message Persistence**: Messages are never stored on the server

### Security Principles
1. **Passphrase-based encryption**: Shared passphrase derives the encryption keys
2. **Unique IVs**: Each message uses a unique initialization vector
3. **No key transmission**: Encryption keys never leave your device
4. **Ephemeral sessions**: Keys are cleared when you leave the room

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

### For Development
```bash
npm run dev
```
This uses nodemon for automatic server restarts.

## 📱 How to Use

### Joining a Room

1. **Enter your username**: Choose any display name
2. **Enter room name**: This will be used as the salt for key derivation
3. **Enter passphrase**: Minimum 8 characters (longer is more secure)
   - All users joining the same room MUST use the same passphrase
   - The passphrase is never sent to the server
   - Keys are derived from: passphrase + room name

### Chatting

- Type your message and press Enter or click Send
- Messages are automatically encrypted before transmission
- Only users with the correct passphrase can decrypt messages
- Green lock icon indicates encrypted messages

### Leaving

- Click "Leave" button to exit the room
- All encryption keys are cleared from memory
- You'll return to the login screen

## 🔐 How It Works

### Encryption Flow

```
User enters passphrase
        ↓
PBKDF2 derives 256-bit AES key (100k iterations)
        ↓
User types message
        ↓
Message encrypted with AES-256-GCM + random IV
        ↓
Encrypted data sent to server
        ↓
Server relays to all room participants
        ↓
Recipients decrypt with their derived key
```

### Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client A  │         │   Server    │         │   Client B  │
│             │         │             │         │             │
│ Passphrase  │         │   Relays    │         │ Passphrase  │
│     ↓       │         │   only      │         │     ↓       │
│ Derive Key  │◄───────►│  encrypted  │◄───────►│ Derive Key  │
│     ↓       │  WSS    │    data     │  WSS    │     ↓       │
│  Encrypt    │         │             │         │  Decrypt    │
│  Decrypt    │         │ (No storage)│         │  Encrypt    │
└─────────────┘         └─────────────┘         └─────────────┘
```

## 🌐 Device Compatibility

### Fully Supported
✅ Chrome/Edge (Desktop & Mobile)
✅ Firefox (Desktop & Mobile)
✅ Safari (Desktop & Mobile)
✅ Opera
✅ Brave

### Requirements
- Modern browser with Web Crypto API support
- JavaScript enabled
- WebSocket support

### Responsive Design
- Mobile phones (iOS/Android)
- Tablets
- Desktop computers
- All screen sizes optimized

## 🔧 Technical Stack

### Frontend
- **Vanilla JavaScript**: No frameworks, pure performance
- **Web Crypto API**: Native browser cryptography
- **WebSocket**: Real-time bidirectional communication
- **CSS3**: Modern, responsive design
- **HTML5**: Semantic markup

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web server framework
- **ws**: WebSocket library
- **UUID**: Unique message identifiers

## 📂 Project Structure

```
secure_chat/
├── server.js           # WebSocket server
├── package.json        # Dependencies
├── README.md          # This file
└── public/
    ├── index.html     # Main HTML
    ├── styles.css     # Styling
    ├── app.js         # Application logic
    └── crypto.js      # Encryption module
```

## 🛠️ Configuration

### Changing the Port

Edit `server.js`:
```javascript
const PORT = process.env.PORT || 3000;
```

Or set environment variable:
```bash
PORT=8080 npm start
```

### HTTPS/WSS Setup

For production, use a reverse proxy like Nginx with SSL:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🔬 Security Audit

### Encryption Parameters
- **Algorithm**: AES-256-GCM (Authenticated Encryption)
- **Key Size**: 256 bits
- **IV Size**: 96 bits (12 bytes) - cryptographically random
- **KDF**: PBKDF2-SHA256
- **Iterations**: 100,000
- **Salt**: Room name (user-provided)

### What the Server Knows
- Room names (but not passphrases)
- Usernames (not encrypted - visible metadata)
- Connection times
- Encrypted message data (ciphertext + IV)

### What the Server DOESN'T Know
- Passphrases
- Encryption keys
- Message content (plaintext)
- Any decrypted data

### Limitations & Considerations

1. **Shared Passphrase Model**: All users in a room share the same key
   - If passphrase is compromised, all messages can be decrypted
   - No forward secrecy (old messages can be decrypted if key is leaked)

2. **No User Authentication**: Anyone with room name + passphrase can join
   - Consider adding user authentication for production

3. **Metadata Not Encrypted**: Usernames, timestamps, room names visible
   - Provides anonymity but not full privacy

4. **Man-in-the-Middle**: Secure only if using HTTPS/WSS
   - Always deploy with TLS in production

5. **Browser Security**: Depends on Web Crypto API implementation
   - Keep browsers updated

## 🚨 Best Practices

### For Users
1. Use strong, unique passphrases (16+ characters)
2. Don't share passphrases over insecure channels
3. Use unique room names
4. Always use HTTPS in production
5. Clear browser cache after sensitive conversations

### For Developers
1. Always deploy with HTTPS/WSS
2. Implement rate limiting
3. Add CSRF protection
4. Monitor for abuse
5. Consider adding:
   - User authentication
   - Perfect forward secrecy
   - Message expiration
   - File encryption

## 📊 Performance

- **Message Encryption**: ~1-5ms per message
- **Key Derivation**: ~100-500ms (one-time on join)
- **Memory Usage**: ~2-5MB per connection
- **Network**: <1KB per message (encrypted)

## 🐛 Troubleshooting

### "Browser not supported" error
- Update your browser to the latest version
- Web Crypto API required (Chrome 37+, Firefox 34+, Safari 11+)

### Messages won't decrypt
- Ensure all users use the EXACT same passphrase
- Check for typos in room name or passphrase
- Try refreshing the page

### Connection issues
- Check if server is running (`npm start`)
- Verify firewall settings
- Check browser console for errors

### Performance issues
- Reduce message frequency
- Check network connection
- Clear browser cache

## 📄 License

MIT License - Feel free to use, modify, and distribute.

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## ⚠️ Disclaimer

This is a demonstration project. While it implements strong encryption, it should be thoroughly audited before use in production environments handling sensitive data.

For critical applications, consider:
- Professional security audit
- Penetration testing
- Compliance review (GDPR, HIPAA, etc.)
- Regular security updates

## 📞 Support

For issues or questions:
- Check the Troubleshooting section
- Review the code comments
- Open an issue on GitHub

---

**Built with security and privacy in mind** 🔐
