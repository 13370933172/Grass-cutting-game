class ParticleSystem {
    constructor(pool) {
        this.pool = pool;
    }

    emit(x, y, count, options = {}) {
        for (let i = 0; i < count; i++) {
            const angle = options.angle !== undefined ? options.angle : Utils.random(0, Math.PI * 2);
            const speed = options.speed !== undefined ? Utils.random(options.speed * 0.5, options.speed * 1.5) : Utils.random(50, 150);
            
            this.pool.create({
                x: x + Utils.random(-options.spread || 5, options.spread || 5),
                y: y + Utils.random(-options.spread || 5, options.spread || 5),
                vx: Math.cos(angle) * speed + (options.vx || 0),
                vy: Math.sin(angle) * speed + (options.vy || 0),
                life: options.life || Utils.random(0.3, 0.8),
                maxLife: options.life || Utils.random(0.3, 0.8),
                size: options.size || Utils.random(2, 6),
                color: options.color || '#ffffff',
                type: options.type || 'circle',
                gravity: options.gravity || 0,
                friction: options.friction || 0.98
            });
        }
    }

    emitExplosion(x, y, color = '#ff6600', count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = Utils.random(100, 200);
            
            this.pool.create({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: Utils.random(0.3, 0.6),
                maxLife: 0.6,
                size: Utils.random(3, 8),
                color: color,
                type: 'circle',
                gravity: 50,
                friction: 0.95
            });
        }
    }

    emitTrail(x, y, color = '#4a9eff', count = 3) {
        for (let i = 0; i < count; i++) {
            this.pool.create({
                x: x + Utils.random(-5, 5),
                y: y + Utils.random(-5, 5),
                vx: Utils.random(-20, 20),
                vy: Utils.random(-20, 20),
                life: Utils.random(0.2, 0.4),
                maxLife: 0.4,
                size: Utils.random(2, 5),
                color: color,
                type: 'circle',
                gravity: 0,
                friction: 0.9
            });
        }
    }

    emitDamage(x, y, color = '#ff0000', count = 8) {
        for (let i = 0; i < count; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(50, 100);
            
            this.pool.create({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: Utils.random(0.2, 0.4),
                maxLife: 0.4,
                size: Utils.random(2, 4),
                color: color,
                type: 'circle',
                gravity: 100,
                friction: 0.92
            });
        }
    }

    emitHeal(x, y, count = 10) {
        for (let i = 0; i < count; i++) {
            this.pool.create({
                x: x + Utils.random(-20, 20),
                y: y + Utils.random(-20, 20),
                vx: Utils.random(-10, 10),
                vy: Utils.random(-80, -40),
                life: Utils.random(0.5, 1),
                maxLife: 1,
                size: Utils.random(3, 6),
                color: '#44ff44',
                type: 'circle',
                gravity: -20,
                friction: 0.98
            });
        }
    }

    emitLevelUp(x, y) {
        const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'];
        
        for (let i = 0; i < 30; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(100, 250);
            
            this.pool.create({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: Utils.random(0.5, 1.2),
                maxLife: 1.2,
                size: Utils.random(4, 10),
                color: Utils.randomChoice(colors),
                type: 'star',
                gravity: 0,
                friction: 0.96
            });
        }
    }

    emitDeath(x, y, color = '#ff4444') {
        this.emitExplosion(x, y, color, 30);
        
        for (let i = 0; i < 10; i++) {
            this.pool.create({
                x: x,
                y: y,
                vx: Utils.random(-50, 50),
                vy: Utils.random(-100, -50),
                life: Utils.random(0.8, 1.5),
                maxLife: 1.5,
                size: Utils.random(5, 12),
                color: color,
                type: 'circle',
                gravity: 150,
                friction: 0.95
            });
        }
    }
}
