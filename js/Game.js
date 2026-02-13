import { Ship } from './Ship.js';
import { InputHandler } from './InputHandler.js';
import { Atmosphere } from './Atmosphere.js';
import { Terrain } from './Terrain.js';
import { ParticleSystem } from './ParticleSystem.js';
import { Background } from './Background.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Dimensions
        this.screenWidth = 0;
        this.screenHeight = 0;
        this.worldWidth = 0;
        this.worldHeight = 0;

        this.camera = { x: 0, y: 0 };
        this.active = false;
        this.lastTime = 0;

        // Systems
        this.input = new InputHandler();
        this.particles = new ParticleSystem();
        this.background = null;
        this.ship = null;
        this.terrain = null;
        this.atmosphere = null;
        this.levelData = null; // Initialize to null

        // UI
        this.uiFuel = document.getElementById('hud-fuel');
        this.uiHeat = document.getElementById('hud-heat');
        this.uiAlt = document.getElementById('hud-alt');

        this.loop = this.loop.bind(this);
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        // 1. Get the pixel density (1 on standard, 2+ on Retina/Mac)
        const dpr = window.devicePixelRatio || 1;

        // 2. Update Logical Size (CSS Pixels)
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;

        // 3. Set Canvas CSS size (Logical)
        this.canvas.style.width = `${this.screenWidth}px`;
        this.canvas.style.height = `${this.screenHeight}px`;

        // 4. Set Canvas Buffer size (Physical - High Res)
        this.canvas.width = Math.floor(this.screenWidth * dpr);
        this.canvas.height = Math.floor(this.screenHeight * dpr);

        // 5. Normalize Coordinate System
        // We scale the context so 1 unit in code equals 1 CSS pixel,
        // but it draws using the higher pixel density.
        this.ctx.scale(dpr, dpr);
    }

    start(levelData) {
        this.resize(); // Ensure size is correct before starting

        // FIX: Store levelData so update() can access gravity later
        this.levelData = levelData;

        this.worldWidth = levelData.width;
        this.worldHeight = levelData.height;

        this.terrain = new Terrain(levelData.terrain, this.worldWidth, this.worldHeight, levelData.color);
        this.atmosphere = new Atmosphere(levelData.atmosphere, this.worldHeight);

        const startPos = levelData.ship_start || { x: 100, y: 0 };
        this.ship = new Ship(startPos.x, startPos.y);
        if (startPos.angle !== undefined) this.ship.angle = startPos.angle;
        if (startPos.vx !== undefined) this.ship.vx = startPos.vx;

        // Stars need screen dimensions to know where to wrap
        this.background = new Background(this.screenWidth, this.screenHeight);

        this.particles.clear();
        this.atmosphere.initFeatures(this.particles, this.worldWidth);

        this.active = true;
        this.lastTime = 0; // Reset timer
        requestAnimationFrame(this.loop);
    }

    stop() {
        this.active = false;
    }

    loop(timestamp) {
        if (!this.active) return;

        // Safety for first frame to prevent huge dt
        if (!this.lastTime) this.lastTime = timestamp;

        // Calculate Delta Time (Seconds passed)
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Cap dt to prevent spiraling physics if tab is inactive
        if (dt > 0.1) dt = 0.016;

        this.update(dt);
        this.draw();

        requestAnimationFrame(this.loop);
    }

    update(dt) {
        const gravity = this.levelData.gravity || 0.03;
        const step = dt * 60;

        // 1. Update Ship
        this.ship.update(this.input, gravity, this.worldWidth, this.worldHeight, this.atmosphere, this.terrain, dt);

        // 2. NEW: Generate Friction Sparks for the Ship
        if (this.atmosphere && !this.ship.isDead) {
            const layer = this.atmosphere.getLayerAt(this.ship.y);
            if (layer.viscosity > 0) {
                const relativeVx = this.ship.vx - (layer.wind || 0);
                const relativeVy = this.ship.vy;
                const speed = Math.sqrt(relativeVx * relativeVx + relativeVy * relativeVy);

                // Only spawn sparks if moving fast enough through thick air
                const sparkChance = speed * layer.viscosity * 4.0;
                if (Math.random() < sparkChance * step) {
                    // Create spark traveling opposite to ship direction
                    this.particles.createFrictionSpark(
                        this.ship.x,
                        this.ship.y,
                        -relativeVx * 0.2 + (layer.wind || 0),
                        -relativeVy * 0.2
                    );
                }
            }
        }

        // 3. Update Systems
        this.atmosphere.update(this.particles, this.worldWidth, this.worldHeight, dt);
        this.particles.update(gravity, this.worldWidth, this.atmosphere, this.terrain, this.ship, dt);

        // ... rest of update (camera, death checks, UI) remains the same ...
        this.camera.x = this.ship.x - this.screenWidth / 2;
        this.camera.y = this.ship.y - this.screenHeight / 2;

        if (this.ship.exploded && !this.ship.isDead) {
            this.ship.isDead = true;
            this.particles.createExplosion(this.ship.x, this.ship.y, this.ship.vx, this.ship.vy, "#ff5500", 40);
            this.handleCrash("VEHICLE DESTROYED");
        }

        if (this.ship.landed) {
            this.handleLevelComplete();
        }

        this.updateUI();
    }

    updateUI() {
        if (this.uiFuel) this.uiFuel.innerText = Math.floor(this.ship.fuel);

        if (this.uiHeat) {
            // Text Color based on heat
            const heatPct = (this.ship.heat / this.ship.maxHeat);
            this.uiHeat.innerText = Math.floor(this.ship.heat);
            if (heatPct > 0.8) this.uiHeat.style.color = '#ff0000';
            else if (heatPct > 0.5) this.uiHeat.style.color = '#ffaa00';
            else this.uiHeat.style.color = '#00ff00';
        }

        if (this.uiAlt) {
            const ground = this.terrain.getHeightAt(this.ship.x);
            const alt = Math.max(0, Math.floor(ground.y - this.ship.y - (this.ship.size/2)));
            this.uiAlt.innerText = alt;
        }
    }

    draw() {
        // Clear using logical coordinates (screenWidth is CSS pixels)
        this.ctx.clearRect(0, 0, this.screenWidth, this.screenHeight);

        // 1. Draw Background (Screen Space)
        if (this.background) {
            this.background.draw(this.ctx, this.camera.x, this.camera.y);
        }

        // 2. Draw World (Camera Space)
        const cameraX = this.ship.x - this.screenWidth / 2;
        const cameraY = this.ship.y - this.screenHeight / 2;

        const drawWorldLayer = (offsetX) => {
            this.ctx.save();
            this.ctx.translate(offsetX - cameraX, -cameraY);

            if (this.atmosphere) this.atmosphere.draw(this.ctx, this.worldWidth);
            this.particles.draw(this.ctx, 1); // Background particles
            if (this.terrain) this.terrain.draw(this.ctx);
            this.particles.draw(this.ctx, 0); // Foreground particles
            if (!this.ship.isDead) this.ship.draw(this.ctx);

            this.ctx.restore();
        };

        // Render World & Wraps
        drawWorldLayer(0);
        if (this.ship.x < this.screenWidth) drawWorldLayer(-this.worldWidth);
        if (this.ship.x > this.worldWidth - this.screenWidth) drawWorldLayer(this.worldWidth);

        // 3. Draw UI (Screen Space)
        this.drawRadar();
    }

    drawRadar() {
        const radarW = 200;
        const radarH = 10;
        const centerX = this.screenWidth / 2;
        const radarX = centerX - (radarW / 2);
        const radarY = 40;

        // Radar Box
        this.ctx.fillStyle = "rgba(0, 40, 0, 0.6)";
        this.ctx.fillRect(radarX, radarY, radarW, radarH);
        this.ctx.strokeStyle = "#00ff00";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(radarX, radarY, radarW, radarH);

        // Pads
        this.ctx.fillStyle = "#ffffff";
        if (this.terrain) {
            this.terrain.pads.forEach(pad => {
                const padX = (pad.x / this.worldWidth) * radarW;
                this.ctx.fillRect(radarX + padX - 2, radarY, 4, radarH);
            });
        }

        // Ship Blip
        const shipX = (this.ship.x / this.worldWidth) * radarW;
        this.ctx.fillStyle = "#00ff00";
        this.ctx.fillRect(radarX + shipX - 1, radarY - 4, 2, 18);

        // Text Info
        this.ctx.font = "bold 16px Courier New";
        this.ctx.textAlign = "center";
        let layerName = "SPACE";
        if (this.atmosphere) {
            const currentLayer = this.atmosphere.getLayerAt(this.ship.y);
            layerName = currentLayer.name.toUpperCase();
        }

        // Outline text
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = "black";
        this.ctx.strokeText(layerName, centerX, radarY + 35);
        this.ctx.fillStyle = "white";
        this.ctx.fillText(layerName, centerX, radarY + 35);

        // Speed Indicators
        this.ctx.font = "14px Courier New";

        this.ctx.textAlign = "right";
        const hText = `H.SPEED: ${this.ship.vx.toFixed(1)}`;
        this.ctx.strokeText(hText, centerX - 120, radarY + 10);
        this.ctx.fillStyle = Math.abs(this.ship.vx) > 5 ? "#ff5555" : "white";
        this.ctx.fillText(hText, centerX - 120, radarY + 10);

        this.ctx.textAlign = "left";
        const vText = `V.SPEED: ${this.ship.vy.toFixed(1)}`;
        this.ctx.strokeText(vText, centerX + 120, radarY + 10);
        this.ctx.fillStyle = this.ship.vy > 5 ? "#ff5555" : "white";
        this.ctx.fillText(vText, centerX + 120, radarY + 10);
    }

    handleLevelComplete() {
        this.active = false;
        document.getElementById('end-message').innerText = "SUCCESSFUL LANDING";
        document.getElementById('end-message').style.color = "#00ff00";
        document.getElementById('end-screen').classList.remove('hidden');
    }

    handleCrash(reason) {
        setTimeout(() => {
            this.active = false;
            document.getElementById('end-message').innerText = "CRITICAL FAILURE\n" + reason;
            document.getElementById('end-message').style.color = "#ff4444";
            document.getElementById('end-screen').classList.remove('hidden');
        }, 1500);
    }
}
