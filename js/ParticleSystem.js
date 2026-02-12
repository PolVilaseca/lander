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

        // Clouds and Meteorites handle life differently
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
            ctx.fillStyle = this.color;
            const width = this.size * 3;
            const height = this.size;
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

    createCloud(x, y, speedX, color, size) {
        this.particles.push(new Particle(
            x, y, speedX, 0,
            Infinity,
            color, size, 'cloud', 1
        ));
    }

    // NEW: Meteorite
    createMeteorite(x, y, vx, vy, size) {
        // Z-layer 0 (Background) or 1? Let's keep it 0 so it doesn't cover the UI,
        // but it should probably collide with Ship.
        this.particles.push(new Particle(
            x, y, vx, vy,
            Infinity, // Lives until collision
            '#884400', // Brownish
            size,
            'meteorite',
            0
        ));
    }

    // UPDATED: Now accepts Atmosphere, Terrain, Ship for collision/physics logic
    update(gravity, worldWidth, atmosphere, terrain, ship) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // 1. GRAVITY
            if (p.type === 'square' || p.type === 'meteorite') {
                p.vy += gravity;
            } else if (p.type === 'spark') {
                p.vy += gravity * 0.1;
            }

            p.update();

            // 2. WORLD WRAP
            if (p.x > worldWidth) p.x -= worldWidth;
            else if (p.x < 0) p.x += worldWidth;

            // 3. SPECIAL LOGIC FOR METEORITES
            if (p.type === 'meteorite') {

                // A. Atmospheric Friction (Sparks)
                if (atmosphere) {
                    const layer = atmosphere.getLayerAt(p.y);
                    // Check if air is thick enough and moving fast
                    if (layer.viscosity > 0) {
                        const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
                        const heat = speed * layer.viscosity * 20; // Heat factor

                        if (heat > 0.5 && Math.random() < heat) {
                            // Spawn spark trail
                            // Sparks move slightly with wind
                            const sparkVx = layer.wind + (Math.random()-0.5);
                            const sparkVy = -p.vy * 0.5; // Upward relative to meteorite

                            // Use 'this' to call createFrictionSpark
                            this.createFrictionSpark(p.x, p.y, sparkVx, sparkVy);
                        }
                    }
                }

                // B. Terrain Collision
                if (terrain) {
                    const ground = terrain.getHeightAt(p.x);
                    // Simple circle-ground check (bottom of circle touches ground)
                    if (p.y + p.size >= ground.y) {
                        // EXPLODE
                        this.createExplosion(p.x, p.y, p.vx*0.3, -p.vy*0.3, "#ffaa00", 20); // Fire
                        this.createExplosion(p.x, p.y, p.vx*0.2, -p.vy*0.2, "#885522", 15); // Dust
                        p.life = 0; // Kill meteorite
                    }
                }

                // C. Ship Collision
                if (ship && !ship.isDead) {
                    // Circle-to-Box approximation (or Circle-Circle)
                    // Ship is roughly size*size. Meteorite is size radius.
                    const dx = p.x - ship.x;
                    const dy = p.y - ship.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);

                    if (dist < (p.size + ship.size/2)) {
                        // HIT!
                        this.createExplosion(p.x, p.y, p.vx, p.vy, "#ff0000", 40);
                        ship.exploded = true; // Trigger ship death
                        p.life = 0; // Kill meteorite
                    }
                }

                // D. Kill if falls off bottom (just in case)
                if (p.y > 5000) p.life = 0;
            }

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
