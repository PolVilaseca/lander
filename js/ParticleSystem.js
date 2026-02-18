export class Particle {
    constructor(x, y, vx, vy, life, color, size, type = 'square', zLayer = 0, height = null, angle = 0, rotationSpeed = 0) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
        this.height = height || size;
        this.type = type;
        this.zLayer = zLayer;
        this.alpha = 1;

        this.angle = angle;
        this.rotationSpeed = rotationSpeed;
    }

    update(step) {
        this.x += this.vx * step;
        this.y += this.vy * step;
        this.angle += this.rotationSpeed * step;

        if (this.type !== 'cloud' && this.type !== 'meteorite' && this.type !== 'debris' && this.type !== 'station') {
            this.life -= step;
        }

        if (this.type === 'cloud' || this.type === 'meteorite' || this.type === 'debris' || this.type === 'station') {
             this.alpha = 1;
        } else {
             this.alpha = Math.max(0, this.life / this.maxLife);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;

        // Apply rotation
        if (this.rotationSpeed !== 0 || this.type === 'debris' || this.type === 'station') {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);

            if (this.type === 'station') {
                const halfSize = this.size / 2;
                const panelW = this.size * 1.5;
                const panelH = this.size * 0.6;

                // 1. Solar Panels (Wireframe)
                ctx.strokeStyle = '#4da6ff';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(-halfSize - panelW, -panelH/2, panelW, panelH); // Left
                ctx.strokeRect(halfSize, -panelH/2, panelW, panelH);           // Right

                // Connector Struts
                ctx.strokeStyle = '#888888';
                ctx.beginPath();
                ctx.moveTo(-halfSize, 0); ctx.lineTo(-halfSize - panelW, 0);
                ctx.moveTo(halfSize, 0);  ctx.lineTo(halfSize + panelW, 0);
                ctx.stroke();

                // 2. Hub (Wireframe)
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(-halfSize, -halfSize, this.size, this.size);

                // 3. Inner Circle
                ctx.beginPath();
                ctx.arc(0, 0, halfSize * 0.75, 0, Math.PI * 2);
                ctx.stroke();

                // 4. Docking Indicators
                ctx.strokeStyle = '#00ff00';
                const padH = 5;
                const padW = this.size - 8;
                ctx.strokeRect(-padW/2, -halfSize - padH, padW, padH);
                ctx.strokeRect(-padW/2, halfSize, padW, padH);

            } else if (this.type === 'debris') {
                 // Empty squares (stroke only)
                 ctx.strokeStyle = '#ffffff';
                 ctx.lineWidth = 1.5;
                 ctx.strokeRect(-this.size/2, -this.size/2, this.size, this.size);
            }

        } else {
            // Non-rotated drawing

            // UPDATED: User's Manual Wind Drawing
            if (this.type === 'wind') {
                 ctx.strokeStyle = this.color;
                 ctx.lineWidth = 3;
                 ctx.beginPath();
                 ctx.moveTo(this.x, this.y);
                 // Draw trail proportional to speed
                 ctx.lineTo(this.x - this.vx * 6, this.y);
                 ctx.stroke();
            }
            else {
                ctx.translate(this.x, this.y);

                if (this.type === 'cloud') {
                    ctx.fillStyle = this.color;
                    ctx.fillRect(0, 0, this.size, this.height);
                } else if (this.type === 'meteorite') {
                     // Empty Meteorite (Stroke Only)
                     ctx.strokeStyle = this.color;
                     ctx.lineWidth = 2;
                     ctx.beginPath();
                     ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                     ctx.stroke();
                } else {
                    // Sparks / Dust
                    ctx.fillStyle = this.color;
                    ctx.fillRect(0, 0, this.size, this.size);
                }
            }
        }

        ctx.restore();
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.ambientDust = [];
    }

    initAmbientDust(worldWidth, worldHeight) {
        this.ambientDust = [];
        const count = (worldWidth * worldHeight) / 2500;
        for (let i = 0; i < count; i++) {
            this.ambientDust.push({
                x: Math.random() * worldWidth,
                y: Math.random() * worldHeight,
                size: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.3 + 0.05
            });
        }
    }

    createWindParticle(x, y, vx, color) {
        const life = 30 + Math.random() * 30;
        this.particles.push(new Particle(x, y, vx, 0, life, color, 1, 'wind', 1));
    }

    createExplosion(x, y, vx, vy, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2;
            const pvx = vx * 0.5 + Math.cos(angle) * speed;
            const pvy = vy * 0.5 + Math.sin(angle) * speed;
            const life = 20 + Math.random() * 20;
            const size = 2 + Math.random() * 2;

            this.particles.push(new Particle(x, y, pvx, pvy, life, color, size, 'square', 0));
        }
    }

    createFrictionSpark(x, y, vx, vy) {
        const size = 2 + Math.random() * 2;
        const life = 10 + Math.random() * 10;
        this.particles.push(new Particle(x, y, vx, vy, life, '#ffff00', size, 'square', 0));
    }

    createSpaceStation(x, y, vx, size) {
        const angle = Math.random() * Math.PI * 2;
        const p = new Particle(x, y, vx, 0, 99999, '#ffffff', size, 'station', 1, null, angle);
        this.particles.push(p);
    }

    createCloud(x, y, vx, color, w, h) {
        const p = new Particle(x, y, vx, 0, 99999, color, w, 'cloud', 1, h);
        this.particles.push(p);
    }

    createSpaceDebris(x, y, vx, size) {
        const angle = Math.random() * Math.PI * 2;
        const rotSpeed = (Math.random() - 0.5) * 0.1;
        const p = new Particle(x, y, vx, 0, 99999, '#888888', size, 'debris', 1, null, angle, rotSpeed);
        this.particles.push(p);
    }

    createMeteorite(x, y, vx, vy, size) {
         const p = new Particle(x, y, vx, vy, 1200, '#ffaa00', size, 'meteorite', 0);
         this.particles.push(p);
    }

    clear() {
        this.particles = [];
        this.ambientDust = [];
    }

    update(gravity, worldWidth, atmosphere, terrain, ship, dt) {
        const step = dt * 60;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            if (p.type === 'meteorite') {
                 p.vy += gravity * step;
            }
            else if (p.type !== 'cloud' && p.type !== 'station' && p.type !== 'debris' && p.type !== 'wind') {
                 p.vy += gravity * 0.2 * step;
            }

            p.update(step);

            if (p.x < 0) p.x += worldWidth;
            if (p.x > worldWidth) p.x -= worldWidth;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            if (p.type === 'meteorite') {
                if (Math.random() < 0.4 * step) {
                     if (atmosphere) {
                         const layer = atmosphere.getLayerAt(p.y);
                         if (layer.viscosity > 0) {
                             const spread = p.size;
                             const sx = p.x + (Math.random() - 0.5) * spread;
                             const sy = p.y + (Math.random() - 0.5) * spread;
                             this.createFrictionSpark(sx, sy, -p.vx * 0.5, -p.vy * 0.5);
                         }
                     }
                }

                if (terrain) {
                    const ground = terrain.getHeightAt(p.x);
                    if (p.y + p.size > ground.y) {
                        this.createExplosion(p.x, p.y, 0, -2, "#ffaa00", 20);
                        p.life = 0;
                    }
                }
                if (ship && !ship.isDead && !ship.landed) {
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

            if (p.type === 'debris') {
                if (ship && !ship.isDead && !ship.landed) {
                    const dx = p.x - ship.x;
                    const dy = p.y - ship.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < (p.size * 0.7 + ship.size * 0.6)) {
                        this.createExplosion(p.x, p.y, p.vx, p.vy, "#ff0000", 40);
                        ship.exploded = true;
                        this.createExplosion(p.x, p.y, -p.vx*0.5, p.vy*0.5, "#ffffff", 15);
                        p.life = 0;
                    }
                }
            }
        }
    }

    draw(ctx, layer) {
        if (layer === 1) {
            ctx.fillStyle = "#ffffff";
            this.ambientDust.forEach(p => {
                ctx.globalAlpha = p.alpha;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            });
            ctx.globalAlpha = 1.0;

            this.particles.forEach(p => {
                if (p.zLayer === 1) p.draw(ctx);
            });
        }

        if (layer === 0) {
            this.particles.forEach(p => {
                if (p.zLayer === 0) p.draw(ctx);
            });
        }
    }
}
