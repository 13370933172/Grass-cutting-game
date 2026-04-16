const EnemyTypes = {
    slime: {
        id: 'slime',
        name: '史莱姆',
        color: '#44ff44',
        radius: 15,
        speed: 40,
        hp: 20,
        damage: 5,
        exp: 2,
        score: 10,
        behavior: 'chase',
        spawnWeight: 40,
        minWave: 1
    },
    skeleton: {
        id: 'skeleton',
        name: '骷髅',
        color: '#ffffff',
        radius: 18,
        speed: 60,
        hp: 35,
        damage: 8,
        exp: 5,
        score: 25,
        behavior: 'chase',
        spawnWeight: 30,
        minWave: 2
    },
    bat: {
        id: 'bat',
        name: '蝙蝠',
        color: '#8844ff',
        radius: 12,
        speed: 100,
        hp: 15,
        damage: 6,
        exp: 3,
        score: 15,
        behavior: 'zigzag',
        spawnWeight: 25,
        minWave: 1
    },
    goblin: {
        id: 'goblin',
        name: '哥布林',
        color: '#ff8844',
        radius: 16,
        speed: 50,
        hp: 25,
        damage: 10,
        exp: 4,
        score: 20,
        behavior: 'ranged',
        attackRange: 150,
        attackCooldown: 2,
        spawnWeight: 20,
        minWave: 3
    },
    boss: {
        id: 'boss',
        name: 'BOSS',
        color: '#ff0000',
        radius: 40,
        speed: 30,
        hp: 500,
        damage: 25,
        exp: 100,
        score: 500,
        behavior: 'boss',
        attackRange: 200,
        attackCooldown: 3,
        spawnWeight: 0,
        minWave: 10
    }
};

class Enemy {
    constructor(type, x, y, waveMultiplier = 1) {
        const definition = EnemyTypes[type];
        
        this.id = Utils.generateId();
        this.type = type;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = definition.radius;
        this.speed = definition.speed;
        this.maxHp = Math.floor(definition.hp * waveMultiplier);
        this.hp = this.maxHp;
        this.damage = Math.floor(definition.damage * waveMultiplier);
        this.exp = Math.floor(definition.exp * Math.sqrt(waveMultiplier));
        this.score = definition.score;
        this.color = definition.color;
        this.behavior = definition.behavior;
        this.active = true;
        
        this.attackRange = definition.attackRange || 0;
        this.attackCooldown = definition.attackCooldown || 0;
        this.attackTimer = 0;
        
        this.zigzagTimer = 0;
        this.zigzagDirection = 1;
        
        this.hitFlash = 0;
        this.knockbackX = 0;
        this.knockbackY = 0;
        this.knockbackDecay = 0.9;
        
        this.animationTimer = 0;
        this.animationFrame = 0;
    }

    update(deltaTime, player, map, projectilePool) {
        if (!this.active) return;

        this.animationTimer += deltaTime;
        if (this.animationTimer >= 0.2) {
            this.animationTimer = 0;
            this.animationFrame = (this.animationFrame + 1) % 4;
        }

        if (this.hitFlash > 0) {
            this.hitFlash -= deltaTime;
        }

        this.x += this.knockbackX;
        this.y += this.knockbackY;
        this.knockbackX *= this.knockbackDecay;
        this.knockbackY *= this.knockbackDecay;

        switch (this.behavior) {
            case 'chase':
                this.behaviorChase(deltaTime, player);
                break;
            case 'zigzag':
                this.behaviorZigzag(deltaTime, player);
                break;
            case 'ranged':
                this.behaviorRanged(deltaTime, player, projectilePool);
                break;
            case 'boss':
                this.behaviorBoss(deltaTime, player, projectilePool);
                break;
        }

        const padding = this.radius;
        this.x = Utils.clamp(this.x, padding, map.width - padding);
        this.y = Utils.clamp(this.y, padding, map.height - padding);
    }

    behaviorChase(deltaTime, player) {
        const angle = Utils.angle(this.x, this.y, player.x, player.y);
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;

        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
    }

    behaviorZigzag(deltaTime, player) {
        this.zigzagTimer += deltaTime;
        if (this.zigzagTimer >= 0.5) {
            this.zigzagTimer = 0;
            this.zigzagDirection *= -1;
        }

        const angle = Utils.angle(this.x, this.y, player.x, player.y);
        const perpAngle = angle + Math.PI / 2;

        this.vx = Math.cos(angle) * this.speed * 0.7 + Math.cos(perpAngle) * this.speed * 0.5 * this.zigzagDirection;
        this.vy = Math.sin(angle) * this.speed * 0.7 + Math.sin(perpAngle) * this.speed * 0.5 * this.zigzagDirection;

        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
    }

