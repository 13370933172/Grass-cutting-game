class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 20;
        this.speed = 150;
        this.facingAngle = 0;
        
        this.maxHp = 100;
        this.hp = 100;
        this.level = 1;
        this.exp = 0;
        this.expToLevel = 10;
        
        this.invincibleTime = 0;
        this.invincibleDuration = 1;
        
        this.skillManager = new SkillManager();
        this.skillManager.upgradeSkill('sword');
        this.kills = 0;
        this.score = 0;
        
        this.shieldHp = 0;
        this.shieldMaxHp = 0;
        this.shieldCooldown = 0;
        this.shieldRegenTimer = 0;
        
        this.regenTimer = 0;
        
        this.animationFrame = 0;
        this.animationTimer = 0;
    }

    update(deltaTime, input, map, passiveBonuses) {
        const movement = input.getMovementInput();
        let moveX = movement.x;
        let moveY = movement.y;

        const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
        if (magnitude > 0) {
            moveX /= magnitude;
            moveY /= magnitude;
            this.facingAngle = Math.atan2(moveY, moveX);
        }

        const currentSpeed = this.speed * (passiveBonuses.speedMultiplier || 1);
        this.vx = moveX * currentSpeed;
        this.vy = moveY * currentSpeed;

        const newX = this.x + this.vx * deltaTime;
        const newY = this.y + this.vy * deltaTime;

        const padding = this.radius + 10;
        this.x = Utils.clamp(newX, padding, map.width - padding);
        this.y = Utils.clamp(newY, padding, map.height - padding);

        if (this.invincibleTime > 0) {
            this.invincibleTime -= deltaTime;
        }

        if (passiveBonuses.regenRate > 0) {
            this.regenTimer += deltaTime;
            if (this.regenTimer >= 1) {
                this.regenTimer = 0;
                this.hp = Math.min(this.maxHp, this.hp + passiveBonuses.regenRate);
            }
        }

        if (this.shieldMaxHp > 0) {
            if (this.shieldHp < this.shieldMaxHp) {
                this.shieldRegenTimer += deltaTime;
                if (this.shieldRegenTimer >= 1) {
                    this.shieldRegenTimer = 0;
                    this.shieldHp = Math.min(this.shieldMaxHp, this.shieldHp + 1);
                }
            }
        }

        this.animationTimer += deltaTime;
        if (this.animationTimer >= 0.15) {
            this.animationTimer = 0;
            this.animationFrame = (this.animationFrame + 1) % 4;
        }
    }

    takeDamage(damage) {
        if (this.invincibleTime > 0) return false;

        if (this.shieldHp > 0) {
            const absorbed = Math.min(this.shieldHp, damage);
            this.shieldHp -= absorbed;
            damage -= absorbed;
            
            if (damage <= 0) {
                this.invincibleTime = 0.2;
                return true;
            }
        }

        this.hp -= damage;
        this.invincibleTime = this.invincibleDuration;

        if (this.hp <= 0) {
            this.hp = 0;
            return true;
        }

        return true;
    }

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    addExp(amount, passiveBonuses) {
        const magnetSpeed = passiveBonuses.magnetSpeed || 1;
        this.exp += amount * magnetSpeed;
        
        while (this.exp >= this.expToLevel) {
            this.exp -= this.expToLevel;
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.expToLevel = Math.floor(this.expToLevel * 1.5);
        this.maxHp += 10;
        this.hp = this.maxHp;
        
        audioManager.playLevelUp();
    }

    updateShield(passiveBonuses) {
        if (passiveBonuses.shieldHp > 0) {
            this.shieldMaxHp = passiveBonuses.shieldHp;
            if (this.shieldHp === 0) {
                this.shieldHp = this.shieldMaxHp;
            }
        }
    }

    render(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();

        if (this.invincibleTime > 0) {
            ctx.globalAlpha = 0.5 + Math.sin(this.invincibleTime * 20) * 0.3;
        }

        ctx.fillStyle = '#4a9eff';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#6ab7ff';
        ctx.beginPath();
        ctx.arc(screenX - 5, screenY - 5, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2a7edf';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        const eyeOffset = 5;
        const eyeAngle = this.facingAngle;
        const eyeX = screenX + Math.cos(eyeAngle) * eyeOffset;
        const eyeY = screenY + Math.sin(eyeAngle) * eyeOffset;

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(eyeX - 4, eyeY - 2, 4, 0, Math.PI * 2);
        ctx.arc(eyeX + 4, eyeY - 2, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(eyeX - 4, eyeY - 2, 2, 0, Math.PI * 2);
        ctx.arc(eyeX + 4, eyeY - 2, 2, 0, Math.PI * 2);
        ctx.fill();

        if (this.shieldHp > 0) {
            const shieldAlpha = this.shieldHp / this.shieldMaxHp * 0.5;
            ctx.strokeStyle = `rgba(0, 255, 255, ${shieldAlpha})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    renderMinimap(ctx, mapWidth, mapHeight, scale) {
        const x = (this.x / mapWidth) * scale;
        const y = (this.y / mapHeight) * scale;

        ctx.fillStyle = '#4a9eff';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.stroke();
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.hp = this.maxHp;
        this.level = 1;
        this.exp = 0;
        this.expToLevel = 10;
        this.invincibleTime = 0;
        this.skillManager = new SkillManager();
        this.skillManager.upgradeSkill('sword');
        this.kills = 0;
        this.score = 0;
        this.shieldHp = 0;
        this.shieldMaxHp = 0;
        this.shieldCooldown = 0;
        this.shieldRegenTimer = 0;
        this.regenTimer = 0;
    }
}
