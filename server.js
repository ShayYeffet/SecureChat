const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static('public'));

// Store active rooms and connections (in-memory, no message persistence)
const rooms = new Map();

wss.on('connection', (ws) => {
  let currentRoom = null;
  let userId = uuidv4();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'join':
          currentRoom = data.room;
          
          if (!rooms.has(currentRoom)) {
            rooms.set(currentRoom, new Set());
          }
          
          rooms.get(currentRoom).add(ws);
          
          // Broadcast join notification
          broadcast(currentRoom, {
            type: 'user_joined',
            userId: data.username,
            timestamp: Date.now()
          }, ws);
          break;

        case 'message':
          // Relay encrypted message to all users in the room
          if (currentRoom && rooms.has(currentRoom)) {
            broadcast(currentRoom, {
              type: 'message',
              userId: data.username,
              encryptedData: data.encryptedData,
              timestamp: Date.now(),
              messageId: uuidv4()
            });
          }
          break;

        case 'leave':
          if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom).delete(ws);
            broadcast(currentRoom, {
              type: 'user_left',
              userId: data.username,
              timestamp: Date.now()
            });
          }
          break;
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(ws);
      
      // Clean up empty rooms
      if (rooms.get(currentRoom).size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function broadcast(room, message, excludeWs = null) {
  if (!rooms.has(room)) return;

  const messageStr = JSON.stringify(message);
  rooms.get(room).forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🔒 Secure Chat Server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} in your browser`);
});
