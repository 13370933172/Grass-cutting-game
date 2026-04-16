class Weapon {
    constructor(skillId, skillManager, projectilePool, particlePool) {
        this.skillId = skillId;
        this.skillManager = skillManager;
        this.projectilePool = projectilePool;
        this.particlePool = particlePool;
        this.cooldownTimer = 0;
        this.definition = SkillDefinitions[skillId];
        this.arrowQueue = [];
    }

    update(deltaTime, player, enemies) {
        this.cooldownTimer -= deltaTime;
        
        this.updateArrowQueue(deltaTime, player);
        
        if (this.cooldownTimer <= 0) {
            const stats = this.skillManager.getSkillStats(this.skillId);
            if (stats) {
                this.fire(player, enemies, stats);
                this.cooldownTimer = stats.cooldown;
            }
        }
    }

    updateArrowQueue(deltaTime, player) {
        for (let i = this.arrowQueue.length - 1; i >= 0; i--) {
            const arrow = this.arrowQueue[i];
            arrow.delay -= deltaTime;
            
            if (arrow.delay <= 0) {
                this.projectilePool.create(arrow.config);
                this.arrowQueue.splice(i, 1);
            }
        }
    }

    fire(player, enemies, stats) {
        switch (this.skillId) {
            case 'sword':
                this.fireSword(player, enemies, stats);
                break;
            case 'fireball':
                this.fireFireball(player, enemies, stats);
                break;
            case 'lightning':
                this.fireLightning(player, enemies, stats);
                break;
            case 'areaAttack':
                this.fireAreaAttack(player, enemies, stats);
                break;
            case 'arrowRain':
                this.fireArrowRain(player, enemies, stats);
                break;
        }
    }

    fireSword(player, enemies, stats) {
        const nearbyEnemies = enemies.filter(e => 
            e.active && Utils.distance(player.x, player.y, e.x, e.y) <= stats.range
        );

        let baseAngle = player.facingAngle;
        if (nearbyEnemies.length > 0) {
            const nearestEnemy = nearbyEnemies.reduce((nearest, enemy) => {
                const dist = Utils.distance(player.x, player.y, enemy.x, enemy.y);
                const nearestDist = nearest ? Utils.distance(player.x, player.y, nearest.x, nearest.y) : Infinity;
                return dist < nearestDist ? enemy : nearest;
            }, null);
            
            if (nearestEnemy) {
                baseAngle = Utils.angle(player.x, player.y, nearestEnemy.x, nearestEnemy.y);
            }
        }

        const angleStep = (Math.PI * 2) / stats.projectileCount;
        const spreadAngle = Math.PI / 4;
        
        for (let i = 0; i < stats.projectileCount; i++) {
            const angleOffset = (i - (stats.projectileCount - 1) / 2) * (spreadAngle / Math.max(1, stats.projectileCount - 1));
            const angle = baseAngle + angleOffset;
            
            this.projectilePool.create({
                x: player.x,
                y: player.y,
                vx: Math.cos(angle) * 300,
                vy: Math.sin(angle) * 300,
                damage: stats.damage,
                speed: 300,
                angle: angle,
                range: stats.range,
                traveled: 0,
                radius: 15,
                color: '#00ffff',
                owner: player,
                pierce: 3,
                active: true,
                type: 'bullet'
            });
        }

        for (let i = 0; i < 10; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const dist = Utils.random(20, stats.range * 0.5);
            this.particlePool.create({
                x: player.x + Math.cos(angle) * dist,
                y: player.y + Math.sin(angle) * dist,
                vx: Utils.random(-50, 50),
                vy: Utils.random(-50, 50),
                life: 0.3,
                maxLife: 0.3,
                size: Utils.random(3, 8),
                color: '#00ffff',
                type: 'circle'
            });
        }
    }

    fireFireball(player, enemies, stats) {
        const targetEnemy = this.findNearestEnemy(player, enemies, stats.range);
        
        for (let i = 0; i < stats.projectileCount; i++) {
            const spreadAngle = (i - (stats.projectileCount - 1) / 2) * 0.3;
            const baseAngle = targetEnemy 
                ? Utils.angle(player.x, player.y, targetEnemy.x, targetEnemy.y)
                : player.facingAngle;
            const angle = baseAngle + spreadAngle;

            this.projectilePool.create({
                x: player.x,
                y: player.y,
                vx: Math.cos(angle) * 200,
                vy: Math.sin(angle) * 200,
                damage: stats.damage,
                speed: 200,
                angle: angle,
                range: stats.range,
                traveled: 0,
                radius: 10,
                color: '#ff6600',
                owner: player,
                pierce: stats.pierce,
                active: true,
                type: 'fireball',
                homing: true,
                homingStrength: 3,
                target: targetEnemy
            });
        }
    }

    fireLightning(player, enemies, stats) {
        const nearbyEnemies = enemies.filter(e => 
            e.active && Utils.distance(player.x, player.y, e.x, e.y) <= stats.range
        ).slice(0, stats.chainCount);

        if (nearbyEnemies.length === 0) return;

        let lastX = player.x;
        let lastY = player.y;

        for (const enemy of nearbyEnemies) {
            const angle = Utils.angle(lastX, lastY, enemy.x, enemy.y);
            
            this.projectilePool.create({
                x: lastX,
                y: lastY,
                vx: Math.cos(angle) * 500,
                vy: Math.sin(angle) * 500,
                damage: stats.damage,
                speed: 500,
                angle: angle,
                range: Utils.distance(lastX, lastY, enemy.x, enemy.y) + 10,
                traveled: 0,
                radius: 5,
                color: '#00ffff',
                owner: player,
                pierce: 999,
                active: true,
                type: 'lightning',
                targetEnemy: enemy
            });

            lastX = enemy.x;
            lastY = enemy.y;

            for (let i = 0; i < 5; i++) {
                this.particlePool.create({
                    x: enemy.x + Utils.random(-10, 10),
                    y: enemy.y + Utils.random(-10, 10),
                    vx: Utils.random(-100, 100),
                    vy: Utils.random(-100, 100),
                    life: 0.2,
                    maxLife: 0.2,
                    size: Utils.random(2, 5),
                    color: '#00ffff',
                    type: 'circle'
                });
            }
        }
    }

    fireAreaAttack(player, enemies, stats) {
        const nearbyEnemies = enemies.filter(e => 
            e.active && Utils.distance(player.x, player.y, e.x, e.y) <= stats.range
        );

        for (const enemy of nearbyEnemies) {
            enemy.takeDamage(stats.damage, player);
        }

        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            const dist = stats.range;
            this.particlePool.create({
                x: player.x + Math.cos(angle) * dist,
                y: player.y + Math.sin(angle) * dist,
                vx: Math.cos(angle) * 50,
                vy: Math.sin(angle) * 50,
                life: 0.5,
                maxLife: 0.5,
                size: 8,
                color: '#ff00ff',
                type: 'circle'
            });
        }

        for (let i = 0; i < 20; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const dist = Utils.random(0, stats.range);
            this.particlePool.create({
                x: player.x + Math.cos(angle) * dist,
                y: player.y + Math.sin(angle) * dist,
                vx: Utils.random(-30, 30),
                vy: Utils.random(-30, 30),
                life: 0.4,
                maxLife: 0.4,
                size: Utils.random(3, 7),
                color: '#ff66ff',
                type: 'circle'
            });
        }
    }

    fireArrowRain(player, enemies, stats) {
        const targetX = player.x;
        const targetY = player.y;
        const pool = this.projectilePool;

        for (let i = 0; i < stats.arrowCount; i++) {
            const offsetX = Utils.random(-stats.range, stats.range);
            const offsetY = Utils.random(-stats.range, stats.range);
            const angle = Math.PI / 2 + Utils.random(-0.3, 0.3);

            this.arrowQueue.push({
                delay: i * 0.03,
                config: {
                    x: targetX + offsetX,
                    y: targetY + offsetY - 300,
                    vx: Math.cos(angle) * 50,
                    vy: Math.sin(angle) * 400,
                    damage: stats.damage,
                    speed: 400,
                    angle: angle,
                    range: 400,
                    traveled: 0,
                    radius: 5,
                    color: '#ffff00',
                    owner: player,
                    pierce: 1,
                    active: true,
                    type: 'arrow'
                }
            });
        }

        for (let i = 0; i < 15; i++) {
            this.particlePool.create({
                x: targetX + Utils.random(-stats.range, stats.range),
                y: targetY + Utils.random(-stats.range, stats.range),
                vx: 0,
                vy: Utils.random(50, 150),
                life: 0.5,
                maxLife: 0.5,
                size: Utils.random(2, 4),
                color: '#ffff00',
                type: 'circle',
                gravity: 200
            });
        }
    }

    findNearestEnemy(player, enemies, maxRange) {
        let nearest = null;
        let nearestDist = maxRange;

        for (const enemy of enemies) {
            if (!enemy.active) continue;
            const dist = Utils.distance(player.x, player.y, enemy.x, enemy.y);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        }

        return nearest;
    }
}

class WeaponManager {
    constructor(skillManager, projectilePool, particlePool) {
        this.skillManager = skillManager;
        this.projectilePool = projectilePool;
        this.particlePool = particlePool;
        this.weapons = new Map();
    }

    update(deltaTime, player, enemies) {
        const activeWeapons = this.skillManager.getActiveWeapons();
        
        for (const weaponData of activeWeapons) {
            if (!this.weapons.has(weaponData.id)) {
                this.weapons.set(weaponData.id, new Weapon(
                    weaponData.id,
                    this.skillManager,
                    this.projectilePool,
                    this.particlePool
                ));
            }
        }

        for (const [id, weapon] of this.weapons) {
            weapon.update(deltaTime, player, enemies);
        }
    }

    reset() {
        this.weapons.clear();
    }
}
