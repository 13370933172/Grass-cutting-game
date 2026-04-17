const http = require('http');
const WebSocket = require('ws');

const PORT = 3001;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Grass-cutting Signaling Server');
});

const wss = new WebSocket.Server({ server });

const rooms = new Map();

wss.on('connection', (ws) => {
    console.log('New connection');
    
    ws.isAlive = true;
    ws.roomId = null;
    ws.playerId = null;
    ws.playerName = null;
    ws.isHost = false;

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleMessage(ws, message);
        } catch (e) {
            console.error('Failed to parse message:', e);
        }
    });

    ws.on('close', () => {
        console.log('Connection closed');
        handleDisconnect(ws);
    });

    ws.on('pong', () => {
        ws.isAlive = true;
    });
});

function handleMessage(ws, message) {
    switch (message.type) {
        case 'create_room':
            handleCreateRoom(ws, message);
            break;
        case 'join_room':
            handleJoinRoom(ws, message);
            break;
        case 'leave_room':
            handleLeaveRoom(ws);
            break;
        case 'webrtc_offer':
        case 'webrtc_answer':
        case 'webrtc_ice_candidate':
            handleWebRTCMessage(ws, message);
            break;
        case 'game_state':
            handleGameState(ws, message);
            break;
        case 'chat':
            handleChat(ws, message);
            break;
    }
}

function handleCreateRoom(ws, message) {
    const roomId = generateRoomId();
    const hostName = message.playerName || '房主';
    
    const room = {
        id: roomId,
        host: ws,
        hostId: message.playerId,
        hostName: hostName,
        players: new Map(),
        createdAt: Date.now()
    };
    
    rooms.set(roomId, room);
    ws.roomId = roomId;
    ws.playerId = message.playerId;
    ws.playerName = hostName;
    ws.isHost = true;
    
    ws.send(JSON.stringify({
        type: 'room_created',
        roomId: roomId,
        playerId: message.playerId
    }));
    
    console.log(`Room created: ${roomId} by ${hostName}`);
}

function handleJoinRoom(ws, message) {
    const room = rooms.get(message.roomId);
    
    if (!room) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Room not found'
        }));
        return;
    }

    if (room.players.size >= 3) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Room is full'
        }));
        return;
    }
    
    const playerName = message.playerName || '玩家';
    
    ws.roomId = message.roomId;
    ws.playerId = message.playerId;
    ws.playerName = playerName;
    ws.isHost = false;
    
    room.players.set(message.playerId, {
        ws: ws,
        name: playerName
    });
    
    const playersInfo = {};
    room.players.forEach((data, playerId) => {
        playersInfo[playerId] = { name: data.name };
    });
    
    ws.send(JSON.stringify({
        type: 'room_joined',
        roomId: message.roomId,
        playerId: message.playerId,
        hostId: room.hostId,
        hostName: room.hostName,
        players: playersInfo
    }));
    
    const playerJoinedMsg = JSON.stringify({
        type: 'player_joined',
        playerId: message.playerId,
        playerName: playerName
    });
    
    room.host.send(playerJoinedMsg);
    
    room.players.forEach((data, playerId) => {
        if (playerId !== message.playerId) {
            data.ws.send(playerJoinedMsg);
        }
    });
    
    console.log(`Player ${playerName} joined room ${message.roomId}`);
}

function handleLeaveRoom(ws) {
    if (!ws.roomId) return;
    
    const room = rooms.get(ws.roomId);
    if (!room) return;
    
    if (ws.isHost) {
        room.players.forEach((data) => {
            data.ws.send(JSON.stringify({
                type: 'room_closed'
            }));
        });
        rooms.delete(ws.roomId);
        console.log(`Room ${ws.roomId} closed`);
    } else {
        room.players.delete(ws.playerId);
        room.host.send(JSON.stringify({
            type: 'player_left',
            playerId: ws.playerId
        }));
        
        room.players.forEach((data) => {
            data.ws.send(JSON.stringify({
                type: 'player_left',
                playerId: ws.playerId
            }));
        });
        
        console.log(`Player ${ws.playerName} left room ${ws.roomId}`);
    }
    
    ws.roomId = null;
    ws.playerId = null;
    ws.playerName = null;
}

function handleWebRTCMessage(ws, message) {
    const room = rooms.get(ws.roomId);
    if (!room) return;
    
    let targetWs = null;
    
    if (message.targetId === room.hostId) {
        targetWs = room.host;
    } else {
        const playerData = room.players.get(message.targetId);
        if (playerData) {
            targetWs = playerData.ws;
        }
    }
    
    if (targetWs) {
        targetWs.send(JSON.stringify({
            type: message.type,
            fromId: ws.playerId,
            data: message.data
        }));
    }
}

function handleGameState(ws, message) {
    const room = rooms.get(ws.roomId);
    if (!room) return;
    
    if (ws.isHost) {
        room.players.forEach((data) => {
            data.ws.send(JSON.stringify({
                type: 'game_state',
                state: message.state
            }));
        });
    } else {
        room.host.send(JSON.stringify({
            type: 'player_input',
            playerId: ws.playerId,
            input: message.input
        }));
    }
}

function handleChat(ws, message) {
    const room = rooms.get(ws.roomId);
    if (!room) return;
    
    const chatMessage = JSON.stringify({
        type: 'chat',
        playerId: ws.playerId,
        playerName: ws.playerName,
        message: message.message
    });
    
    room.host.send(chatMessage);
    room.players.forEach((data) => {
        data.ws.send(chatMessage);
    });
}

function handleDisconnect(ws) {
    handleLeaveRoom(ws);
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
            return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
    console.log(`WebSocket URL: ws://localhost:${PORT}`);
});
