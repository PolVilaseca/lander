export class Ship {
    constructor(x, y) {
        // Position & Movement
        this.x = x;
        this.y = y;
        this.vx = 20; // Velocity X
        this.vy = 0; // Velocity Y
        this.angle = 0;// -Math.PI / 2; // Pointing UP
        this.vRotation = 0; // Angular velocity (optional, but smoother)

        // Ship Parameters (Could be moved to JSON later)
        this.thrustPower = 0.1;
        this.rotationSpeed = 0.08;
        this.fuel = 100;
        this.fuelConsumption = 0.1;

        // Atmosphere
        this.heat = 0;
        this.maxHeat = 100;
        this.exploded = false;

        // Dimensions for drawing
        this.size = 20;
    }

    update(input, gravity, width, height) {
        // 1. Rotation
        if (input.rotateLeft) this.angle -= this.rotationSpeed;
        if (input.rotateRight) this.angle += this.rotationSpeed;

        // 2. Thrust
        this.isThrusting = false;
        if (input.thrust && this.fuel > 0) {
            this.isThrusting = true;
            this.fuel -= this.fuelConsumption;

            // Calculate force vector based on angle
            // Math.cos is X, Math.sin is Y
            const forceX = Math.cos(this.angle) * this.thrustPower;
            const forceY = Math.sin(this.angle) * this.thrustPower;

            this.vx += forceX;
            this.vy += forceY;
        }

        // 3. Gravity (Always applied)
        this.vy += gravity;

        // 4. Apply Velocity to Position
        this.x += this.vx;
        this.y += this.vy;

        // 5. Periodic Boundary Conditions (Screen Wrap)
        if (this.x > width) this.x = 0;
        else if (this.x < 0) this.x = width;

        // 6. Floor Constraint (Temporary, so you don't fall forever)
        if (this.y > height - 10) {
            this.y = height - 10;
            this.vy = 0;
            this.vx *= 0.9; // Friction on ground
        }
    }

    applyAtmosphere(layer, particleSystem) { // <--- NOTE: Accept particleSystem as arg
        if (!layer) return;

        // ... (Relative Velocity Calculation) ...
        const relativeVx = this.vx - layer.wind;
        const relativeVy = this.vy;

        // ... (Drag Physics) ...
        const dragX = -relativeVx * layer.viscosity;
        const dragY = -relativeVy * layer.viscosity;
        this.vx += dragX;
        this.vy += dragY;

        // ... (Heat Logic) ...
        const speedThroughAir = Math.sqrt(relativeVx*relativeVx + relativeVy*relativeVy);
        const heatGeneration = speedThroughAir * layer.viscosity * 10;
        this.heat += heatGeneration;

        // --- NEW: VISUALIZE FRICTION ---
        // If we are generating significant heat, spawn sparks
        if (particleSystem && heatGeneration > 0.1) {
            // Spawn probability increases with heat
            if (Math.random() < heatGeneration * 5) {
                // Spark moves opposite to relative velocity (trails behind)
                particleSystem.createFrictionSpark(this.x, this.y, -relativeVx, -relativeVy);
            }


            //const sparkCount = Math.floor(heatGeneration * 5);
            //for(let i=0; i<sparkCount; i++) {
            //    particleSystem.createFrictionSpark(this.x, this.y, -relativeVx, -relativeVy);
            //}
        }

        // 5. Natural Cooling
        this.heat -= 0.1;
        if (this.heat < 0) this.heat = 0;

        // Check for Overheat
        if (this.heat >= this.maxHeat) {
            this.exploded = true;
        }
    }

    draw(ctx) {
        ctx.save();

        // Translate to ship center and rotate
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Draw Ship Body (Triangle)
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Nose
        ctx.moveTo(this.size, 0);
        // Bottom Right
        ctx.lineTo(-this.size / 2, this.size / 2);
        // Bottom Center (Engine)
        ctx.lineTo(-this.size / 2, 0);
        // Bottom Left
        ctx.lineTo(-this.size / 2, -this.size / 2);
        // Close loop back to Nose
        ctx.closePath();
        ctx.stroke();

        // Draw Thrust Flame
        if (this.isThrusting) {
            ctx.strokeStyle = '#ffaa00';
            ctx.beginPath();
            ctx.moveTo(-this.size / 2, 0);
            // Flicker effect using random length
            ctx.lineTo(-this.size - (Math.random() * 10), 0);
            ctx.stroke();
        }

        ctx.restore();
    }
}
