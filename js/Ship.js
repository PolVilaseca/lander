export class Ship {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = -Math.PI / 2;

        this.thrustPower = 0.15;
        this.rotationSpeed = 0.08;
        this.fuel = 100;
        this.fuelConsumption = 0.1;

        this.heat = 0;
        this.maxHeat = 100;
        this.exploded = false;
        this.landed = false;
        this.isDead = false;

        this.size = 20;
    }

    update(input, gravity, worldWidth, worldHeight, atmosphere, terrain, dt) {
        if (this.isDead || this.landed) return;

        const step = dt * 60;

        // 1. Rotation & Thrust
        if (input.rotateLeft) this.angle -= this.rotationSpeed * step;
        if (input.rotateRight) this.angle += this.rotationSpeed * step;

        this.isThrusting = false;
        if (input.thrust && this.fuel > 0) {
            this.isThrusting = true;
            this.fuel -= this.fuelConsumption * step;
            this.vx += Math.cos(this.angle) * this.thrustPower * step;
            this.vy += Math.sin(this.angle) * this.thrustPower * step;
        }

        this.vy += gravity * step;

        // 2. Atmosphere Drag & Heat
        if (atmosphere) {
            const layer = atmosphere.getLayerAt(this.y);
            if (layer.wind) this.vx += layer.wind * 0.005 * step;
            if (layer.viscosity > 0) {
                this.vx *= (1 - layer.viscosity * 0.5 * step);
                this.vy *= (1 - layer.viscosity * 0.5 * step);

                const relativeVx = this.vx - (layer.wind || 0);
                const relativeVy = this.vy;
                const speedSq = relativeVx * relativeVx + relativeVy * relativeVy;
                const heatGeneration = Math.sqrt(speedSq) * layer.viscosity * 5;
                this.heat += heatGeneration * step;
            }
        }

        // 3. Movement
        this.x += this.vx * step;
        this.y += this.vy * step;

        if (this.x > worldWidth) this.x -= worldWidth;
        if (this.x < 0) this.x += worldWidth;

        // 4. Terrain Collision
        if (terrain) {
            const ground = terrain.getHeightAt(this.x);
            if (this.y + (this.size/2) >= ground.y) {
                // Snap to ground
                this.y = ground.y - (this.size/2);
                this.vy = 0;

                const speedH = Math.abs(this.vx);
                const speedV = Math.abs(this.vy); // Likely 0 now
                const angleDiff = Math.abs(this.angle - (-Math.PI/2));

                // SAFE LANDING OR LAUNCH PAD CHECK
                const isSafeSpeed = speedH < 2.0 && speedV < 3.0 && angleDiff < 0.3;

                if ((ground.isPad || ground.isLaunchPad) && isSafeSpeed) {
                    if (ground.isPad) {
                        this.landed = true; // Win Level
                        this.vx = 0;
                    }
                    else if (ground.isLaunchPad) {
                        // Just sitting on launch pad. Safe.
                        this.vx *= 0.9; // Friction to stop sliding
                    }
                } else {
                    this.exploded = true;
                }
            }
        }

        // 5. Cooling
        this.heat -= 0.15 * step;
        if (this.heat < 0) this.heat = 0;
        if (this.heat >= this.maxHeat) this.exploded = true;
    }

    draw(ctx) {
        if (this.isDead) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size / 2, this.size / 2);
        ctx.lineTo(-this.size / 2, 0);
        ctx.lineTo(-this.size / 2, -this.size / 2);
        ctx.closePath();
        ctx.stroke();

        if (this.isThrusting) {
            ctx.strokeStyle = '#ffaa00';
            ctx.beginPath();
            ctx.moveTo(-this.size / 2, 0);
            ctx.lineTo(-this.size - (Math.random() * 10), 0);
            ctx.stroke();
        }
        ctx.restore();
    }
}
