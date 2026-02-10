export class Atmosphere {
    constructor(layersData, gameHeight) {
        this.layers = layersData || [];
        this.gameHeight = gameHeight;

        // We need to calculate the actual Y coordinates for these layers.
        // In Canvas, Y=0 is top, Y=Height is bottom (ground).
        // The JSON defines height starting from the ground up.

        let currentAltitude = 0;
        this.processedLayers = this.layers.map(layer => {
            const bottomY = this.gameHeight - currentAltitude;
            const topY = bottomY - layer.height;

            // Update altitude for next layer
            currentAltitude += layer.height;

            return {
                ...layer,
                topY: topY,
                bottomY: bottomY
            };
        });
    }

    getLayerAt(shipY) {
        // Find which layer covers this Y position
        // If we are above all layers, we are in "Space" (default params)
        const layer = this.processedLayers.find(l => shipY >= l.topY && shipY <= l.bottomY);

        if (layer) return layer;

        // Default "Space" parameters if above atmosphere
        return {
            name: "Deep Space",
            viscosity: 0,
            wind: 0,
            heat_friction: 0
        };
    }

    draw(ctx, width) {
        this.processedLayers.forEach(layer => {
            const height = layer.bottomY - layer.topY;

            ctx.fillStyle = layer.color;
            ctx.fillRect(0, layer.topY, width, height);

            // Draw wind particles or label (Optional Debug)
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            ctx.font = "12px Courier";
            ctx.fillText(`${layer.name} (Wind: ${layer.wind})`, 10, layer.bottomY - 10);
        });
    }



    update(particleSystem, width, height) {
        // Chance to spawn a wind particle
        // We iterate layers to find windy ones
        this.processedLayers.forEach(layer => {
            if (Math.abs(layer.wind) > 0.5) {
                // Higher wind = more particles
                const chance = Math.abs(layer.wind) * 0.05;

                if (Math.random() < chance) {
                    // Random Y within this layer
                    const y = layer.topY + Math.random() * (layer.bottomY - layer.topY);
                    const x = Math.random() * width;

                    // Color based on wind intensity (Blue/White)
                    const alpha = Math.min(0.8, Math.abs(layer.wind) / 10); // Higher alpha cap
                    const color = `rgba(220, 240, 255, ${alpha})`; // Whiter, brighter

                    particleSystem.createWindParticle(x, y, layer.wind, color);
                }
            }
        });
    }
}
