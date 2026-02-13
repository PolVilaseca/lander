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

        // Normalization: Game was tuned for 60FPS.
        // Step is 1.0 at 60Hz, 0.5 at 120Hz, etc.
        const step = dt * 60;

        // 1. Rotation
        if (input.rotateLeft) this.angle -= this.rotationSpeed * step;
        if (input.rotateRight) this.angle += this.rotationSpeed * step;

        // 2. Thrust
        this.isThrusting = false;
        if (input.thrust && this.fuel > 0) {
            this.isThrusting = true;
            this.fuel -= this.fuelConsumption * step;

            const forceX = Math.cos(this.angle) * this.thrustPower * step;
            const forceY = Math.sin(this.angle) * this.thrustPower * step;
            this.vx += forceX;
            this.vy += forceY;
        }

        // 3. Gravity
        this.vy += gravity * step;

        // 4. Atmosphere Interaction
        if (atmosphere) {
            const layer = atmosphere.getLayerAt(this.y);

            // Wind Influence
            if (layer.wind) {
                // Apply wind force
                this.vx += layer.wind * 0.005 * step;
            }

            // Drag / Viscosity
            if (layer.viscosity > 0) {
                this.vx *= (1 - layer.viscosity * step);
                this.vy *= (1 - layer.viscosity * step);

                // Heat Generation
                const relativeVx = this.vx - (layer.wind || 0);
                const relativeVy = this.vy;
                const speedSq = relativeVx * relativeVx + relativeVy * relativeVy;
                // Heat tuning
                const heatGeneration = Math.sqrt(speedSq) * layer.viscosity * 10;
                this.heat += heatGeneration * step;
            }
        }

        // 5. Physics Integration
        this.x += this.vx * step;
        this.y += this.vy * step;

        // 6. World Wrapping
        if (this.x > worldWidth) this.x -= worldWidth;
        if (this.x < 0) this.x += worldWidth;

        // 7. Terrain Collision
        if (terrain) {
            const ground = terrain.getHeightAt(this.x);
            if (this.y + (this.size/2) >= ground.y) {
                // Ground hit
                this.y = ground.y - (this.size/2); // Snap to surface
                this.vy = 0;

                // Check landing conditions
                const speedH = Math.abs(this.vx);
                const angleDiff = Math.abs(this.angle - (-Math.PI/2));

                // Landing threshold
                if (ground.isPad && speedH < 1.5 && this.vy < 2.0 && angleDiff < 0.25) {
                    this.landed = true;
                } else {
                    this.exploded = true;
                }
            }
        }

        // 8. Natural Cooling
        this.heat -= 0.1 * step;
        if (this.heat < 0) this.heat = 0;

        if (this.heat >= this.maxHeat) {
            this.exploded = true;
        }
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
