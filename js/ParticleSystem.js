export class Particle {
    constructor(x, y, vx, vy, life, color, size, type = 'square') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
        this.type = type; // 'square' (debris), 'line' (wind), 'spark' (friction)
        this.alpha = 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.alpha = this.life / this.maxLife;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;

        if (this.type === 'line') {
            // --- WIND VISUALIZATION ---
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 4; // Thicker lines for better visibility
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            // Draw a trail behind the particle to simulate speed/streak
            ctx.lineTo(this.x - (this.vx * 20), this.y);
            ctx.stroke();

        } else if (this.type === 'spark') {
            // --- FRICTION/HEAT ---
            ctx.fillStyle = this.color;
            // Sparks are small intense squares
            ctx.fillRect(this.x, this.y, this.size, this.size);

        } else {
            // --- EXPLOSION DEBRIS (Default) ---
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }

        ctx.restore();
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    // 1. Explosion: Radial burst of debris
    createExplosion(x, y, baseVx, baseVy, color, count = 30) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5; // Random explosive force

            this.particles.push(new Particle(
                x, y,
                baseVx * 0.5 + Math.cos(angle) * speed, // Inherit some ship speed
                baseVy * 0.5 + Math.sin(angle) * speed,
                40 + Math.random() * 40, // Life
                color,
                2 + Math.random() * 3, // Size
                'square'
            ));
        }
    }

    // 2. Wind: Horizontal streaks
    createWindParticle(x, y, speedX, color) {
        this.particles.push(new Particle(
            x, y,
            speedX,
            0, // Wind doesn't move vertically here
            60 + Math.random() * 40, // Long life
            color,
            4,
            'line'
        ));
    }

    // 3. Friction: Sparks when air resistance is high
    createFrictionSpark(x, y, vx, vy) {
        this.particles.push(new Particle(
            x + (Math.random() - 0.5) * 20, // Random offset from ship center
            y + (Math.random() - 0.5) * 20,
            vx * 0.2, // Sparks lag behind the ship slightly
            vy * 0.2,
            10 + Math.random() * 15, // Short life
            'rgba(255, 220, 100, 1)', // Bright Yellow/White
            6, // Visible size
            'spark'
        ));
    }

    update(gravity, worldWidth) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Apply Gravity checks
            // Wind and Friction sparks generally float/fade, Debris falls
            if (p.type === 'square') {
                p.vy += gravity;
            } else if (p.type === 'spark') {
                p.vy += gravity * 0.1; // Slight gravity for sparks
            }

            p.update();

            // --- INFINITE WORLD WRAPPING ---
            // If particle goes off the right edge, wrap to left
            if (p.x > worldWidth) p.x -= worldWidth;
            // If particle goes off the left edge, wrap to right
            else if (p.x < 0) p.x += worldWidth;

            // Remove dead particles
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        // Draw all particles
        // Note: ctx is already translated by the camera in Game.js,
        // so we just draw at p.x, p.y
        this.particles.forEach(p => p.draw(ctx));
    }
}