    behaviorRanged(deltaTime, player, projectilePool) {
        const dist = Utils.distance(this.x, this.y, player.x, player.y);

        if (dist > this.attackRange) {
            const angle = Utils.angle(this.x, this.y, player.x, player.y);
            this.vx = Math.cos(angle) * this.speed;
            this.vy = Math.sin(angle) * this.speed;
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
        } else {
            this.attackTimer += deltaTime;
            if (this.attackTimer >= this.attackCooldown) {
                this.attackTimer = 0;
                this.shootProjectile(player, projectilePool);
            }
        }
    }

    behaviorBoss(deltaTime, player, projectilePool) {
        const dist = Utils.distance(this.x, this.y, player.x, player.y);

        const angle = Utils.angle(this.x, this.y, player.x, player.y);
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        this.attackTimer += deltaTime;
        if (this.attackTimer >= this.attackCooldown) {
            this.attackTimer = 0;
            this.bossAttack(player, projectilePool);
        }
    }

    shootProjectile(player, projectilePool) {
        const angle = Utils.angle(this.x, this.y, player.x, player.y);
        
        projectilePool.create({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * 150,
            vy: Math.sin(angle) * 150,
            damage: this.damage,
            speed: 150,
            angle: angle,
            range: 300,
            traveled: 0,
            radius: 8,
            color: '#ff4444',
            owner: 'enemy',
            pierce: 0,
            active: true,
            type: 'bullet'
        });
    }

    bossAttack(player, projectilePool) {
        const projectileCount = 8;
        const angleStep = (Math.PI * 2) / projectileCount;

        for (let i = 0; i < projectileCount; i++) {
            const angle = i * angleStep;
            
            projectilePool.create({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * 120,
                vy: Math.sin(angle) * 120,
                damage: this.damage,
                speed: 120,
                angle: angle,
                range: 250,
                traveled: 0,
                radius: 12,
                color: '#ff0000',
                owner: 'enemy',
                pierce: 0,
                active: true,
                type: 'bullet'
            });
        }
    }

    takeDamage(damage, source) {
        this.hp -= damage;
        this.hitFlash = 0.1;

        const angle = Utils.angle(source.x, source.y, this.x, this.y);
        const knockbackStrength = 20;
        this.knockbackX = Math.cos(angle) * knockbackStrength;
        this.knockbackY = Math.sin(angle) * knockbackStrength;

        if (this.hp <= 0) {
            this.active = false;
            return true;
        }
        return false;
    }

    render(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();

        if (this.hitFlash > 0) {
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = this.color;
        }

        switch (this.type) {
            case 'slime':
                this.renderSlime(ctx, screenX, screenY);
                break;
            case 'skeleton':
                this.renderSkeleton(ctx, screenX, screenY);
                break;
            case 'bat':
                this.renderBat(ctx, screenX, screenY);
                break;
            case 'goblin':
                this.renderGoblin(ctx, screenX, screenY);
                break;
            case 'boss':
                this.renderBoss(ctx, screenX, screenY);
                break;
            default:
                ctx.beginPath();
                ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
                ctx.fill();
        }

        if (this.hp < this.maxHp) {
            const barWidth = this.radius * 2;
            const barHeight = 4;
            const barX = screenX - barWidth / 2;
            const barY = screenY - this.radius - 10;

            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            const hpPercent = this.hp / this.maxHp;
            ctx.fillStyle = hpPercent > 0.5 ? '#44ff44' : hpPercent > 0.25 ? '#ffff44' : '#ff4444';
            ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
        }

        ctx.restore();
    }

