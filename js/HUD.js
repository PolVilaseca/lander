export class HUD {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = 80; // Height of the top bar

        // State to render
        this.ship = null;
        this.terrain = null;
        this.atmosphere = null;
        this.particles = null;
    }

    resize(width, height) {
        this.width = width;
    }

    update(ship, terrain, atmosphere, particles) {
        this.ship = ship;
        this.terrain = terrain;
        this.atmosphere = atmosphere;
        this.particles = particles;
    }

    draw(ctx) {
        if (!this.ship) return;

        ctx.save();

        // 1. Calculate Centered Panel Dimensions
        const maxHudWidth = 800;
        const hudW = Math.min(this.width - 20, maxHudWidth);
        const hudX = (this.width - hudW) / 2;
        const hudY = 0;

        // 2. Panel Background
        ctx.fillStyle = "rgba(0, 20, 40, 0.85)";
        ctx.fillRect(hudX, hudY, hudW, this.height);

        // 3. Panel Border (Bracket Style)
        ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
        ctx.lineWidth = 2;
        ctx.strokeRect(hudX, hudY, hudW, this.height);

        // Corner Accents
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 2;
        const cornerLen = 10;

        ctx.beginPath();
        // Bottom Left
        ctx.moveTo(hudX, hudY + this.height - cornerLen);
        ctx.lineTo(hudX, hudY + this.height);
        ctx.lineTo(hudX + cornerLen, hudY + this.height);
        // Bottom Right
        ctx.moveTo(hudX + hudW - cornerLen, hudY + this.height);
        ctx.lineTo(hudX + hudW, hudY + this.height);
        ctx.lineTo(hudX + hudW, hudY + this.height - cornerLen);
        ctx.stroke();

        // 4. Draw Sections inside the Panel
        const sectionW = hudW / 3;

        this.drawSystemStatus(ctx, hudX, hudY, sectionW, this.height);
        this.drawRadar(ctx, hudX + sectionW, hudY, sectionW, this.height);
        this.drawTelemetry(ctx, hudX + sectionW * 2, hudY, sectionW, this.height);

        ctx.restore();
    }

    drawSystemStatus(ctx, x, y, w, h) {
        const padding = 15;
        const barHeight = 10;
        const startX = x + padding;
        const labelW = 40;
        const valueX = startX + labelW;
        const barW = w - labelW - padding - 45;

        ctx.font = "bold 12px Courier New";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        // -- FUEL --
        const fuelY = y + 25;
        ctx.fillStyle = "#00ff00";
        ctx.fillText("FUEL", startX, fuelY);

        ctx.fillStyle = "rgba(0, 50, 0, 0.5)";
        ctx.fillRect(valueX, fuelY - 5, barW, barHeight);

        const fuelPct = Math.max(0, this.ship.fuel / 100);
        ctx.fillStyle = fuelPct < 0.2 ? "#ff0000" : "#00ff00";
        ctx.fillRect(valueX, fuelY - 5, barW * fuelPct, barHeight);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(`${Math.floor(this.ship.fuel)}%`, valueX + barW + 5, fuelY);

        // -- HEAT --
        const heatY = y + 45;
        ctx.fillStyle = "#00ff00";
        ctx.fillText("HEAT", startX, heatY);

        ctx.fillStyle = "rgba(0, 50, 0, 0.5)";
        ctx.fillRect(valueX, heatY - 5, barW, barHeight);

        const heatVal = Math.max(0, this.ship.heat);
        const heatPct = Math.min(1, heatVal / this.ship.maxHeat);

        let heatColor = "#00ff00";
        if (heatPct > 0.5) heatColor = "#ffff00";
        if (heatPct > 0.8) heatColor = "#ff0000";

        ctx.fillStyle = heatColor;
        ctx.fillRect(valueX, heatY - 5, barW * heatPct, barHeight);

        ctx.fillStyle = heatPct > 0.8 ? "#ff0000" : "#ffffff";
        ctx.fillText(`${Math.floor(heatVal)}%`, valueX + barW + 5, heatY);

        // -- ALTITUDE --
        const altY = y + 65;
        let alt = 0;
        if (this.terrain) {
            const ground = this.terrain.getHeightAt(this.ship.x);
            alt = Math.max(0, Math.floor(ground.y - this.ship.y - (this.ship.size/2)));
        }
        ctx.fillStyle = "#00ff00";
        ctx.fillText(`ALT: ${alt}m`, startX, altY);
    }

    drawRadar(ctx, x, y, w, h) {
        // Radar Box
        const radarW = w - 20;
        // CHANGE: Height is 40% of original area (h - 20)
        const radarH = (h - 20) * 0.4;

        const radarX = x + 10;
        const radarY = y + 10;

        // Background
        ctx.fillStyle = "rgba(0, 10, 0, 0.5)";
        ctx.fillRect(radarX, radarY, radarW, radarH);

        // Borders (Bracket Style)
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 1;
        ctx.strokeRect(radarX, radarY, radarW, radarH);

        if (this.terrain) {
            const worldW = this.terrain.width;

            // 1. Draw Pads (White)
            ctx.fillStyle = "#ffffff";
            this.terrain.pads.forEach(pad => {
                const px = (pad.x / worldW) * radarW;
                const padH = radarH * 0.4;
                ctx.fillRect(radarX + px - 2, radarY + (radarH - padH)/2, 4, padH);
            });

            // 2. Draw Space Stations (Cyan)
            if (this.particles) {
                ctx.fillStyle = "#00ffff";
                this.particles.particles.forEach(p => {
                    if (p.type === 'station') {
                        const sx = (p.x / worldW) * radarW;
                        const stH = radarH * 0.6;
                        ctx.fillRect(radarX + sx - 2, radarY + (radarH - stH)/2, 4, stH);
                    }
                });
            }

            // 3. Draw Ship (Green)
            const shipX = (this.ship.x / worldW) * radarW;
            ctx.fillStyle = "#00ff00";
            if (Math.floor(Date.now() / 500) % 2 === 0) {
                ctx.fillStyle = "#aaffaa";
            }
            // Ship marker height scales with radar
            ctx.fillRect(radarX + shipX - 3, radarY + 2, 6, radarH - 4);
        }

        // 4. Current Layer Text (MOVED BELOW RADAR)
        ctx.fillStyle = "#ffffff";
        // Larger Font
        ctx.font = "bold 16px Courier New";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        let layerName = "SPACE";
        if (this.atmosphere) {
            const currentLayer = this.atmosphere.getLayerAt(this.ship.y);
            layerName = currentLayer.name.toUpperCase();
        }

        // Position centered in the space remaining below the radar
        const remainingSpaceY = radarY + radarH;
        const remainingSpaceH = (y + h) - remainingSpaceY;
        const textY = remainingSpaceY + remainingSpaceH / 2;

        ctx.fillText(layerName, radarX + radarW/2, textY);
    }

    drawTelemetry(ctx, x, y, w, h) {
        const centerX = x + w / 2;
        const centerY = y + h / 2;

        ctx.font = "bold 16px Courier New";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // V. SPEED (Top)
        const vSpeed = this.ship.vy.toFixed(1);
        let vColor = "#00ff00";
        if (this.ship.vy > 3) vColor = "#ff0000";
        else if (this.ship.vy < -3) vColor = "#ffff00";

        ctx.fillStyle = vColor;
        ctx.fillText(`V.SPD ${vSpeed}`, centerX, centerY - 15);

        // Arrow Indicator
        ctx.font = "14px Courier New";
        if (this.ship.vy > 0.1) ctx.fillText("▼", centerX, centerY);
        else if (this.ship.vy < -0.1) ctx.fillText("▲", centerX, centerY);
        else ctx.fillText("-", centerX, centerY);

        // H. SPEED (Bottom)
        const hSpeed = Math.abs(this.ship.vx).toFixed(1);
        let hColor = "#00ff00";
        if (Math.abs(this.ship.vx) > 3) hColor = "#ff0000";

        ctx.font = "bold 16px Courier New";
        ctx.fillStyle = hColor;
        ctx.fillText(`H.SPD ${hSpeed}`, centerX, centerY + 15);
    }
}
