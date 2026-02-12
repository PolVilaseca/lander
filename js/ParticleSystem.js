export class Particle {
    constructor(x, y, vx, vy, life, color, size, type = 'square', zLayer = 0) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
        this.type = type;
        this.zLayer = zLayer;
        this.alpha = 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Clouds live forever
        if (this.type !== 'cloud') {
            this.life--;
        }

        // Alpha calculation
        if (this.type === 'cloud') {
             this.alpha = 1;
        } else {
             this.alpha = this.life / this.maxLife;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;

        if (this.type === 'line') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - (this.vx * 20), this.y);
            ctx.stroke();

        } else if (this.type === 'spark') {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.size, this.size);

        } else if (this.type === 'cloud') {
            // NEW: Rectangular Clouds
            ctx.fillStyle = this.color;
            // Draw a rectangle centered at x,y
            // Width is longer than height (e.g., 3:1 ratio)
            const width = this.size * 3;
            const height = this.size;
            ctx.fillRect(this.x - width/2, this.y - height/2, width, height);

        } else {
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

    clear() {
        this.particles = [];
    }

    createExplosion(x, y, baseVx, baseVy, color, count = 30) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5;
            this.particles.push(new Particle(
                x, y,
                baseVx * 0.5 + Math.cos(angle) * speed,
                baseVy * 0.5 + Math.sin(angle) * speed,
                40 + Math.random() * 40,
                color,
                2 + Math.random() * 3,
                'square',
                0
            ));
        }
    }

    createWindParticle(x, y, speedX, color) {
        this.particles.push(new Particle(
            x, y, speedX, 0,
            60 + Math.random() * 40,
            color, 4, 'line', 0
        ));
    }

    createFrictionSpark(x, y, vx, vy) {
        // UPDATE: Removed the *0.2 multiplier.
        // We now trust the Ship to pass the correct "Wind Velocity" directly.
        this.particles.push(new Particle(
            x + (Math.random() - 0.5) * 20,
            y + (Math.random() - 0.5) * 20,
            vx,
            vy,
            10 + Math.random() * 15,
            'rgba(255, 220, 100, 1)',
            6, 'spark', 0
        ));
    }

    createCloud(x, y, speedX, color, size) {
        this.particles.push(new Particle(
            x, y, speedX, 0,
            Infinity,
            color, size, 'cloud', 1
        ));
    }

    update(gravity, worldWidth) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            if (p.type === 'square') p.vy += gravity;
            else if (p.type === 'spark') p.vy += gravity * 0.1;

            p.update();

            // Infinite World Wrapping
            if (p.x > worldWidth) p.x -= worldWidth;
            else if (p.x < 0) p.x += worldWidth;

            // Remove dead particles
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx, targetLayer = 0) {
        this.particles.forEach(p => {
            if (p.zLayer === targetLayer) {
                p.draw(ctx);
            }
        });
    }
}
