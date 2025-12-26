# 🚀 Quick Start Guide

## Installation (2 minutes)

### Step 1: Install Dependencies
Open terminal in the `secure_chat` directory and run:
```bash
npm install
```

### Step 2: Start the Server
```bash
npm start
```

You should see:
```
🔒 Secure Chat Server running on port 3000
📱 Open http://localhost:3000 in your browser
```

### Step 3: Open in Browser
Navigate to: **http://localhost:3000**

## First Chat (1 minute)

### Create a Room
1. **Username**: Enter "Alice"
2. **Room Name**: Enter "test-room"
3. **Passphrase**: Enter "mysecretpass123"
4. Click **Join Room**

### Join from Another Device/Browser
Open another browser window or device:
1. **Username**: Enter "Bob"
2. **Room Name**: Enter "test-room" (SAME as Alice)
3. **Passphrase**: Enter "mysecretpass123" (SAME as Alice)
4. Click **Join Room**

### Start Chatting!
- Both users can now send encrypted messages
- Green lock icon shows messages are encrypted
- Server never sees the plaintext!

## Testing on Multiple Devices

### Same Computer
1. Open multiple browser windows
2. Use different usernames
3. Same room name + passphrase

### Phone + Computer
1. Find your local IP: 
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig`
2. On phone, navigate to: `http://YOUR_IP:3000`
3. Join same room with same passphrase

### Different Networks
Deploy to a cloud service or use ngrok:
```bash
# Using ngrok
ngrok http 3000
```

## Common Commands

```bash
# Start server
npm start

# Start with auto-reload (development)
npm run dev

# Custom port
PORT=8080 npm start
```

## Troubleshooting

**Can't connect?**
- Make sure server is running (`npm start`)
- Check if port 3000 is available
- Try a different port: `PORT=8080 npm start`

**Messages won't decrypt?**
- Both users MUST use exact same passphrase
- Check for typos in room name
- Passphrase is case-sensitive

**Browser issues?**
- Update to latest browser version
- Try Chrome, Firefox, or Edge
- Enable JavaScript

## Security Tips

✅ Use strong passphrases (16+ characters)
✅ Mix letters, numbers, symbols
✅ Don't share passphrase over insecure channels
✅ Use unique room names
✅ In production, always use HTTPS

## What's Next?

Read the full **README.md** for:
- Detailed security information
- Deployment instructions
- Configuration options
- Architecture explanation

---

**You're ready to chat securely!** 🔐
