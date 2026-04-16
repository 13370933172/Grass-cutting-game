class ObjectPool {
    constructor(createFn, resetFn, initialSize = 10) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = [];
        
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }

    get() {
        let obj;
        if (this.pool.length > 0) {
            obj = this.pool.pop();
        } else {
            obj = this.createFn();
        }
        this.active.push(obj);
        return obj;
    }

    release(obj) {
        const index = this.active.indexOf(obj);
        if (index !== -1) {
            this.active.splice(index, 1);
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }

    releaseAll() {
        while (this.active.length > 0) {
            const obj = this.active.pop();
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }

    getActiveCount() {
        return this.active.length;
    }

    getPoolCount() {
        return this.pool.length;
    }

    forEach(callback) {
        for (let i = this.active.length - 1; i >= 0; i--) {
            callback(this.active[i], i);
        }
    }

    filter(callback) {
        return this.active.filter(callback);
    }

    find(callback) {
        return this.active.find(callback);
    }
}

class ParticlePool extends ObjectPool {
    constructor(initialSize = 100) {
        super(
            () => ({
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                life: 0,
                maxLife: 0,
                size: 0,
                color: '#fff',
                alpha: 1,
                type: 'circle',
                gravity: 0,
                friction: 1,
                active: false
            }),
            (p) => {
                p.active = false;
                p.life = 0;
            },
            initialSize
        );
    }

    create(options) {
        const particle = this.get();
        Object.assign(particle, options, { active: true });
        return particle;
    }

    update(deltaTime) {
        this.forEach((particle, index) => {
            if (!particle.active) return;

            particle.life -= deltaTime;
            if (particle.life <= 0) {
                this.release(particle);
                return;
            }

            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            particle.vy += particle.gravity * deltaTime;
            particle.vx *= particle.friction;
            particle.vy *= particle.friction;
            particle.alpha = particle.life / particle.maxLife;
        });
    }

    render(ctx, camera) {
        this.forEach(particle => {
            if (!particle.active) return;

            ctx.save();
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;

            const screenX = particle.x - camera.x;
            const screenY = particle.y - camera.y;

            switch (particle.type) {
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'square':
                    ctx.fillRect(
                        screenX - particle.size / 2,
                        screenY - particle.size / 2,
                        particle.size,
                        particle.size
                    );
                    break;
                case 'star':
                    this.drawStar(ctx, screenX, screenY, particle.size);
                    break;
            }

            ctx.restore();
        });
    }

    drawStar(ctx, x, y, size) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const px = x + Math.cos(angle) * size;
            const py = y + Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }
}

class ProjectilePool extends ObjectPool {
    constructor(initialSize = 50) {
        super(
            () => ({
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                damage: 0,
                speed: 0,
                angle: 0,
                range: 0,
                traveled: 0,
                radius: 5,
                color: '#fff',
                owner: null,
                pierce: 0,
                hitEnemies: new Set(),
                active: false,
                type: 'bullet',
                homing: false,
                homingStrength: 0,
                target: null
            }),
            (p) => {
                p.active = false;
                p.traveled = 0;
                p.hitEnemies.clear();
            },
            initialSize
        );
    }

    create(options) {
        const projectile = this.get();
        Object.assign(projectile, options, { active: true });
        return projectile;
    }

    update(deltaTime, enemies) {
        this.forEach((projectile, index) => {
            if (!projectile.active) return;

            const moveX = projectile.vx * deltaTime;
            const moveY = projectile.vy * deltaTime;
            projectile.x += moveX;
            projectile.y += moveY;
            projectile.traveled += Math.sqrt(moveX * moveX + moveY * moveY);

            if (projectile.homing && projectile.target && projectile.target.active) {
                const targetAngle = Utils.angle(projectile.x, projectile.y, projectile.target.x, projectile.target.y);
                const angleDiff = Utils.normalizeAngle(targetAngle - projectile.angle);
                const turnAmount = Utils.clamp(angleDiff, -projectile.homingStrength, projectile.homingStrength) * deltaTime;
                projectile.angle += turnAmount;
                projectile.vx = Math.cos(projectile.angle) * projectile.speed;
                projectile.vy = Math.sin(projectile.angle) * projectile.speed;
            }

            if (projectile.traveled >= projectile.range) {
                this.release(projectile);
            }
        });
    }

    render(ctx, camera) {
        this.forEach(projectile => {
            if (!projectile.active) return;

            const screenX = projectile.x - camera.x;
            const screenY = projectile.y - camera.y;

            ctx.save();
            ctx.fillStyle = projectile.color;
            ctx.shadowColor = projectile.color;
            ctx.shadowBlur = 10;

            switch (projectile.type) {
                case 'bullet':
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, projectile.radius, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'arrow':
                    ctx.translate(screenX, screenY);
                    ctx.rotate(projectile.angle);
                    ctx.beginPath();
                    ctx.moveTo(projectile.radius * 2, 0);
                    ctx.lineTo(-projectile.radius, -projectile.radius / 2);
                    ctx.lineTo(-projectile.radius, projectile.radius / 2);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 'fireball':
                    const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, projectile.radius * 2);
                    gradient.addColorStop(0, '#ffff00');
                    gradient.addColorStop(0.5, '#ff6600');
                    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, projectile.radius * 2, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'lightning':
                    ctx.strokeStyle = '#00ffff';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(screenX - projectile.radius, screenY);
                    for (let i = 0; i < 5; i++) {
                        const offsetX = Utils.random(-10, 10);
                        const offsetY = Utils.random(-10, 10);
                        ctx.lineTo(screenX + offsetX, screenY + offsetY);
                    }
                    ctx.stroke();
                    break;
            }

            ctx.restore();
        });
    }
}
