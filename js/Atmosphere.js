export class Atmosphere {
    constructor(layersData, gameHeight) {
        this.layers = layersData || [];
        this.gameHeight = gameHeight;

        let currentAltitude = 0;
        this.processedLayers = this.layers.map(layer => {
            const bottomY = this.gameHeight - currentAltitude;
            const topY = bottomY - layer.height;
            currentAltitude += layer.height;

            return {
                ...layer,
                topY: topY,
                bottomY: bottomY
            };
        });
    }

    initFeatures(particleSystem, worldWidth) {
        this.processedLayers.forEach(layer => {
            if (!layer.features) return;

            if (layer.features.clouds) {
                const cfg = layer.features.clouds;
                const count = cfg.count || 10;

                const opacity = cfg.opacity || 0.4;
                const cloudColor = `rgba(120, 120, 120, ${opacity})`;

                for(let i=0; i<count; i++) {
                    const x = Math.random() * worldWidth;
                    const margin = (layer.bottomY - layer.topY) * 0.1;
                    const y = layer.topY + margin + Math.random() * (layer.bottomY - layer.topY - margin*2);

                    const size = cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize);

                    const windSpeed = layer.wind || 0;
                    const speedVariation = 0.8 + Math.random() * 0.4;
                    const speed = windSpeed * speedVariation;

                    particleSystem.createCloud(x, y, speed, cloudColor, size);
                }
            }
        });
    }

    getLayerAt(shipY) {
        const layer = this.processedLayers.find(l => shipY >= l.topY && shipY <= l.bottomY);
        if (layer) return layer;
        return {
            name: "Deep Space",
            viscosity: 0,
            wind: 0,
            heat_friction: 0,
            color: "rgba(0,0,0,0)"
        };
    }

    draw(ctx, width) {
        this.processedLayers.forEach(layer => {
            const height = layer.bottomY - layer.topY;
            ctx.fillStyle = layer.color;
            ctx.fillRect(0, layer.topY, width, height);
        });
    }

    update(particleSystem, width, height) {
        this.processedLayers.forEach(layer => {
            // 1. WIND
            if (Math.abs(layer.wind) > 0.5) {
                const chance = Math.abs(layer.wind) * 0.05;
                if (Math.random() < chance) {
                    const y = layer.topY + Math.random() * (layer.bottomY - layer.topY);
                    const x = Math.random() * width;
                    const alpha = Math.min(0.8, Math.abs(layer.wind) / 10);
                    const color = `rgba(220, 240, 255, ${alpha})`;
                    particleSystem.createWindParticle(x, y, layer.wind, color);
                }
            }

            // 2. METEORITES
            // "Can be added in any layer... but always triggers spawning in deep space"
            if (layer.features && layer.features.meteorites) {
                const cfg = layer.features.meteorites;
                // rate is probability per frame
                if (Math.random() < (cfg.rate || 0.01)) {
                    // Spawn High Up (Top of world = 0)
                    // Or top of this layer? Prompt said "high in the deep space layer".
                    // We'll spawn at Y = -100 to ensure they come from "above" screen
                    const spawnY = -100;
                    const spawnX = Math.random() * width;

                    // Random Size
                    const size = 5 + Math.random() * (cfg.maxSize - 5 || 10);

                    // Velocity
                    const vxRange = cfg.velX || [-1, 1];
                    const vyRange = cfg.velY || [1, 3];

                    const vx = vxRange[0] + Math.random() * (vxRange[1] - vxRange[0]);
                    const vy = vyRange[0] + Math.random() * (vyRange[1] - vyRange[0]);

                    particleSystem.createMeteorite(spawnX, spawnY, vx, vy, size);
                }
            }
        });
    }
}
