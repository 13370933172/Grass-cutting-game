const LootTypes = {
    exp: {
        id: 'exp',
        color: '#44ff44',
        radius: 6,
        value: 1,
        spawnWeight: 80
    },
    expLarge: {
        id: 'expLarge',
        color: '#00ff00',
        radius: 10,
        value: 5,
        spawnWeight: 15
    },
    health: {
        id: 'health',
        color: '#ff4444',
        radius: 8,
        value: 20,
        spawnWeight: 5
    }
};

class Loot {
    constructor(type, x, y) {
        const definition = LootTypes[type];
        
        this.id = Utils.generateId();
        this.type = type;
        this.x = x;
        this.y = y;
        this.radius = definition.radius;
        this.color = definition.color;
        this.value = definition.value;
        this.active = true;
        
        this.bobOffset = Utils.random(0, Math.PI * 2);
        this.bobSpeed = 3;
        this.bobAmount = 3;
        
        this.sparkleTimer = 0;
        this.collected = false;
        this.collectSpeed = 0;
    }

    update(deltaTime, player, magnetRange, magnetSpeed) {
        if (!this.active) return;

        const dist = Utils.distance(this.x, this.y, player.x, player.y);

        if (this.collected) {
            const angle = Utils.angle(this.x, this.y, player.x, player.y);
            this.collectSpeed += 500 * deltaTime;
            this.x += Math.cos(angle) * this.collectSpeed * deltaTime;
            this.y += Math.sin(angle) * this.collectSpeed * deltaTime;

            if (dist < player.radius + this.radius) {
                this.active = false;
                return this.value;
            }
        } else if (dist < magnetRange) {
            this.collected = true;
        }

        this.sparkleTimer += deltaTime;

        return 0;
    }

    render(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y + Math.sin(this.bobOffset + performance.now() / 200) * this.bobAmount;

        ctx.save();

        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        this.drawShape(ctx, screenX, screenY);
        ctx.fill();

        if (this.sparkleTimer % 0.5 < 0.25) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(screenX - 2, screenY - 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    drawShape(ctx, x, y) {
        switch (this.type) {
            case 'exp':
                ctx.arc(x, y, this.radius, 0, Math.PI * 2);
                break;
            case 'expLarge':
                this.drawDiamond(ctx, x, y, this.radius);
                break;
            case 'health':
                this.drawHeart(ctx, x, y, this.radius);
                break;
            default:
                ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        }
    }

    drawDiamond(ctx, x, y, size) {
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
    }

    drawHeart(ctx, x, y, size) {
        const topY = y - size * 0.4;
        ctx.moveTo(x, y + size * 0.7);
        ctx.bezierCurveTo(x - size, y - size * 0.1, x - size * 0.5, topY - size * 0.5, x, topY);
        ctx.bezierCurveTo(x + size * 0.5, topY - size * 0.5, x + size, y - size * 0.1, x, y + size * 0.7);
    }
}

class LootManager {
    constructor() {
        this.loot = [];
    }

    spawnLoot(x, y, enemy) {
        const baseExp = enemy.exp;
        const spawnCount = Math.ceil(baseExp / 3);

        for (let i = 0; i < spawnCount; i++) {
            const offsetX = Utils.random(-20, 20);
            const offsetY = Utils.random(-20, 20);
            
            const availableTypes = [];
            for (const type in LootTypes) {
                const def = LootTypes[type];
                if (type === 'health' && Utils.random(0, 100) > 20) continue;
                availableTypes.push({ type, weight: def.spawnWeight });
            }

            if (availableTypes.length > 0) {
                const selected = Utils.weightedRandom(availableTypes);
                this.loot.push(new Loot(selected.type, x + offsetX, y + offsetY));
            }
        }
    }

    update(deltaTime, player, magnetRange, magnetSpeed) {
        let totalValue = 0;

        for (const item of this.loot) {
            const value = item.update(deltaTime, player, magnetRange, magnetSpeed);
            if (value > 0) {
                totalValue += value;
                audioManager.playPickup();
            }
        }

        this.loot = this.loot.filter(l => l.active);

        return totalValue;
    }

    render(ctx, camera) {
        for (const item of this.loot) {
            item.render(ctx, camera);
        }
    }

    renderMinimap(ctx, mapWidth, mapHeight, scale) {
        for (const item of this.loot) {
            if (!item.active) continue;

            const x = (item.x / mapWidth) * scale;
            const y = (item.y / mapHeight) * scale;

            ctx.fillStyle = item.color;
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    reset() {
        this.loot = [];
    }
}
