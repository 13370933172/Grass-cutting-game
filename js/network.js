class NetworkManager {
    constructor() {
        this.ws = null;
        this.roomId = null;
        this.playerId = null;
        this.isHost = false;
        this.isConnected = false;
        this.peers = new Map();
        this.peerConnections = new Map();
        this.dataChannels = new Map();
        
        this.onRoomCreated = null;
        this.onRoomJoined = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onGameState = null;
        this.onPlayerInput = null;
        this.onError = null;
        this.onConnectionChange = null;
        
        this.iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ];
        
        this.pendingCandidates = new Map();
    }

    connect(serverUrl) {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(serverUrl);
                
                this.ws.onopen = () => {
                    console.log('Connected to signaling server');
                    this.isConnected = true;
                    if (this.onConnectionChange) {
                        this.onConnectionChange(true);
                    }
                    resolve();
                };
                
                this.ws.onclose = () => {
                    console.log('Disconnected from signaling server');
                    this.isConnected = false;
                    if (this.onConnectionChange) {
                        this.onConnectionChange(false);
                    }
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };
                
                this.ws.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };
            } catch (e) {
                reject(e);
            }
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.peerConnections.forEach((pc) => pc.close());
        this.peerConnections.clear();
        this.dataChannels.clear();
        this.peers.clear();
        
        this.roomId = null;
        this.playerId = null;
        this.isHost = false;
        this.isConnected = false;
    }

    handleMessage(message) {
        switch (message.type) {
            case 'room_created':
                this.roomId = message.roomId;
                this.playerId = message.playerId;
                this.isHost = true;
                if (this.onRoomCreated) {
                    this.onRoomCreated(message.roomId);
                }
                break;
                
            case 'room_joined':
                this.roomId = message.roomId;
                this.playerId = message.playerId;
                this.isHost = false;
                this.peers.set('host', { id: 'host', isHost: true, name: message.hostName });
                if (message.players) {
                    for (const playerId in message.players) {
                        this.peers.set(playerId, { 
                            id: playerId, 
                            isHost: false, 
                            name: message.players[playerId].name 
                        });
                    }
                }
                if (this.onRoomJoined) {
                    this.onRoomJoined(message.roomId, message.hostId, message.players);
                }
                break;
                
            case 'player_joined':
                this.peers.set(message.playerId, { 
                    id: message.playerId, 
                    isHost: false, 
                    name: message.playerName 
                });
                if (this.isHost) {
                    this.createPeerConnection(message.playerId, true);
                }
                if (this.onPlayerJoined) {
                    this.onPlayerJoined(message.playerId, message.playerName);
                }
                break;
                
            case 'player_left':
                this.peers.delete(message.playerId);
                this.closePeerConnection(message.playerId);
                if (this.onPlayerLeft) {
                    this.onPlayerLeft(message.playerId);
                }
                break;
                
            case 'room_closed':
                if (this.onError) {
                    this.onError('Host disconnected');
                }
                this.disconnect();
                break;
                
            case 'webrtc_offer':
                this.handleOffer(message.fromId, message.data);
                break;
                
            case 'webrtc_answer':
                this.handleAnswer(message.fromId, message.data);
                break;
                
            case 'webrtc_ice_candidate':
                this.handleIceCandidate(message.fromId, message.data);
                break;
                
            case 'game_start':
                if (this.onGameStart) {
                    this.onGameStart(message.state);
                }
                break;
                
            case 'game_state':
                if (this.onGameState) {
                    this.onGameState(message.state);
                }
                break;
                
            case 'player_input':
                if (this.onPlayerInput) {
                    this.onPlayerInput(message.playerId, message.input);
                }
                break;
                
            case 'error':
                if (this.onError) {
                    this.onError(message.message);
                }
                break;
        }
    }

    createRoom(playerId, playerName) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('Not connected to server');
            return;
        }
        
        this.ws.send(JSON.stringify({
            type: 'create_room',
            playerId: playerId,
            playerName: playerName || '房主'
        }));
    }

    joinRoom(roomId, playerId, playerName) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('Not connected to server');
            return;
        }
        
        this.ws.send(JSON.stringify({
            type: 'join_room',
            roomId: roomId,
            playerId: playerId,
            playerName: playerName || '玩家'
        }));
    }

    leaveRoom() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        this.ws.send(JSON.stringify({
            type: 'leave_room'
        }));
        
        this.peerConnections.forEach((pc) => pc.close());
        this.peerConnections.clear();
        this.dataChannels.clear();
        this.peers.clear();
        
        this.roomId = null;
        this.isHost = false;
    }

    createPeerConnection(peerId, isInitiator) {
        if (this.peerConnections.has(peerId)) {
            return this.peerConnections.get(peerId);
        }
        
        const config = {
            iceServers: this.iceServers
        };
        
        const pc = new RTCPeerConnection(config);
        this.peerConnections.set(peerId, pc);
        
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal(peerId, 'webrtc_ice_candidate', event.candidate);
            }
        };
        
        pc.onconnectionstatechange = () => {
            console.log(`Connection state with ${peerId}: ${pc.connectionState}`);
        };
        
        if (isInitiator) {
            const channel = pc.createDataChannel('game', {
                ordered: true,
                maxRetransmits: 3
            });
            
            this.setupDataChannel(channel, peerId);
            
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                    this.sendSignal(peerId, 'webrtc_offer', pc.localDescription);
                })
                .catch(err => console.error('Error creating offer:', err));
        } else {
            pc.ondatachannel = (event) => {
                this.setupDataChannel(event.channel, peerId);
            };
        }
        
        return pc;
    }

    setupDataChannel(channel, peerId) {
        this.dataChannels.set(peerId, channel);
        
        channel.onopen = () => {
            console.log(`Data channel opened with ${peerId}`);
        };
        
        channel.onclose = () => {
            console.log(`Data channel closed with ${peerId}`);
            this.dataChannels.delete(peerId);
        };
        
        channel.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handlePeerData(peerId, data);
            } catch (e) {
                console.error('Error parsing peer data:', e);
            }
        };
        
        channel.onerror = (error) => {
            console.error(`Data channel error with ${peerId}:`, error);
        };
    }

    handleOffer(fromId, offer) {
        const pc = this.createPeerConnection(fromId, false);
        
        pc.setRemoteDescription(new RTCSessionDescription(offer))
            .then(() => pc.createAnswer())
            .then(answer => pc.setLocalDescription(answer))
            .then(() => {
                this.sendSignal(fromId, 'webrtc_answer', pc.localDescription);
            })
            .then(() => {
                if (this.pendingCandidates.has(fromId)) {
                    this.pendingCandidates.get(fromId).forEach(candidate => {
                        pc.addIceCandidate(new RTCIceCandidate(candidate));
                    });
                    this.pendingCandidates.delete(fromId);
                }
            })
            .catch(err => console.error('Error handling offer:', err));
    }

    handleAnswer(fromId, answer) {
        const pc = this.peerConnections.get(fromId);
        if (pc) {
            pc.setRemoteDescription(new RTCSessionDescription(answer))
                .then(() => {
                    if (this.pendingCandidates.has(fromId)) {
                        this.pendingCandidates.get(fromId).forEach(candidate => {
                            pc.addIceCandidate(new RTCIceCandidate(candidate));
                        });
                        this.pendingCandidates.delete(fromId);
                    }
                })
                .catch(err => console.error('Error handling answer:', err));
        }
    }

    handleIceCandidate(fromId, candidate) {
        const pc = this.peerConnections.get(fromId);
        if (pc && pc.remoteDescription) {
            pc.addIceCandidate(new RTCIceCandidate(candidate))
                .catch(err => console.error('Error adding ICE candidate:', err));
        } else {
            if (!this.pendingCandidates.has(fromId)) {
                this.pendingCandidates.set(fromId, []);
            }
            this.pendingCandidates.get(fromId).push(candidate);
        }
    }

    handlePeerData(peerId, data) {
        switch (data.type) {
            case 'game_start':
                if (!this.isHost && this.onGameStart) {
                    this.onGameStart(data.state);
                }
                break;
                
            case 'game_state':
                if (!this.isHost && this.onGameState) {
                    this.onGameState(data.state);
                }
                break;
                
            case 'level_up':
                if (!this.isHost && this.onLevelUp) {
                    this.onLevelUp(data.options);
                }
                break;
                
            case 'skill_selected':
                if (this.isHost && this.onSkillSelected) {
                    this.onSkillSelected(peerId, data.skillId);
                }
                break;
                
            case 'player_input':
                if (this.isHost && this.onPlayerInput) {
                    this.onPlayerInput(peerId, data.input);
                }
                break;
        }
    }

    sendSignal(targetId, type, data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        this.ws.send(JSON.stringify({
            type: type,
            targetId: targetId,
            data: data
        }));
    }

    sendToPeer(peerId, data) {
        const channel = this.dataChannels.get(peerId);
        if (channel && channel.readyState === 'open') {
            channel.send(JSON.stringify(data));
        }
    }

    broadcastToPeers(data) {
        const message = JSON.stringify(data);
        let sent = false;
        this.dataChannels.forEach((channel, peerId) => {
            if (channel.readyState === 'open') {
                channel.send(message);
                sent = true;
            }
        });
        return sent;
    }

    sendGameStart(state) {
        if (this.isHost) {
            const send = () => {
                const sent = this.broadcastToPeers({
                    type: 'game_start',
                    state: state
                });
                if (!sent) {
                    setTimeout(send, 100);
                }
            };
            send();
        }
    }

    sendGameState(state) {
        if (this.isHost) {
            this.broadcastToPeers({
                type: 'game_state',
                state: state
            });
        }
    }

    sendPlayerInput(input) {
        if (!this.isHost) {
            this.broadcastToPeers({
                type: 'player_input',
                input: input
            });
        }
    }
    
    sendSkillSelected(skillId) {
        if (!this.isHost) {
            this.broadcastToPeers({
                type: 'skill_selected',
                skillId: skillId
            });
        }
    }

    getConnectedPeers() {
        return Array.from(this.dataChannels.entries())
            .filter(([_, channel]) => channel.readyState === 'open')
            .map(([peerId, _]) => peerId);
    }

    isPeerConnected(peerId) {
        const channel = this.dataChannels.get(peerId);
        return channel && channel.readyState === 'open';
    }
}

const networkManager = new NetworkManager();
