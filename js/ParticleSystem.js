export class Particle {
    // UPDATED: Now accepts 'height' as an optional parameter (default to null)
    constructor(x, y, vx, vy, life, color, size, type = 'square', zLayer = 0, height = null) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size; // Treats 'size' as Width for clouds
        this.height = height || size; // If no height provided, use size (square/circle)
        this.type = type;
        this.zLayer = zLayer;
        this.alpha = 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.type !== 'cloud' && this.type !== 'meteorite') {
            this.life--;
        }

        if (this.type === 'cloud' || this.type === 'meteorite') {
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
            // NEW: Use separate width (this.size) and height (this.height)
            ctx.fillStyle = this.color;
            const width = this.size;
            const height = this.height;
            ctx.fillRect(this.x - width/2, this.y - height/2, width, height);

        } else if (this.type === 'meteorite') {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.stroke();

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
        this.particles.push(new Particle(
            x + (Math.random() - 0.5) * 20,
            y + (Math.random() - 0.5) * 20,
            vx, vy,
            10 + Math.random() * 15,
            'rgba(255, 220, 100, 1)',
            6, 'spark', 0
        ));
    }

    // UPDATED: Now accepts height
    createCloud(x, y, speedX, color, width, height) {
        this.particles.push(new Particle(
            x, y, speedX, 0,
            Infinity,
            color,
            width, // Passes width as 'size'
            'cloud',
            1,
            height // Passes explicit height
        ));
    }

    createMeteorite(x, y, vx, vy, size) {
        this.particles.push(new Particle(
            x, y, vx, vy,
            Infinity,
            '#884400',
            size,
            'meteorite',
            0
        ));
    }

    update(gravity, worldWidth, atmosphere, terrain, ship) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            if (p.type === 'square' || p.type === 'meteorite') {
                p.vy += gravity;
            } else if (p.type === 'spark') {
                p.vy += gravity * 0.1;
            }

            p.update();

            if (p.x > worldWidth) p.x -= worldWidth;
            else if (p.x < 0) p.x += worldWidth;

            if (p.type === 'meteorite') {
                if (atmosphere) {
                    const layer = atmosphere.getLayerAt(p.y);
                    if (layer.viscosity > 0) {
                        const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
                        const heat = speed * layer.viscosity * 20;

                        if (heat > 0.5 && Math.random() < heat) {
                            const sparkVx = layer.wind + (Math.random()-0.5);
                            const sparkVy = -p.vy * 0.5;
                            this.createFrictionSpark(p.x, p.y, sparkVx, sparkVy);
                        }
                    }
                }

                if (terrain) {
                    const ground = terrain.getHeightAt(p.x);
                    if (p.y + p.size >= ground.y) {
                        this.createExplosion(p.x, p.y, p.vx*0.3, -p.vy*0.3, "#ffaa00", 20);
                        this.createExplosion(p.x, p.y, p.vx*0.2, -p.vy*0.2, "#885522", 15);
                        p.life = 0;
                    }
                }

                if (ship && !ship.isDead) {
                    const dx = p.x - ship.x;
                    const dy = p.y - ship.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);

                    if (dist < (p.size + ship.size/2)) {
                        this.createExplosion(p.x, p.y, p.vx, p.vy, "#ff0000", 40);
                        ship.exploded = true;
                        p.life = 0;
                    }
                }

                if (p.y > 5000) p.life = 0;
            }

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
