class Lightning {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.maxRadius = radius;

        this.state = 'charging'; // 'charging' | 'striking' | 'done'
        this.timer = 0;
        this.chargeDuration = 1.5;
        this.strikeDuration = 0.5;

        this.bolts = [];
    }

    update(dt) {
        this.timer += dt;

        if (this.state === 'charging') {
            if (this.timer >= this.chargeDuration) {
                this.state = 'striking';
                this.timer = 0;
                this.generateGeometry();
            }
        } else if (this.state === 'striking') {
            if (this.timer >= this.strikeDuration) {
                this.state = 'done';
            }
        }
    }

    generateGeometry() {
        this.bolts = [];
        const numMainBolts = 4 + Math.floor(Math.random() * 3);

        for (let i = 0; i < numMainBolts; i++) {
            const angle = (Math.PI * 2 * i) / numMainBolts + (Math.random() - 0.5) * 1.0;
            this.createBoltBranch(this.x, this.y, angle, this.maxRadius, 4);
        }
    }

    createBoltBranch(x, y, angle, length, generation) {
        if (generation <= 0) return;

        // High Zig-Zag Jitter
        const jitter = (Math.random() - 0.5) * 2.5;
        const newAngle = angle + jitter;

        const segmentLen = length * (0.5 + Math.random() * 0.3);

        const x2 = x + Math.cos(newAngle) * segmentLen;
        const y2 = y + Math.sin(newAngle) * segmentLen;

        const width = generation === 4 ? 3 : (generation === 3 ? 2 : 1);

        this.bolts.push({ x1: x, y1: y, x2: x2, y2: y2, width: width });

        const branches = Math.random() < 0.4 ? 2 : 1;

        for (let i = 0; i < branches; i++) {
             const spread = (i === 0) ? 0 : (Math.random() - 0.5) * 1.0;
             this.createBoltBranch(x2, y2, angle + spread, length * 0.6, generation - 1);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 1. Draw Flickering Glow (Charging)
        if (this.state === 'charging') {
            const progress = this.timer / this.chargeDuration;

            // Calculate Flicker
            let alpha = progress * 0.3;
            if (Math.random() < 0.2 + (progress * 0.6)) {
                alpha += Math.random() * 0.5;
            }

            if (alpha > 0) {
                const r = this.maxRadius * (0.8 + Math.random() * 0.3);

                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
                gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                gradient.addColorStop(0.3, `rgba(100, 255, 255, ${alpha * 0.6})`);
                gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 2. Draw Bolts (Striking)
        if (this.state === 'striking') {
            ctx.globalAlpha = 1.0;
            // Flash center
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();

        // Draw Bolts in World Space
        if (this.state === 'striking' && Math.random() > 0.1) {
             ctx.save();
             ctx.strokeStyle = "#ffffff";
             ctx.lineCap = "square";
             ctx.shadowColor = "#ccffff";
             ctx.shadowBlur = 8;

             this.bolts.forEach(bolt => {
                 ctx.lineWidth = bolt.width;
                 ctx.beginPath();
                 ctx.moveTo(bolt.x1, bolt.y1);
                 ctx.lineTo(bolt.x2, bolt.y2);
                 ctx.stroke();
             });
             ctx.restore();
        }
    }

    // UPDATED: Precise Collision Detection
    checkCollision(ship) {
        if (this.state !== 'striking') return false;

        // Iterate through all actual bolt segments
        for (let bolt of this.bolts) {
            // Distance from ship center to line segment
            const dist = this.pointLineDistance(ship.x, ship.y, bolt.x1, bolt.y1, bolt.x2, bolt.y2);

            // Allow a small margin (ship size + bolt width + wiggle room)
            if (dist < (ship.size / 2) + bolt.width + 2) {
                return true;
            }
        }
        return false;
    }

    // Helper: Distance from point (px,py) to segment (x1,y1)-(x2,y2)
    pointLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) // Avoid divide by zero
            param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
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

                        // Calculate velocity: Base speed +/- 20% variance
                        const variance = Math.abs(d.speed * 0.2);
                        const speed = d.speed + (Math.random() - 0.5) * 2 * variance;

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
            ctx.fillRect(0, y, worldWidth, height);
            currentAlt += height;
        });

        // Draw Lightnings
        this.activeLightnings.forEach(L => L.draw(ctx));
    }
}
