export class Geyser {
    constructor(x, y, strength, frequency, color) {
        this.x = x;
        this.y = y;
        this.strength = strength;
        this.frequency = frequency;
        this.color = color || '#ffffff'; // Match terrain color

        // Eruption State
        this.erupting = false;
        this.timer = Math.random() * 5;
        this.eruptionDuration = 3.0;
        this.rechargeTime = 5.0 + Math.random() * 3.0;

        // Particles
        this.bubbles = [];
    }

    update(dt, ship) {
        this.timer += dt;

        // State Machine
        if (this.erupting) {
            // Spawn Bubbles
            if (Math.random() > 0.5) {
                this.bubbles.push({
                    x: this.x + (Math.random() - 0.5) * 10, // Narrower spout
                    y: this.y,
                    vx: (Math.random() - 0.5) * 10,
                    vy: -100 - Math.random() * 100,
                    size: 3 + Math.random() * 8,
                    alpha: 0.6,
                    life: 2.5
                });
            }

            if (this.timer > this.eruptionDuration) {
                this.erupting = false;
                this.timer = 0;
            }
        } else {
            const interval = this.frequency > 0 ? (1 / this.frequency) : 10;
            if (this.timer > interval) {
                this.erupting = true;
                this.timer = 0;
            }
        }

        // Update Bubbles
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const b = this.bubbles[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            b.alpha = (b.life / 2.5) * 0.5;

            // PHYSICS: Interact with Ship
            if (ship && !ship.isDead && !ship.landed) {
                const dx = ship.x - b.x;
                const dy = ship.y - b.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < ship.size + b.size + 10) {
                    // REDUCED STRENGTH (10x smaller multiplier)
                    // Was * 2.0, now * 0.2
                    ship.vy -= this.strength * dt * 0.2;

                    // Minor turbulence
                    ship.vx += (Math.random() - 0.5) * this.strength * dt * 0.1;
                }
            }

            if (b.life <= 0) {
                this.bubbles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        // Draw Vent (Triangle)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        // Triangle pointing up
        ctx.moveTo(this.x - 6, this.y + 2); // Left base
        ctx.lineTo(this.x + 6, this.y + 2); // Right base
        ctx.lineTo(this.x, this.y - 8);     // Tip
        ctx.fill();

        // Draw Bubbles
        this.bubbles.forEach(b => {
            // Whiteish/Blueish tint
            ctx.fillStyle = `rgba(200, 240, 255, ${b.alpha})`;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}