    renderSlime(ctx, x, y) {
        const bounce = Math.sin(this.animationTimer * 10) * 2;
        
        ctx.beginPath();
        ctx.ellipse(x, y + bounce, this.radius, this.radius * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x - 4, y - 4 + bounce, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x - 4, y + bounce, 2, 0, Math.PI * 2);
        ctx.arc(x + 4, y + bounce, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    renderSkeleton(ctx, x, y) {
        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(x - 5, y - 3, 4, 0, Math.PI * 2);
        ctx.arc(x + 5, y - 3, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(x - 5, y + 5);
        ctx.lineTo(x + 5, y + 5);
        ctx.stroke();
    }

    renderBat(ctx, x, y) {
        const wingAngle = Math.sin(this.animationTimer * 15) * 0.5;

        ctx.beginPath();
        ctx.arc(x, y, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(x, y);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-this.radius * Math.cos(wingAngle), -this.radius * 0.5);
        ctx.lineTo(-this.radius * 1.2, 0);
        ctx.lineTo(-this.radius * Math.cos(wingAngle), this.radius * 0.3);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.radius * Math.cos(wingAngle), -this.radius * 0.5);
        ctx.lineTo(this.radius * 1.2, 0);
        ctx.lineTo(this.radius * Math.cos(wingAngle), this.radius * 0.3);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(x - 3, y - 2, 2, 0, Math.PI * 2);
        ctx.arc(x + 3, y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    renderGoblin(ctx, x, y) {
        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x - 8, y - this.radius);
        ctx.lineTo(x - 5, y - this.radius - 8);
        ctx.lineTo(x - 2, y - this.radius);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + 2, y - this.radius);
        ctx.lineTo(x + 5, y - this.radius - 8);
        ctx.lineTo(x + 8, y - this.radius);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x - 4, y - 2, 3, 0, Math.PI * 2);
        ctx.arc(x + 4, y - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(x, y + 5, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    renderBoss(ctx, x, y) {
        const pulse = 1 + Math.sin(this.animationTimer * 5) * 0.1;
        const currentRadius = this.radius * pulse;

        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, currentRadius * 1.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : this.color;
        ctx.beginPath();
        ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#880000';
        ctx.beginPath();
        ctx.arc(x, y, currentRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(x - 10, y - 8, 8, 0, Math.PI * 2);
        ctx.arc(x + 10, y - 8, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x - 10, y - 8, 4, 0, Math.PI * 2);
        ctx.arc(x + 10, y - 8, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 15, y + 10);
        ctx.lineTo(x + 15, y + 10);
        ctx.stroke();
    }

    renderMinimap(ctx, mapWidth, mapHeight, scale) {
        if (!this.active) return;

        const x = (this.x / mapWidth) * scale;
        const y = (this.y / mapHeight) * scale;

        ctx.fillStyle = this.type === 'boss' ? '#ff0000' : '#ff4444';
        ctx.beginPath();
        ctx.arc(x, y, this.type === 'boss' ? 5 : 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

class EnemyManager {
    constructor() {
        this.enemies = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1;
        this.wave = 1;
        this.waveTimer = 0;
        this.waveDuration = 30;
        this.bossSpawned = false;
    }

    update(deltaTime, player, map, projectilePool) {
        this.spawnTimer += deltaTime;
        this.waveTimer += deltaTime;

        if (this.waveTimer >= this.waveDuration) {
            this.waveTimer = 0;
            this.wave++;
            this.spawnInterval = Math.max(0.5, this.spawnInterval - 0.1);
        }

        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnEnemy(player, map);
        }

        if (this.wave >= 10 && !this.bossSpawned && this.waveTimer < 1) {
            this.spawnBoss(player, map);
            this.bossSpawned = true;
        }

        for (const enemy of this.enemies) {
            enemy.update(deltaTime, player, map, projectilePool);
        }

        this.enemies = this.enemies.filter(e => e.active);
    }

    spawnEnemy(player, map) {
        const availableTypes = [];
        for (const type in EnemyTypes) {
            const def = EnemyTypes[type];
            if (def.minWave <= this.wave && def.spawnWeight > 0) {
                availableTypes.push({ type, weight: def.spawnWeight });
            }
        }

        if (availableTypes.length === 0) return;

        const selected = Utils.weightedRandom(availableTypes);
        const pos = this.getSpawnPosition(player, map);
        const waveMultiplier = 1 + (this.wave - 1) * 0.15;

        this.enemies.push(new Enemy(selected.type, pos.x, pos.y, waveMultiplier));
    }

    spawnBoss(player, map) {
        const pos = this.getSpawnPosition(player, map);
        const waveMultiplier = 1 + (this.wave - 1) * 0.2;
        
        this.enemies.push(new Enemy('boss', pos.x, pos.y, waveMultiplier));
        audioManager.playBossSpawn();
    }

    getSpawnPosition(player, map) {
        const minDist = 200;
        const maxDist = 400;
        const angle = Utils.random(0, Math.PI * 2);
        const dist = Utils.random(minDist, maxDist);

        let x = player.x + Math.cos(angle) * dist;
        let y = player.y + Math.sin(angle) * dist;

        x = Utils.clamp(x, 50, map.width - 50);
        y = Utils.clamp(y, 50, map.height - 50);

        return { x, y };
    }

    getActiveEnemies() {
        return this.enemies.filter(e => e.active);
    }

    render(ctx, camera) {
        for (const enemy of this.enemies) {
            enemy.render(ctx, camera);
        }
    }

    renderMinimap(ctx, mapWidth, mapHeight, scale) {
        for (const enemy of this.enemies) {
            enemy.renderMinimap(ctx, mapWidth, mapHeight, scale);
        }
    }

    reset() {
        this.enemies = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1;
        this.wave = 1;
        this.waveTimer = 0;
        this.bossSpawned = false;
    }
}
