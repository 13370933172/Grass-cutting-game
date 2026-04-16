class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.state = 'menu';
        this.running = false;
        this.paused = false;
        this.selectedTheme = 'forest';
        
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
        
        this.resize();
        this.setupEventListeners();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
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
        
        audioManager.stopBgm();
        
        this.ui.hideScreen('pause-screen');
        this.ui.hideScreen('game-over-screen');
        this.ui.hideHud();
        this.ui.showScreen('start-screen');
    }

    reset() {
        this.gameTime = 0;
        
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

        this.updateCamera();

        this.enemyManager.update(deltaTime, this.player, this.map, this.projectilePool);
        this.weaponManager.update(deltaTime, this.player, this.enemyManager.enemies);

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

        this.particlePool.update(deltaTime);

        this.updateUI();

        if (this.player.hp <= 0) {
            this.gameOver();
        }
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
            this.paused = true;
            this.ui.showLevelUpScreen(options, (skillId) => {
                this.player.skillManager.upgradeSkill(skillId);
                audioManager.playSkillUnlock();
                this.ui.updateSkillBar(this.player.skillManager.getAllSkills());
                this.paused = false;
            });
        }
    }

    gameOver() {
        this.state = 'gameover';
        this.running = false;
        
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
}
