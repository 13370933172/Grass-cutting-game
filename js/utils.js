const Utils = {
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    random(min, max) {
        return Math.random() * (max - min) + min;
    },

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    lerp(start, end, t) {
        return start + (end - start) * t;
    },

    normalizeAngle(angle) {
        while (angle < 0) angle += Math.PI * 2;
        while (angle >= Math.PI * 2) angle -= Math.PI * 2;
        return angle;
    },

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },

    weightedRandom(items) {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const item of items) {
            random -= item.weight;
            if (random <= 0) return item;
        }
        
        return items[items.length - 1];
    },

    circleCollision(x1, y1, r1, x2, y2, r2) {
        return this.distance(x1, y1, x2, y2) < r1 + r2;
    },

    rectCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    },

    pointInCircle(px, py, cx, cy, r) {
        return this.distance(px, py, cx, cy) <= r;
    },

    pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },

    easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },

    easeOut(t) {
        return t * (2 - t);
    },

    easeIn(t) {
        return t * t;
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
};

const Vector2 = {
    create(x = 0, y = 0) {
        return { x, y };
    },

    add(v1, v2) {
        return { x: v1.x + v2.x, y: v1.y + v2.y };
    },

    subtract(v1, v2) {
        return { x: v1.x - v2.x, y: v1.y - v2.y };
    },

    multiply(v, scalar) {
        return { x: v.x * scalar, y: v.y * scalar };
    },

    divide(v, scalar) {
        if (scalar === 0) return { x: 0, y: 0 };
        return { x: v.x / scalar, y: v.y / scalar };
    },

    magnitude(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    },

    normalize(v) {
        const mag = this.magnitude(v);
        if (mag === 0) return { x: 0, y: 0 };
        return this.divide(v, mag);
    },

    dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    },

    rotate(v, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: v.x * cos - v.y * sin,
            y: v.x * sin + v.y * cos
        };
    },

    lerp(v1, v2, t) {
        return {
            x: Utils.lerp(v1.x, v2.x, t),
            y: Utils.lerp(v1.y, v2.y, t)
        };
    },

    distance(v1, v2) {
        return Utils.distance(v1.x, v1.y, v2.x, v2.y);
    },

    angle(v) {
        return Math.atan2(v.y, v.x);
    },

    fromAngle(angle, length = 1) {
        return {
            x: Math.cos(angle) * length,
            y: Math.sin(angle) * length
        };
    }
};
