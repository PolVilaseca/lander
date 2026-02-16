class Lightning {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.maxRadius = radius;

        this.state = 'charging'; // 'charging' | 'striking' | 'done'
        this.timer = 0;
        this.chargeDuration = 3.0; // 3 seconds warning
        this.strikeDuration = 0.5; // 0.5 seconds deadly

        this.bolts = []; // Array of line segments
        this.glowAlpha = 0;
    }

    update(dt) {
        this.timer += dt;

        if (this.state === 'charging') {
            // Pulse the glow
            const progress = this.timer / this.chargeDuration;
            this.glowAlpha = Math.max(0, Math.min(1, progress * 0.8 + Math.sin(this.timer * 10) * 0.1));

            if (this.timer >= this.chargeDuration) {
                this.state = 'striking';
                this.timer = 0;
                this.generateGeometry();
            }
        } else if (this.state === 'striking') {
            this.glowAlpha = 1.0;
            if (this.timer >= this.strikeDuration) {
                this.state = 'done';
            }
        }
    }

    generateGeometry() {
        this.bolts = [];
        // MINIMALIST: Fewer bolts (2), radiating out
        const numMainBolts = 2;

        for (let i = 0; i < numMainBolts; i++) {
            // Random start angle, spread evenly
            const angle = (Math.PI * 2 * i) / numMainBolts + (Math.random() - 0.5) * 1.0;
            // Fewer generations (4 instead of 5) for less clutter
            this.createBoltBranch(this.x, this.y, angle, this.maxRadius, 4);
        }
    }

    createBoltBranch(x, y, angle, length, generation) {
        if (generation <= 0) return;

        // MINIMALIST: More ZigZag (Jitter)
        const jitter = (Math.random() - 0.5) * 1.5; // High angular variance
        const newAngle = angle + jitter;

        // MINIMALIST: Longer segments (60-90% of length)
        const segmentLen = length * (0.6 + Math.random() * 0.3);

        const x2 = x + Math.cos(newAngle) * segmentLen;
        const y2 = y + Math.sin(newAngle) * segmentLen;

        // Thicker lines for minimal style
        const width = generation === 4 ? 3 : (generation === 3 ? 2 : 1);

        this.bolts.push({ x1: x, y1: y, x2: x2, y2: y2, width: width });

        // MINIMALIST: Branching is rarer (30% chance)
        const branches = Math.random() < 0.3 ? 2 : 1;

        for (let i = 0; i < branches; i++) {
             // Spread logic
             const spread = (i === 0) ? 0 : (Math.random() - 0.5) * 1.0;
             // Length decays faster (0.6x)
             this.createBoltBranch(x2, y2, angle + spread, length * 0.6, generation - 1);
        }
    }

    draw(ctx) {
        ctx.save();

        // 1. Draw Glow (Charging & Striking)
        if (this.glowAlpha > 0) {
            const gradient = ctx.createRadialGradient(this.x, this.y, 10, this.x, this.y, this.maxRadius);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${this.glowAlpha})`);
            gradient.addColorStop(0.4, `rgba(100, 200, 255, ${this.glowAlpha * 0.5})`);
            gradient.addColorStop(1, `rgba(100, 200, 255, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.maxRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Draw Bolts (Striking only)
        if (this.state === 'striking') {
            if (Math.random() > 0.1) { // High frequency flicker
                ctx.strokeStyle = "#ffffff";
                ctx.lineCap = "square"; // Vector style caps
                ctx.shadowColor = "#ccffff"; // Slightly cooler glow
                ctx.shadowBlur = 8; // Crisper glow

                this.bolts.forEach(bolt => {
                    ctx.lineWidth = bolt.width;
                    ctx.beginPath();
                    ctx.moveTo(bolt.x1, bolt.y1);
                    ctx.lineTo(bolt.x2, bolt.y2);
                    ctx.stroke();
                });

                ctx.shadowBlur = 0;
            }
        }

        ctx.restore();
    }

    checkCollision(ship) {
        if (this.state !== 'striking') return false;

        const dx = ship.x - this.x;
        const dy = ship.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < this.maxRadius * 0.9) {
            return true;
        }
        return false;
    }
}

