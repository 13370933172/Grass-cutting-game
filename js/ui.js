class UI {
    constructor() {
        this.healthBar = document.getElementById('health-bar');
        this.healthText = document.getElementById('health-text');
        this.expBar = document.getElementById('exp-bar');
        this.expText = document.getElementById('exp-text');
        this.timerDisplay = document.getElementById('timer');
        this.killCountDisplay = document.getElementById('kill-count');
        this.skillSlots = document.getElementById('skill-slots');
        this.fpsDisplay = document.getElementById('fps-display');
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');

        this.damageNumbers = [];
        this.damageNumberContainer = null;
        this.createDamageNumberContainer();
    }

    createDamageNumberContainer() {
        this.damageNumberContainer = document.createElement('div');
        this.damageNumberContainer.id = 'damage-numbers';
        this.damageNumberContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 60;
        `;
        document.getElementById('game-container').appendChild(this.damageNumberContainer);
    }

    updateHealth(current, max) {
        const percent = (current / max) * 100;
        this.healthBar.style.width = `${percent}%`;
        this.healthText.textContent = `${Math.ceil(current)}/${max}`;
    }

    updateExp(current, toLevel, level) {
        const percent = (current / toLevel) * 100;
        this.expBar.style.width = `${percent}%`;
        this.expText.textContent = `Lv.${level}`;
    }

    updateTimer(seconds) {
        this.timerDisplay.textContent = Utils.formatTime(seconds);
    }

    updateKillCount(count) {
        this.killCountDisplay.textContent = `击杀: ${count}`;
    }

    updateSkillBar(skills) {
        this.skillSlots.innerHTML = '';
        
        for (const skill of skills) {
            const slot = document.createElement('div');
            slot.className = 'skill-slot';
            slot.innerHTML = `
                <span>${skill.icon}</span>
                <span class="skill-level">${skill.level}/${skill.maxLevel}</span>
            `;
            slot.title = `${skill.name} (Lv.${skill.level})`;
            this.skillSlots.appendChild(slot);
        }
    }

    updateFps(fps) {
        this.fpsDisplay.textContent = `FPS: ${Math.round(fps)}`;
    }

    showFps(show) {
        if (show) {
            this.fpsDisplay.classList.remove('hidden');
        } else {
            this.fpsDisplay.classList.add('hidden');
        }
    }

    showDamageNumber(x, y, damage, type = 'normal', camera) {
        const screenX = x - camera.x;
        const screenY = y - camera.y;

        const element = document.createElement('div');
        element.className = `damage-number ${type}`;
        element.textContent = type === 'heal' ? `+${Math.round(damage)}` : Math.round(damage);
        element.style.left = `${screenX}px`;
        element.style.top = `${screenY}px`;
        
        this.damageNumberContainer.appendChild(element);

        setTimeout(() => {
            element.remove();
        }, 1000);
    }

    renderMinimap(map, player, enemies, loot, camera, canvasWidth, canvasHeight) {
        const scale = 150;
        this.minimapCanvas.width = scale;
        this.minimapCanvas.height = scale;

        map.renderMinimap(this.minimapCtx, scale, player.x, player.y, canvasWidth, canvasHeight);
        
        loot.renderMinimap(this.minimapCtx, map.width, map.height, scale);
        enemies.renderMinimap(this.minimapCtx, map.width, map.height, scale);
        player.renderMinimap(this.minimapCtx, map.width, map.height, scale);
    }

    showScreen(screenId) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => screen.classList.add('hidden'));
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
        }
    }

    hideScreen(screenId) {
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('hidden');
        }
    }

    showHud() {
        document.getElementById('hud').classList.remove('hidden');
    }

    hideHud() {
        document.getElementById('hud').classList.add('hidden');
    }

    showLevelUpScreen(options, onSelect) {
        const levelUpScreen = document.getElementById('level-up-screen');
        const skillChoices = document.getElementById('skill-choices');
        
        skillChoices.innerHTML = '';

        for (const option of options) {
            const choice = document.createElement('div');
            choice.className = 'skill-choice';
            choice.innerHTML = `
                <div class="skill-choice-icon">${option.icon}</div>
                <div class="skill-choice-info">
                    <div class="skill-choice-name">${option.name}</div>
                    <div class="skill-choice-desc">${option.description}</div>
                    <div class="skill-choice-level">
                        ${option.currentLevel > 0 ? `当前等级: ${option.currentLevel}` : '新技能'}
                        ${option.nextUpgrade ? `<br>升级效果: ${option.nextUpgrade.desc}` : ''}
                    </div>
                </div>
            `;
            
            choice.addEventListener('click', () => {
                onSelect(option.id);
                this.hideScreen('level-up-screen');
            });
            
            skillChoices.appendChild(choice);
        }

        this.showScreen('level-up-screen');
    }

    updateGameOverStats(survivalTime, kills, level, score) {
        document.getElementById('survival-time').textContent = Utils.formatTime(survivalTime);
        document.getElementById('enemies-killed').textContent = kills;
        document.getElementById('final-level').textContent = level;
        document.getElementById('final-score').textContent = score;
    }

    updateSettings(settings) {
        document.getElementById('sfx-volume').value = settings.sfxVolume * 100;
        document.getElementById('sfx-volume-value').textContent = `${settings.sfxVolume * 100}%`;
        document.getElementById('bgm-volume').value = settings.bgmVolume * 100;
        document.getElementById('bgm-volume-value').textContent = `${settings.bgmVolume * 100}%`;
        document.getElementById('show-fps').checked = settings.showFps;
        document.getElementById('particle-quality').value = settings.particleQuality;
    }

    getSettings() {
        return {
            sfxVolume: document.getElementById('sfx-volume').value / 100,
            bgmVolume: document.getElementById('bgm-volume').value / 100,
            showFps: document.getElementById('show-fps').checked,
            particleQuality: document.getElementById('particle-quality').value
        };
    }
}

class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        
        this.joystick = {
            active: false,
            touchId: null,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            moveX: 0,
            moveY: 0
        };
        
        this.joystickBase = null;
        this.joystickStick = null;
        this.joystickContainer = null;
        this.joystickRadius = 50;
        
        this.setupEventListeners();
        this.setupJoystick();
    }

    setupJoystick() {
        this.joystickBase = document.getElementById('joystick-base');
        this.joystickStick = document.getElementById('joystick-stick');
        this.joystickContainer = document.getElementById('joystick-container');
        
        if (!this.joystickBase || !this.joystickStick) return;
        
        const baseRect = this.joystickBase.getBoundingClientRect();
        this.joystickRadius = baseRect.width / 2 - 25;
        
        this.joystickBase.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.joystickBase.getBoundingClientRect();
            this.joystick.active = true;
            this.joystick.touchId = touch.identifier;
            this.joystick.startX = rect.left + rect.width / 2;
            this.joystick.startY = rect.top + rect.height / 2;
            this.joystick.currentX = touch.clientX;
            this.joystick.currentY = touch.clientY;
            this.updateJoystickPosition();
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!this.joystick.active) return;
            
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                if (touch.identifier === this.joystick.touchId) {
                    this.joystick.currentX = touch.clientX;
                    this.joystick.currentY = touch.clientY;
                    this.updateJoystickPosition();
                    break;
                }
            }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (!this.joystick.active) return;
            
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.joystick.touchId) {
                    this.joystick.active = false;
                    this.joystick.touchId = null;
                    this.joystick.moveX = 0;
                    this.joystick.moveY = 0;
                    this.resetJoystickPosition();
                    break;
                }
            }
        }, { passive: false });

        document.addEventListener('touchcancel', (e) => {
            if (!this.joystick.active) return;
            
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.joystick.touchId) {
                    this.joystick.active = false;
                    this.joystick.touchId = null;
                    this.joystick.moveX = 0;
                    this.joystick.moveY = 0;
                    this.resetJoystickPosition();
                    break;
                }
            }
        }, { passive: false });
    }

    updateJoystickPosition() {
        if (!this.joystick.active) return;
        
        let deltaX = this.joystick.currentX - this.joystick.startX;
        let deltaY = this.joystick.currentY - this.joystick.startY;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = this.joystickRadius;
        
        if (distance > maxDistance) {
            deltaX = (deltaX / distance) * maxDistance;
            deltaY = (deltaY / distance) * maxDistance;
        }
        
        this.joystick.moveX = deltaX / maxDistance;
        this.joystick.moveY = deltaY / maxDistance;
        
        if (this.joystickStick) {
            this.joystickStick.style.transform = `translate(${-deltaX}px, ${-deltaY}px)`;
        }
    }

    resetJoystickPosition() {
        if (this.joystickStick) {
            this.joystickStick.style.transform = 'translate(0px, 0px)';
        }
    }

    getMovementInput() {
        let moveX = 0;
        let moveY = 0;
        
        if (this.joystick.active) {
            moveX = this.joystick.moveX;
            moveY = this.joystick.moveY;
        }
        
        if (this.keys['w'] || this.keys['arrowup']) moveY -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) moveY += 1;
        if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
        if (this.keys['d'] || this.keys['arrowright']) moveX += 1;
        
        return { x: moveX, y: moveY };
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        document.addEventListener('mousemove', (e) => {
            const canvas = document.getElementById('game-canvas');
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        document.addEventListener('mousedown', (e) => {
            this.mouse.down = true;
        });

        document.addEventListener('mouseup', (e) => {
            this.mouse.down = false;
        });

        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                const canvas = document.getElementById('game-canvas');
                const rect = canvas.getBoundingClientRect();
                this.mouse.x = touch.clientX - rect.left;
                this.mouse.y = touch.clientY - rect.top;
                this.mouse.down = true;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                const canvas = document.getElementById('game-canvas');
                const rect = canvas.getBoundingClientRect();
                this.mouse.x = touch.clientX - rect.left;
                this.mouse.y = touch.clientY - rect.top;
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            this.mouse.down = false;
        }, { passive: true });
    }

    isKeyPressed(key) {
        return this.keys[key.toLowerCase()] === true;
    }

    reset() {
        this.keys = {};
        this.mouse.down = false;
        this.joystick.active = false;
        this.joystick.touchId = null;
        this.joystick.moveX = 0;
        this.joystick.moveY = 0;
        this.resetJoystickPosition();
    }
}
