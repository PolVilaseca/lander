export class Ship {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = -Math.PI / 2; // Pointing UP

        this.thrustPower = 0.15;
        this.rotationSpeed = 0.08;
        this.fuel = 100;
        this.fuelConsumption = 0.1;

        this.heat = 0;
        this.maxHeat = 100;
        this.exploded = false;
        this.isDead = false;

        this.size = 20;
    }

    update(input, gravity, width, height) {
        if (this.isDead) return;

        if (input.rotateLeft) this.angle -= this.rotationSpeed;
        if (input.rotateRight) this.angle += this.rotationSpeed;

        this.isThrusting = false;
        if (input.thrust && this.fuel > 0) {
            this.isThrusting = true;
            this.fuel -= this.fuelConsumption;

            const forceX = Math.cos(this.angle) * this.thrustPower;
            const forceY = Math.sin(this.angle) * this.thrustPower;

            this.vx += forceX;
            this.vy += forceY;
        }

        this.vy += gravity;

        this.x += this.vx;
        this.y += this.vy;

        if (this.x > width) this.x -= width;
        else if (this.x < 0) this.x += width;
    }

    applyAtmosphere(layer, particleSystem) {
        if (!layer || this.isDead) return;

        const relativeVx = this.vx - layer.wind;
        const relativeVy = this.vy;

        const dragX = -relativeVx * layer.viscosity;
        const dragY = -relativeVy * layer.viscosity;
        this.vx += dragX;
        this.vy += dragY;

        const speedThroughAir = Math.sqrt(relativeVx*relativeVx + relativeVy*relativeVy);
        const heatGeneration = speedThroughAir * layer.viscosity * 10;
        this.heat += heatGeneration;

        // VISUALIZE FRICTION
        if (particleSystem && heatGeneration > 0.1) {
            if (Math.random() < heatGeneration * 5) {
                // NEW: Sparks are carried by the wind.
                // Velocity X = Wind Speed (plus some turbulence)
                // Velocity Y = Slight downward/random drift, independent of ship
                const sparkVx = layer.wind + (Math.random() - 0.5) * 2;
                const sparkVy = (Math.random() - 0.5) * 2;

                particleSystem.createFrictionSpark(this.x, this.y, sparkVx, sparkVy);
            }
        }

        this.heat -= 0.1;
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
