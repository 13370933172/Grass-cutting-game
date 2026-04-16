const MapThemes = {
    forest: {
        id: 'forest',
        name: '神秘森林',
        bgColor: '#1a3d1a',
        groundColor: '#2d5a2d',
        decorationColor: '#1a4d1a',
        obstacleColor: '#4a2d1a'
    },
    desert: {
        id: 'desert',
        name: '荒芜沙漠',
        bgColor: '#c4a35a',
        groundColor: '#d4b36a',
        decorationColor: '#a08050',
        obstacleColor: '#8b7355'
    },
    dungeon: {
        id: 'dungeon',
        name: '幽暗地牢',
        bgColor: '#1a1a2e',
        groundColor: '#2a2a3e',
        decorationColor: '#3a3a4e',
        obstacleColor: '#4a4a5e'
    }
};

class GameMap {
    constructor(width = 2000, height = 2000, theme = 'forest') {
        this.width = width;
        this.height = height;
        this.theme = MapThemes[theme];
        this.decorations = [];
        this.obstacles = [];
        
        this.generateDecorations();
        this.generateObstacles();
    }

    generateDecorations() {
        const count = Math.floor((this.width * this.height) / 10000);
        
        for (let i = 0; i < count; i++) {
            this.decorations.push({
                x: Utils.random(50, this.width - 50),
                y: Utils.random(50, this.height - 50),
                type: Utils.randomChoice(['tree', 'bush', 'rock', 'flower']),
                size: Utils.random(10, 30),
                rotation: Utils.random(0, Math.PI * 2)
            });
        }
    }

    generateObstacles() {
        const count = Math.floor((this.width * this.height) / 50000);
        
        for (let i = 0; i < count; i++) {
            this.obstacles.push({
                x: Utils.random(100, this.width - 100),
                y: Utils.random(100, this.height - 100),
                radius: Utils.random(30, 60)
            });
        }
    }

    render(ctx, camera, canvasWidth, canvasHeight) {
        ctx.fillStyle = this.theme.bgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const gridSize = 100;
        ctx.strokeStyle = this.theme.groundColor;
        ctx.lineWidth = 1;

        const startX = Math.floor(camera.x / gridSize) * gridSize;
        const startY = Math.floor(camera.y / gridSize) * gridSize;

        for (let x = startX; x < camera.x + canvasWidth + gridSize; x += gridSize) {
            const screenX = x - camera.x;
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, canvasHeight);
            ctx.stroke();
        }

        for (let y = startY; y < camera.y + canvasHeight + gridSize; y += gridSize) {
            const screenY = y - camera.y;
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(canvasWidth, screenY);
            ctx.stroke();
        }

        for (const decoration of this.decorations) {
            if (this.isVisible(decoration.x, decoration.y, camera, canvasWidth, canvasHeight, 50)) {
                this.renderDecoration(ctx, decoration, camera);
            }
        }

        for (const obstacle of this.obstacles) {
            if (this.isVisible(obstacle.x, obstacle.y, camera, canvasWidth, canvasHeight, obstacle.radius)) {
                this.renderObstacle(ctx, obstacle, camera);
            }
        }
    }

    isVisible(x, y, camera, canvasWidth, canvasHeight, margin = 0) {
        return x >= camera.x - margin &&
               x <= camera.x + canvasWidth + margin &&
               y >= camera.y - margin &&
               y <= camera.y + canvasHeight + margin;
    }

    renderDecoration(ctx, decoration, camera) {
        const screenX = decoration.x - camera.x;
        const screenY = decoration.y - camera.y;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(decoration.rotation);

        switch (decoration.type) {
            case 'tree':
                this.renderTree(ctx, decoration.size);
                break;
            case 'bush':
                this.renderBush(ctx, decoration.size);
                break;
            case 'rock':
                this.renderRock(ctx, decoration.size);
                break;
            case 'flower':
                this.renderFlower(ctx, decoration.size);
                break;
        }

        ctx.restore();
    }

    renderTree(ctx, size) {
        ctx.fillStyle = this.theme.obstacleColor;
        ctx.fillRect(-size * 0.15, 0, size * 0.3, size * 0.8);

        ctx.fillStyle = this.theme.decorationColor;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(-size * 0.6, 0);
        ctx.lineTo(size * 0.6, 0);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, -size * 0.6);
        ctx.lineTo(-size * 0.5, size * 0.2);
        ctx.lineTo(size * 0.5, size * 0.2);
        ctx.closePath();
        ctx.fill();
    }

    renderBush(ctx, size) {
        ctx.fillStyle = this.theme.decorationColor;
        ctx.beginPath();
        ctx.arc(-size * 0.3, 0, size * 0.4, 0, Math.PI * 2);
        ctx.arc(size * 0.3, 0, size * 0.4, 0, Math.PI * 2);
        ctx.arc(0, -size * 0.2, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    renderRock(ctx, size) {
        ctx.fillStyle = this.theme.obstacleColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.6, size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.ellipse(-size * 0.2, -size * 0.1, size * 0.2, size * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    renderFlower(ctx, size) {
        const petalCount = 5;
        const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b9d'];
        const color = Utils.randomChoice(colors);

        ctx.fillStyle = color;
        for (let i = 0; i < petalCount; i++) {
            const angle = (i / petalCount) * Math.PI * 2;
            const petalX = Math.cos(angle) * size * 0.3;
            const petalY = Math.sin(angle) * size * 0.3;
            ctx.beginPath();
            ctx.ellipse(petalX, petalY, size * 0.2, size * 0.15, angle, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }

    renderObstacle(ctx, obstacle, camera) {
        const screenX = obstacle.x - camera.x;
        const screenY = obstacle.y - camera.y;

        ctx.fillStyle = this.theme.obstacleColor;
        ctx.beginPath();
        ctx.arc(screenX, screenY, obstacle.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(screenX + 5, screenY + 5, obstacle.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    renderMinimap(ctx, scale, playerX, playerY, viewWidth, viewHeight) {
        ctx.fillStyle = this.theme.bgColor;
        ctx.fillRect(0, 0, scale, scale);

        ctx.fillStyle = this.theme.decorationColor;
        for (const decoration of this.decorations) {
            const x = (decoration.x / this.width) * scale;
            const y = (decoration.y / this.height) * scale;
            ctx.fillRect(x, y, 1, 1);
        }

        ctx.fillStyle = this.theme.obstacleColor;
        for (const obstacle of this.obstacles) {
            const x = (obstacle.x / this.width) * scale;
            const y = (obstacle.y / this.height) * scale;
            const r = (obstacle.radius / this.width) * scale;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        const viewX = (playerX - viewWidth / 2) / this.width * scale;
        const viewY = (playerY - viewHeight / 2) / this.height * scale;
        const viewW = viewWidth / this.width * scale;
        const viewH = viewHeight / this.height * scale;

        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 1;
        ctx.strokeRect(viewX, viewY, viewW, viewH);
    }

    changeTheme(themeId) {
        if (MapThemes[themeId]) {
            this.theme = MapThemes[themeId];
        }
    }

    reset() {
        this.decorations = [];
        this.obstacles = [];
        this.generateDecorations();
        this.generateObstacles();
    }
}
