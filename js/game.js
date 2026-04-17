class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.state = 'menu';
        this.running = false;
        this.paused = false;
        this.selectedTheme = 'forest';
        
        this.isMultiplayer = false;
        this.isHost = false;
        this.playerId = null;
        this.playerName = '';
        this.otherPlayers = new Map();
        this.playerInputs = new Map();
        
        this.settings = {
            sfxVolume: 0.7,
            bgmVolume: 0.5,
            showFps: true,
            particleQuality: 'medium'
        };
        
        this.camera = { x: 0, y: 0 };
        this.gameTime = 0;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 60;
        this.fpsHistory = [];
        
        this.particlePool = new ParticlePool(200);
        this.projectilePool = new ProjectilePool(100);
        this.particleSystem = new ParticleSystem(this.particlePool);
        
        this.map = null;
        this.player = null;
        this.enemyManager = null;
        this.lootManager = null;
        this.weaponManager = null;
        
        this.ui = new UI();
        this.input = new InputManager();
        
        this.pendingLevelUp = false;
        this.syncInterval = null;
        this.lastSyncTime = 0;
        this.syncRate = 50;
        
        this.resize();
        this.setupEventListeners();
        this.setupNetworkCallbacks();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupNetworkCallbacks() {
        networkManager.onRoomCreated = (roomId) => {
            document.getElementById('room-code').textContent = roomId;
            document.getElementById('room-info').classList.remove('hidden');
            document.getElementById('player-list-section').classList.remove('hidden');
            
            const createBtn = document.getElementById('create-room-btn');
            createBtn.disabled = true;
            createBtn.textContent = '已创建';
            
            const startBtn = document.getElementById('start-multiplayer-btn');
            startBtn.disabled = false;
            startBtn.textContent = '开始游戏';
            
            this.updatePlayerList();
        };
        
        networkManager.onRoomJoined = (roomId, hostId, players) => {
            document.getElementById('player-list-section').classList.remove('hidden');
            
            const joinBtn = document.getElementById('join-room-btn');
            joinBtn.disabled = true;
            joinBtn.textContent = '已加入';
            
            const startBtn = document.getElementById('start-multiplayer-btn');
            startBtn.disabled = true;
            startBtn.textContent = '等待房主开始...';
            
            this.updatePlayerList();
        };
        
        networkManager.onPlayerJoined = (playerId) => {
            this.updatePlayerList();
        };
        
        networkManager.onPlayerLeft = (playerId) => {
            this.otherPlayers.delete(playerId);
            this.playerInputs.delete(playerId);
            this.updatePlayerList();
        };
        
        networkManager.onGameStart = (state) => {
            this.startMultiplayerAsClient(state);
        };
        
        networkManager.onGameState = (state) => {
            this.receiveGameState(state);
        };
        
        networkManager.onLevelUp = (options) => {
            this.showLevelUpForClient(options);
        };
        
        networkManager.onSkillSelected = (playerId, skillId) => {
            this.applySkillToPlayer(playerId, skillId);
        };
        
        networkManager.onPlayerInput = (playerId, input) => {
            this.playerInputs.set(playerId, input);
        };
        
        networkManager.onError = (message) => {
            alert('错误: ' + message);
        };
        
        networkManager.onConnectionChange = (connected) => {
            this.updateConnectionStatus(connected);
        };
    }

    resetMultiplayerUI() {
        document.getElementById('room-info').classList.add('hidden');
        document.getElementById('player-list-section').classList.add('hidden');
        document.getElementById('player-list').innerHTML = '';
        document.getElementById('room-code').textContent = '------';
        document.getElementById('host-player-name').value = '';
        document.getElementById('join-player-name').value = '';
        document.getElementById('join-room-id').value = '';
        
        const createBtn = document.getElementById('create-room-btn');
        const joinBtn = document.getElementById('join-room-btn');
        const startBtn = document.getElementById('start-multiplayer-btn');
        
        createBtn.disabled = !networkManager.isConnected;
        createBtn.textContent = '创建房间';
        joinBtn.disabled = !networkManager.isConnected;
        joinBtn.textContent = '加入房间';
        startBtn.disabled = true;
        startBtn.textContent = '开始游戏';
    }

    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connection-status');
        const createBtn = document.getElementById('create-room-btn');
        const joinBtn = document.getElementById('join-room-btn');
        
        if (connected) {
            statusEl.textContent = '已连接';
            statusEl.className = 'connection-status connected';
            createBtn.disabled = false;
            joinBtn.disabled = false;
        } else {
            statusEl.textContent = '未连接';
            statusEl.className = 'connection-status disconnected';
            createBtn.disabled = true;
            joinBtn.disabled = true;
        }
    }

    updatePlayerList() {
        const playerList = document.getElementById('player-list');
        playerList.innerHTML = '';
        
        if (networkManager.isHost) {
            const hostItem = document.createElement('div');
            hostItem.className = 'player-item host';
            hostItem.textContent = this.playerName || '房主';
            playerList.appendChild(hostItem);
        } else {
            const hostItem = document.createElement('div');
            hostItem.className = 'player-item host';
            const hostPeer = networkManager.peers.get('host');
            hostItem.textContent = (hostPeer && hostPeer.name) || '房主';
            playerList.appendChild(hostItem);
        }
        
        const addedPlayers = new Set();
        addedPlayers.add('host');
        addedPlayers.add(this.playerId);
        
        networkManager.peers.forEach((peer, peerId) => {
            if (addedPlayers.has(peerId)) return;
            addedPlayers.add(peerId);
            
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.textContent = peer.name || '玩家';
            playerList.appendChild(playerItem);
        });
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());

        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedTheme = option.dataset.theme;
            });
        });

        document.getElementById('start-btn').addEventListener('click', () => {
            this.start();
        });

        document.getElementById('multiplayer-btn').addEventListener('click', () => {
            this.ui.showScreen('multiplayer-screen');
        });

        document.getElementById('multiplayer-back-btn').addEventListener('click', () => {
            networkManager.disconnect();
            this.resetMultiplayerUI();
            this.ui.showScreen('start-screen');
        });

        document.getElementById('connect-server-btn').addEventListener('click', async () => {
            const address = document.getElementById('server-address').value;
            const statusEl = document.getElementById('connection-status');
            
            statusEl.textContent = '连接中...';
            statusEl.className = 'connection-status connecting';
            
            try {
                await networkManager.connect(address);
            } catch (e) {
                statusEl.textContent = '连接失败';
                statusEl.className = 'connection-status disconnected';
            }
        });

        document.getElementById('create-room-btn').addEventListener('click', () => {
            const createBtn = document.getElementById('create-room-btn');
            if (createBtn.disabled) return;
            
            if (networkManager.roomId) {
                alert('已经创建房间');
                return;
            }
            
            const name = document.getElementById('host-player-name').value || '房主';
            this.playerName = name;
            this.playerId = 'host_' + Utils.generateId();
            
            createBtn.disabled = true;
            createBtn.textContent = '创建中...';
            
            networkManager.createRoom(this.playerId, this.playerName);
        });

        document.getElementById('join-room-btn').addEventListener('click', () => {
            const joinBtn = document.getElementById('join-room-btn');
            if (joinBtn.disabled) return;
            
            const name = document.getElementById('join-player-name').value || '玩家';
            const roomId = document.getElementById('join-room-id').value.toUpperCase();
            
            if (roomId.length !== 6) {
                alert('请输入6位房间号');
                return;
            }
            
            if (networkManager.roomId) {
                alert('已经加入房间');
                return;
            }
            
            joinBtn.disabled = true;
            joinBtn.textContent = '加入中...';
            
            this.playerName = name;
            this.playerId = 'player_' + Utils.generateId();
            networkManager.joinRoom(roomId, this.playerId, this.playerName);
        });

        document.getElementById('start-multiplayer-btn').addEventListener('click', () => {
            if (!networkManager.isHost) {
                alert('只有房主才能开始游戏');
                return;
            }
            
            if (!networkManager.roomId) {
                alert('请先创建房间');
                return;
            }
            
            this.startMultiplayer();
        });

        document.getElementById('copy-room-code-btn').addEventListener('click', () => {
            const roomCode = document.getElementById('room-code').textContent;
            if (roomCode && roomCode !== '------') {
                navigator.clipboard.writeText(roomCode).then(() => {
                    const btn = document.getElementById('copy-room-code-btn');
                    const originalText = btn.textContent;
                    btn.textContent = '已复制';
                    btn.classList.add('copied');
                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.classList.remove('copied');
                    }, 2000);
                }).catch(() => {
                    alert('复制失败，请手动复制: ' + roomCode);
                });
            }
        });

        document.getElementById('help-btn').addEventListener('click', () => {
            this.ui.showScreen('help-screen');
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            this.ui.updateSettings(this.settings);
            this.ui.showScreen('settings-screen');
        });

        document.getElementById('help-back-btn').addEventListener('click', () => {
            this.ui.showScreen('start-screen');
        });

        document.getElementById('settings-back-btn').addEventListener('click', () => {
            this.settings = this.ui.getSettings();
            this.applySettings();
            this.ui.showScreen('start-screen');
        });

        document.getElementById('resume-btn').addEventListener('click', () => {
            this.resume();
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restart();
        });

        document.getElementById('quit-btn').addEventListener('click', () => {
            this.quit();
        });

        document.getElementById('retry-btn').addEventListener('click', () => {
            this.restart();
        });

        document.getElementById('menu-btn').addEventListener('click', () => {
            this.quit();
        });

        document.getElementById('sfx-volume').addEventListener('input', (e) => {
            document.getElementById('sfx-volume-value').textContent = `${e.target.value}%`;
        });

        document.getElementById('bgm-volume').addEventListener('input', (e) => {
            document.getElementById('bgm-volume-value').textContent = `${e.target.value}%`;
        });

        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'escape' || e.key.toLowerCase() === 'p') {
                if (this.state === 'playing') {
                    this.pause();
                } else if (this.state === 'paused') {
                    this.resume();
                }
            }
        });

        const pauseBtnMobile = document.getElementById('pause-btn-mobile');
        if (pauseBtnMobile) {
            pauseBtnMobile.addEventListener('click', () => {
                if (this.state === 'playing') {
                    this.pause();
                } else if (this.state === 'paused') {
                    this.resume();
                }
            });
            
            pauseBtnMobile.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.state === 'playing') {
                    this.pause();
                } else if (this.state === 'paused') {
                    this.resume();
                }
            }, { passive: false });
        }
    }

    applySettings() {
        audioManager.setSfxVolume(this.settings.sfxVolume);
        audioManager.setBgmVolume(this.settings.bgmVolume);
        this.ui.showFps(this.settings.showFps);
    }

    start() {
        this.isMultiplayer = false;
        this.isHost = false;
        
        audioManager.init();
        audioManager.resume();
        
        this.map = new GameMap(2000, 2000, this.selectedTheme);
        this.player = new Player(this.map.width / 2, this.map.height / 2);
        this.enemyManager = new EnemyManager();
        this.lootManager = new LootManager();
        this.weaponManager = new WeaponManager(
            this.player.skillManager,
            this.projectilePool,
            this.particlePool
        );
        
        this.reset();
        this.state = 'playing';
        this.running = true;
        
        this.ui.hideScreen('start-screen');
        this.ui.showHud();
        this.applySettings();
        
        audioManager.playBgm();
        
        this.lastTime = performance.now();
        this.gameLoop();
    }

    startMultiplayer() {
        this.isMultiplayer = true;
        this.isHost = networkManager.isHost;
        
        audioManager.init();
        audioManager.resume();
        
        this.map = new GameMap(2000, 2000, this.selectedTheme);
        this.player = new Player(this.map.width / 2, this.map.height / 2);
        this.enemyManager = new EnemyManager();
        this.lootManager = new LootManager();
        this.weaponManager = new WeaponManager(
            this.player.skillManager,
            this.projectilePool,
            this.particlePool
        );
        
        this.reset();
        this.state = 'playing';
        this.running = true;
        
        this.ui.hideScreen('multiplayer-screen');
        this.ui.showHud();
        this.applySettings();
        
        audioManager.playBgm();
        
        if (this.isHost) {
            this.startSync();
            const initialState = this.getGameState();
            networkManager.sendGameStart(initialState);
        }
        
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    startMultiplayerAsClient(state) {
        this.isMultiplayer = true;
        this.isHost = false;
        
        audioManager.init();
        audioManager.resume();
        
        this.map = new GameMap(2000, 2000, this.selectedTheme);
        this.player = new Player(this.map.width / 2, this.map.height / 2);
        this.enemyManager = new EnemyManager();
        this.lootManager = new LootManager();
        this.weaponManager = new WeaponManager(
            this.player.skillManager,
            this.projectilePool,
            this.particlePool
        );
        
        this.reset();
        this.state = 'playing';
        this.running = true;
        
        this.ui.hideScreen('multiplayer-screen');
        this.ui.showHud();
        this.applySettings();
        
        audioManager.playBgm();
        
        if (state) {
            this.receiveGameState(state);
        }
        
        this.lastTime = performance.now();
        this.gameLoop();
    }

    startSync() {
        this.syncInterval = setInterval(() => {
            if (this.isHost && this.running) {
                this.sendGameState();
            }
        }, this.syncRate);
    }

    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    sendGameState() {
        const state = this.getGameState();
        networkManager.sendGameState(state);
    }
    
    getGameState() {
        const otherPlayersData = {};
        this.otherPlayers.forEach((player, playerId) => {
            otherPlayersData[playerId] = {
                x: player.x,
                y: player.y,
                facingAngle: player.facingAngle,
                hp: player.hp,
                maxHp: player.maxHp,
                level: player.level,
                exp: player.exp,
                expToLevel: player.expToLevel,
                kills: player.kills,
                score: player.score
            };
        });
        
        return {
            gameTime: this.gameTime,
            host: {
                x: this.player.x,
                y: this.player.y,
                hp: this.player.hp,
                maxHp: this.player.maxHp,
                level: this.player.level,
                exp: this.player.exp,
                expToLevel: this.player.expToLevel,
                kills: this.player.kills,
                score: this.player.score,
                facingAngle: this.player.facingAngle
            },
            otherPlayers: otherPlayersData,
            enemies: this.enemyManager.enemies.map(e => ({
                id: e.id,
                type: e.type,
                x: e.x,
                y: e.y,
                hp: e.hp,
                active: e.active
            })),
            projectiles: this.projectilePool.active.map(p => ({
                id: p.id || Utils.generateId(),
                x: p.x,
                y: p.y,
                vx: p.vx,
                vy: p.vy,
                damage: p.damage,
                speed: p.speed,
                angle: p.angle,
                range: p.range,
                traveled: p.traveled,
                radius: p.radius,
                color: p.color,
                owner: p.owner === this.player ? 'host' : (p.owner && p.owner.id) || 'host',
                pierce: p.pierce,
                type: p.type,
                active: p.active
            })),
            loots: this.lootManager.loot.map(l => ({
                id: l.id,
                type: l.type,
                x: l.x,
                y: l.y,
                active: l.active,
                collected: l.collected
            })),
            wave: this.enemyManager.wave
        };
    }

    receiveGameState(state) {
        if (!this.isHost && this.running) {
            this.gameTime = state.gameTime;
            
            if (state.host) {
                let hostPlayer = this.otherPlayers.get('host');
                if (!hostPlayer) {
                    hostPlayer = {
                        x: state.host.x,
                        y: state.host.y,
                        vx: 0,
                        vy: 0,
                        radius: 20,
                        facingAngle: state.host.facingAngle,
                        color: '#4a9eff',
                        hp: state.host.hp,
                        maxHp: state.host.maxHp,
                        level: state.host.level
                    };
                    this.otherPlayers.set('host', hostPlayer);
                } else {
                    hostPlayer.x = state.host.x;
                    hostPlayer.y = state.host.y;
                    hostPlayer.facingAngle = state.host.facingAngle;
                    hostPlayer.hp = state.host.hp;
                    hostPlayer.maxHp = state.host.maxHp;
                    hostPlayer.level = state.host.level;
                }
            }
            
            if (state.otherPlayers) {
                for (const playerId in state.otherPlayers) {
                    const playerData = state.otherPlayers[playerId];
                    
                    if (playerId === this.playerId) {
                        this.player.hp = playerData.hp;
                        this.player.maxHp = playerData.maxHp;
                        this.player.level = playerData.level;
                        this.player.exp = playerData.exp;
                        this.player.expToLevel = playerData.expToLevel;
                        this.player.kills = playerData.kills;
                        this.player.score = playerData.score;
                        continue;
                    }
                    
                    let otherPlayer = this.otherPlayers.get(playerId);
                    if (!otherPlayer) {
                        otherPlayer = {
                            x: playerData.x,
                            y: playerData.y,
                            vx: 0,
                            vy: 0,
                            radius: 20,
                            facingAngle: playerData.facingAngle,
                            color: '#ff6b6b',
                            hp: playerData.hp,
                            maxHp: playerData.maxHp,
                            level: playerData.level
                        };
                        this.otherPlayers.set(playerId, otherPlayer);
                    } else {
                        otherPlayer.x = playerData.x;
                        otherPlayer.y = playerData.y;
                        otherPlayer.facingAngle = playerData.facingAngle;
                        otherPlayer.hp = playerData.hp;
                        otherPlayer.maxHp = playerData.maxHp;
                        otherPlayer.level = playerData.level;
                    }
                }
            }
            
            const activeEnemyIds = new Set();
            state.enemies.forEach(enemyState => {
                if (enemyState.active) {
                    activeEnemyIds.add(enemyState.id);
                }
                
                let enemy = this.enemyManager.enemies.find(e => e.id === enemyState.id);
                if (!enemy && enemyState.active) {
                    enemy = new Enemy(enemyState.type, enemyState.x, enemyState.y);
                    enemy.id = enemyState.id;
                    this.enemyManager.enemies.push(enemy);
                }
                if (enemy) {
                    enemy.x = enemyState.x;
                    enemy.y = enemyState.y;
                    enemy.hp = enemyState.hp;
                    enemy.active = enemyState.active;
                }
            });
            
            this.enemyManager.enemies = this.enemyManager.enemies.filter(e => 
                activeEnemyIds.has(e.id) && e.active
            );
            
            this.enemyManager.wave = state.wave;
            
            const activeLootIds = new Set();
            state.loots.forEach(lootState => {
                if (lootState.active) {
                    activeLootIds.add(lootState.id);
                }
                
                let loot = this.lootManager.loot.find(l => l.id === lootState.id);
                if (!loot && lootState.active) {
                    loot = new Loot(lootState.type, lootState.x, lootState.y);
                    loot.id = lootState.id;
                    this.lootManager.loot.push(loot);
                }
                if (loot) {
                    loot.x = lootState.x;
                    loot.y = lootState.y;
                    loot.active = lootState.active;
                }
            });
            
            this.lootManager.loot = this.lootManager.loot.filter(l => 
                activeLootIds.has(l.id) && l.active
            );
            
            if (state.projectiles) {
                const activeProjectileIds = new Set();
                state.projectiles.forEach(projState => {
                    if (projState.active) {
                        activeProjectileIds.add(projState.id);
                    }
                    
                    let projectile = this.projectilePool.active.find(p => p.id === projState.id);
                    if (!projectile && projState.active) {
                        projectile = this.projectilePool.create({
                            x: projState.x,
                            y: projState.y,
                            vx: projState.vx,
                            vy: projState.vy,
                            damage: projState.damage,
                            speed: projState.speed,
                            angle: projState.angle,
                            range: projState.range,
                            traveled: projState.traveled,
                            radius: projState.radius,
                            color: projState.color,
                            owner: projState.owner,
                            pierce: projState.pierce,
                            type: projState.type,
                            active: true,
                            hitEnemies: new Set()
                        });
                        projectile.id = projState.id;
                    }
                    if (projectile) {
                        projectile.x = projState.x;
                        projectile.y = projState.y;
                        projectile.vx = projState.vx;
                        projectile.vy = projState.vy;
                        projectile.active = projState.active;
                    }
                });
                
                this.projectilePool.active = this.projectilePool.active.filter(p => 
                    activeProjectileIds.has(p.id) && p.active
                );
            }
        }
    }

    sendPlayerInput() {
        if (this.isMultiplayer && !this.isHost) {
            const movement = this.input.getMovementInput();
            networkManager.sendPlayerInput({
                x: movement.x,
                y: movement.y,
                timestamp: performance.now()
            });
        }
    }

    pause() {
        this.state = 'paused';
        this.paused = true;
        this.ui.showScreen('pause-screen');
    }

    resume() {
        this.state = 'playing';
        this.paused = false;
        this.ui.hideScreen('pause-screen');
        this.lastTime = performance.now();
    }

    restart() {
        this.ui.hideScreen('pause-screen');
        this.ui.hideScreen('game-over-screen');
        this.reset();
        this.state = 'playing';
        this.paused = false;
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    quit() {
        this.state = 'menu';
        this.running = false;
        this.paused = false;
        this.isMultiplayer = false;
        
        this.stopSync();
        
        if (networkManager.isConnected) {
            networkManager.leaveRoom();
        }
        
        audioManager.stopBgm();
        
        this.ui.hideScreen('pause-screen');
        this.ui.hideScreen('game-over-screen');
        this.ui.hideHud();
        this.ui.showScreen('start-screen');
    }

    reset() {
        this.gameTime = 0;
        this.otherPlayers.clear();
        this.playerInputs.clear();
        
        this.map.changeTheme(this.selectedTheme);
        this.map.reset();
        this.player.reset(this.map.width / 2, this.map.height / 2);
        this.enemyManager.reset();
        this.lootManager.reset();
        this.weaponManager.reset();
        this.particlePool.releaseAll();
        this.projectilePool.releaseAll();
        
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;
        
        this.pendingLevelUp = false;
    }

    gameLoop() {
        if (!this.running) return;

        const currentTime = performance.now();
        this.deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        this.updateFps(currentTime);

        if (!this.paused && this.state === 'playing') {
            this.update(this.deltaTime);
        }

        this.render();

        requestAnimationFrame(() => this.gameLoop());
    }

    updateFps(currentTime) {
        this.fpsHistory.push(currentTime);
        while (this.fpsHistory.length > 60) {
            this.fpsHistory.shift();
        }
        
        if (this.fpsHistory.length >= 2) {
            const elapsed = this.fpsHistory[this.fpsHistory.length - 1] - this.fpsHistory[0];
            this.fps = (this.fpsHistory.length - 1) / (elapsed / 1000);
        }
    }

    update(deltaTime) {
        this.gameTime += deltaTime;

        const passiveBonuses = this.player.skillManager.getPassiveBonuses();
        this.player.updateShield(passiveBonuses);

        this.player.update(deltaTime, this.input, this.map, passiveBonuses);
        
        if (this.isMultiplayer) {
            if (this.isHost) {
                this.updateOtherPlayers(deltaTime);
                this.checkOtherPlayersCollisions();
                this.updateOtherPlayersLoot(deltaTime, passiveBonuses);
            } else {
                this.sendPlayerInput();
            }
        }

        this.updateCamera();

        if (this.isHost || !this.isMultiplayer) {
            this.enemyManager.update(deltaTime, this.player, this.map, this.projectilePool);
            this.weaponManager.update(deltaTime, this.player, this.enemyManager.enemies);
            
            if (this.isHost && this.isMultiplayer) {
                this.updateOtherPlayersWeapons(deltaTime);
            }
            
            this.projectilePool.update(deltaTime, this.enemyManager.enemies);
            this.checkProjectileCollisions();
            this.checkEnemyCollisions();

            const magnetRange = passiveBonuses.magnetRange || 80;
            const magnetSpeed = passiveBonuses.magnetSpeed || 1;
            const expGained = this.lootManager.update(deltaTime, this.player, magnetRange, magnetSpeed);
            
            if (expGained > 0) {
                const oldLevel = this.player.level;
                this.player.addExp(expGained, passiveBonuses);
                
                if (this.player.level > oldLevel) {
                    this.onLevelUp();
                }
            }
            
            if (this.isHost && this.isMultiplayer) {
                this.updateOtherPlayersLoot(deltaTime);
            }

            this.particlePool.update(deltaTime);
        } else if (this.isMultiplayer && !this.isHost) {
            this.projectilePool.forEach((projectile) => {
                if (!projectile.active) return;
                projectile.x += projectile.vx * deltaTime;
                projectile.y += projectile.vy * deltaTime;
            });
        }

        this.updateUI();

        if (this.player.hp <= 0) {
            this.gameOver();
        }
    }

    updateOtherPlayers(deltaTime) {
        this.playerInputs.forEach((input, playerId) => {
            let otherPlayer = this.otherPlayers.get(playerId);
            if (!otherPlayer) {
                otherPlayer = {
                    id: playerId,
                    x: this.map.width / 2,
                    y: this.map.height / 2,
                    vx: 0,
                    vy: 0,
                    radius: 20,
                    facingAngle: 0,
                    color: '#ff6b6b',
                    hp: 100,
                    maxHp: 100,
                    level: 1,
                    exp: 0,
                    expToLevel: 10,
                    kills: 0,
                    score: 0,
                    invincibleTime: 0,
                    skillManager: new SkillManager(),
                    weaponManager: null
                };
                otherPlayer.skillManager.upgradeSkill('sword');
                otherPlayer.weaponManager = new WeaponManager(
                    otherPlayer.skillManager,
                    this.projectilePool,
                    this.particlePool
                );
                this.otherPlayers.set(playerId, otherPlayer);
            }
            
            const speed = 150;
            let moveX = input.x;
            let moveY = input.y;
            
            const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
            if (magnitude > 0) {
                moveX /= magnitude;
                moveY /= magnitude;
                otherPlayer.facingAngle = Math.atan2(moveY, moveX);
            }
            
            otherPlayer.vx = moveX * speed;
            otherPlayer.vy = moveY * speed;
            otherPlayer.x += otherPlayer.vx * deltaTime;
            otherPlayer.y += otherPlayer.vy * deltaTime;
            
            const padding = otherPlayer.radius + 10;
            otherPlayer.x = Utils.clamp(otherPlayer.x, padding, this.map.width - padding);
            otherPlayer.y = Utils.clamp(otherPlayer.y, padding, this.map.height - padding);
            
            if (otherPlayer.invincibleTime > 0) {
                otherPlayer.invincibleTime -= deltaTime;
            }
        });
    }

    updateOtherPlayersWeapons(deltaTime) {
        this.otherPlayers.forEach((player, playerId) => {
            if (player.weaponManager) {
                player.weaponManager.update(deltaTime, player, this.enemyManager.enemies);
            }
        });
    }

    checkOtherPlayersCollisions() {
        this.otherPlayers.forEach((player, playerId) => {
            for (const enemy of this.enemyManager.enemies) {
                if (!enemy.active) continue;

                if (Utils.circleCollision(
                    player.x, player.y, player.radius,
                    enemy.x, enemy.y, enemy.radius
                )) {
                    if (player.invincibleTime <= 0) {
                        player.hp -= enemy.damage;
                        player.invincibleTime = 1;
                        
                        if (player.hp <= 0) {
                            player.hp = 0;
                        }
                    }
                }
            }
        });
    }

    updateOtherPlayersLoot(deltaTime) {
        this.otherPlayers.forEach((player, playerId) => {
            const magnetRange = 80;
            const magnetSpeed = 1;
            
            for (const loot of this.lootManager.loot) {
                if (!loot.active) continue;
                
                const dist = Utils.distance(player.x, player.y, loot.x, loot.y);
                
                if (loot.collected && loot.collectingPlayer === playerId) {
                    const angle = Utils.angle(loot.x, loot.y, player.x, player.y);
                    loot.collectSpeed = (loot.collectSpeed || 0) + 500 * deltaTime;
                    loot.x += Math.cos(angle) * loot.collectSpeed * deltaTime;
                    loot.y += Math.sin(angle) * loot.collectSpeed * deltaTime;

                    if (dist < player.radius + loot.radius) {
                        loot.active = false;
                        if (loot.type === 'exp' || loot.type === 'expLarge') {
                            const oldLevel = player.level;
                            player.exp += loot.value;
                            while (player.exp >= player.expToLevel) {
                                player.exp -= player.expToLevel;
                                player.level++;
                                player.expToLevel = Math.floor(player.expToLevel * 1.5);
                                player.maxHp += 10;
                                player.hp = player.maxHp;
                            }
                            
                            if (player.level > oldLevel) {
                                this.sendLevelUpToPlayer(playerId, player);
                            }
                        } else if (loot.type === 'health') {
                            player.hp = Math.min(player.maxHp, player.hp + loot.value);
                        }
                    }
                } else if (!loot.collected && dist < magnetRange) {
                    loot.collected = true;
                    loot.collectingPlayer = playerId;
                }
            }
        });
    }
    
    sendLevelUpToPlayer(playerId, player) {
        const options = player.skillManager.getUpgradeOptions(3);
        networkManager.sendToPeer(playerId, {
            type: 'level_up',
            options: options
        });
    }

    updateCamera() {
        const targetX = this.player.x - this.canvas.width / 2;
        const targetY = this.player.y - this.canvas.height / 2;

        this.camera.x = Utils.lerp(this.camera.x, targetX, 0.1);
        this.camera.y = Utils.lerp(this.camera.y, targetY, 0.1);

        this.camera.x = Utils.clamp(this.camera.x, 0, this.map.width - this.canvas.width);
        this.camera.y = Utils.clamp(this.camera.y, 0, this.map.height - this.canvas.height);
    }

    checkProjectileCollisions() {
        this.projectilePool.forEach((projectile) => {
            if (!projectile.active) return;

            if (projectile.owner === 'enemy') {
                if (Utils.circleCollision(
                    projectile.x, projectile.y, projectile.radius,
                    this.player.x, this.player.y, this.player.radius
                )) {
                    this.player.takeDamage(projectile.damage);
                    audioManager.playDamage();
                    this.particleSystem.emitDamage(this.player.x, this.player.y, '#ff0000', 5);
                    this.ui.showDamageNumber(this.player.x, this.player.y, projectile.damage, 'normal', this.camera);
                    projectile.active = false;
                }
            } else {
                for (const enemy of this.enemyManager.enemies) {
                    if (!enemy.active) continue;
                    if (projectile.hitEnemies.has(enemy.id)) continue;

                    if (Utils.circleCollision(
                        projectile.x, projectile.y, projectile.radius,
                        enemy.x, enemy.y, enemy.radius
                    )) {
                        const passiveBonuses = this.player.skillManager.getPassiveBonuses();
                        let damage = projectile.damage;
                        let isCrit = false;

                        if (Math.random() < passiveBonuses.critRate) {
                            damage *= passiveBonuses.critDamage;
                            isCrit = true;
                        }

                        const killed = enemy.takeDamage(damage, this.player);
                        
                        audioManager.playHit();
                        this.particleSystem.emitDamage(enemy.x, enemy.y, projectile.color, 5);
                        this.ui.showDamageNumber(
                            enemy.x, enemy.y, damage,
                            isCrit ? 'critical' : 'normal',
                            this.camera
                        );

                        projectile.hitEnemies.add(enemy.id);

                        if (projectile.pierce <= 0) {
                            projectile.active = false;
                        } else {
                            projectile.pierce--;
                        }

                        if (killed) {
                            this.onEnemyKilled(enemy);
                        }
                    }
                }
            }
        });
    }

    checkEnemyCollisions() {
        for (const enemy of this.enemyManager.enemies) {
            if (!enemy.active) continue;

            if (Utils.circleCollision(
                this.player.x, this.player.y, this.player.radius,
                enemy.x, enemy.y, enemy.radius
            )) {
                if (this.player.takeDamage(enemy.damage)) {
                    audioManager.playDamage();
                    this.particleSystem.emitDamage(this.player.x, this.player.y, '#ff0000', 8);
                    this.ui.showDamageNumber(this.player.x, this.player.y, enemy.damage, 'normal', this.camera);
                }
            }
        }
    }

    onEnemyKilled(enemy) {
        this.player.kills++;
        this.player.score += enemy.score;

        this.lootManager.spawnLoot(enemy.x, enemy.y, enemy);

        this.particleSystem.emitDeath(enemy.x, enemy.y, enemy.color);
        audioManager.playDeath();
    }

    onLevelUp() {
        this.particleSystem.emitLevelUp(this.player.x, this.player.y);
        
        const options = this.player.skillManager.getUpgradeOptions(3);
        
        if (options.length > 0) {
            if (!this.isMultiplayer) {
                this.paused = true;
            }
            this.ui.showLevelUpScreen(options, (skillId) => {
                this.player.skillManager.upgradeSkill(skillId);
                audioManager.playSkillUnlock();
                this.ui.updateSkillBar(this.player.skillManager.getAllSkills());
                if (!this.isMultiplayer) {
                    this.paused = false;
                }
            });
        }
    }
    
    showLevelUpForClient(options) {
        this.particleSystem.emitLevelUp(this.player.x, this.player.y);
        
        if (options.length > 0) {
            this.ui.showLevelUpScreen(options, (skillId) => {
                this.player.skillManager.upgradeSkill(skillId);
                audioManager.playSkillUnlock();
                this.ui.updateSkillBar(this.player.skillManager.getAllSkills());
                networkManager.sendSkillSelected(skillId);
            });
        }
    }
    
    applySkillToPlayer(playerId, skillId) {
        const player = this.otherPlayers.get(playerId);
        if (player && player.skillManager) {
            player.skillManager.upgradeSkill(skillId);
        }
    }

    gameOver() {
        this.state = 'gameover';
        this.running = false;
        
        this.stopSync();
        
        audioManager.stopBgm();
        audioManager.playDeath();
        
        this.ui.updateGameOverStats(
            this.gameTime,
            this.player.kills,
            this.player.level,
            this.player.score
        );
        
        this.ui.hideHud();
        this.ui.showScreen('game-over-screen');
    }

    updateUI() {
        this.ui.updateHealth(this.player.hp, this.player.maxHp);
        this.ui.updateExp(this.player.exp, this.player.expToLevel, this.player.level);
        this.ui.updateTimer(this.gameTime);
        this.ui.updateKillCount(this.player.kills);
        this.ui.updateSkillBar(this.player.skillManager.getAllSkills());
        
        if (this.settings.showFps) {
            this.ui.updateFps(this.fps);
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.map.render(this.ctx, this.camera, this.canvas.width, this.canvas.height);

        this.lootManager.render(this.ctx, this.camera);

        this.enemyManager.render(this.ctx, this.camera);

        this.renderOtherPlayers();

        this.player.render(this.ctx, this.camera);

        this.projectilePool.render(this.ctx, this.camera);

        this.particlePool.render(this.ctx, this.camera);

        this.ui.renderMinimap(
            this.map,
            this.player,
            this.enemyManager,
            this.lootManager,
            this.camera,
            this.canvas.width,
            this.canvas.height
        );
    }

    renderOtherPlayers() {
        this.otherPlayers.forEach((player, playerId) => {
            const screenX = player.x - this.camera.x;
            const screenY = player.y - this.camera.y;

            this.ctx.save();

            this.ctx.fillStyle = player.color || '#ff6b6b';
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, player.radius, 0, Math.PI * 2);
            this.ctx.fill();

            const highlightColor = player.color === '#4a9eff' ? '#6ab7ff' : '#ff9999';
            this.ctx.fillStyle = highlightColor;
            this.ctx.beginPath();
            this.ctx.arc(screenX - 5, screenY - 5, player.radius * 0.6, 0, Math.PI * 2);
            this.ctx.fill();

            const eyeOffset = 5;
            const eyeAngle = player.facingAngle;
            const eyeX = screenX + Math.cos(eyeAngle) * eyeOffset;
            const eyeY = screenY + Math.sin(eyeAngle) * eyeOffset;

            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(eyeX - 4, eyeY - 2, 4, 0, Math.PI * 2);
            this.ctx.arc(eyeX + 4, eyeY - 2, 4, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = '#000';
            this.ctx.beginPath();
            this.ctx.arc(eyeX - 4, eyeY - 2, 2, 0, Math.PI * 2);
            this.ctx.arc(eyeX + 4, eyeY - 2, 2, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        });
    }
}