export class Atmosphere {
    constructor(layers, worldHeight) {
        this.layers = layers;
        this.worldHeight = worldHeight;
        this.activeLightnings = [];
    }

    getLayerAt(y) {
        const altitude = this.worldHeight - y;
        let currentAlt = 0;

        for (let layer of this.layers) {
            if (altitude >= currentAlt && altitude < currentAlt + layer.height) {
                return layer;
            }
            currentAlt += layer.height;
        }
        return { name: "Space", viscosity: 0, wind: 0, color: "transparent" };
    }

    initFeatures(particleSystem, worldWidth) {
        let currentAlt = 0;
        this.layers.forEach(layer => {
            const layerY = this.worldHeight - currentAlt - layer.height;

            if (layer.features) {
                if (layer.features.clouds) {
                    const c = layer.features.clouds;
                    for (let i = 0; i < c.count; i++) {
                        const cx = Math.random() * worldWidth;
                        const cy = layerY + Math.random() * layer.height;
                        const w = c.minWidth + Math.random() * (c.maxWidth - c.minWidth);
                        const h = c.minHeight + Math.random() * (c.maxHeight - c.minHeight);
                        const speed = layer.wind * 0.5 + (Math.random() - 0.5);
                        particleSystem.createCloud(cx, cy, speed, `rgba(255,255,255,${c.opacity})`, w, h);
                    }
                }
                if (layer.features.space_debris) {
                    const d = layer.features.space_debris;
                    for(let i=0; i<d.count; i++) {
                        const dx = Math.random() * worldWidth;
                        const dy = this.worldHeight - (d.minAltitude + Math.random() * (d.maxAltitude - d.minAltitude));
                        const size = d.minSize + Math.random() * (d.maxSize - d.minSize);
                        const speed = (Math.random() < 0.5 ? -1 : 1) * d.speed;
                        particleSystem.createSpaceDebris(dx, dy, speed, size);
                    }
                }
            }
            currentAlt += layer.height;
        });
    }

    update(particleSystem, worldWidth, worldHeight, dt) {
        // 1. Spawn Lightnings
        let currentAlt = 0;
        this.layers.forEach(layer => {
            if (layer.lightning) {
                if (Math.random() < layer.lightning.frequency) {
                    const layerYBottom = this.worldHeight - currentAlt;
                    const layerYTop = layerYBottom - layer.height;

                    const x = Math.random() * worldWidth;
                    // Spawn mostly in middle of layer
                    const y = layerYTop + (Math.random() * 0.8 + 0.1) * layer.height;

                    this.activeLightnings.push(new Lightning(x, y, layer.lightning.radius));
                }
            }
            currentAlt += layer.height;
        });

        // 2. Update Active Lightnings
        for (let i = this.activeLightnings.length - 1; i >= 0; i--) {
            const L = this.activeLightnings[i];
            L.update(dt);
            if (L.state === 'done') {
                this.activeLightnings.splice(i, 1);
            }
        }

        // 3. Meteorites
        const spaceLayer = this.layers[this.layers.length - 1];
        if (spaceLayer.features && spaceLayer.features.meteorites) {
             const m = spaceLayer.features.meteorites;
             if (Math.random() < m.rate) {
                 const x = Math.random() * worldWidth;
                 const y = -50;
                 const vx = m.velX[0] + Math.random() * (m.velX[1] - m.velX[0]);
                 const vy = m.velY[0] + Math.random() * (m.velY[1] - m.velY[0]);
                 const size = 5 + Math.random() * m.maxSize;
                 particleSystem.createMeteorite(x, y, vx, vy, size);
             }
        }
    }

    checkCollision(ship) {
        for (let L of this.activeLightnings) {
            if (L.checkCollision(ship)) {
                return true;
            }
        }
        return false;
    }

    draw(ctx, worldWidth) {
        // Draw Atmosphere Backgrounds
        let currentAlt = 0;
        this.layers.forEach(layer => {
            const height = layer.height;
            const y = this.worldHeight - currentAlt - height;

            ctx.fillStyle = layer.color;
            ctx.fillRect(0, y, worldWidth, height); // Corrected width
            currentAlt += height;
        });

        // Draw Lightnings
        this.activeLightnings.forEach(L => L.draw(ctx));
    }
}
