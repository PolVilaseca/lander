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

        // Screen vs World Dimensions
        this.screenWidth = canvas.width;
        this.screenHeight = canvas.height;
        this.worldWidth = 0;
        this.worldHeight = 0;

        this.camera = { x: 0, y: 0 };
        this.active = false;

        // Core Systems
        this.input = new InputHandler();
        this.particles = new ParticleSystem();
        this.background = null;
        this.ship = null;
        this.terrain = null;
        this.atmosphere = null;

        // UI Elements
        this.uiFuel = document.getElementById('hud-fuel');
        this.uiHeat = document.getElementById('hud-heat');
        this.uiAlt = document.getElementById('hud-alt');

        // Bindings
        this.loop = this.loop.bind(this);
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;
        this.canvas.width = this.screenWidth;
        this.canvas.height = this.screenHeight;
    }

    start(levelData) {
        this.levelData = levelData;
        this.resize();

        this.worldWidth = levelData.width || 3000;
        this.worldHeight = levelData.height || 2000;

        // Initialize Level Content
        this.terrain = new Terrain(
            levelData.terrain,
            this.worldWidth,
            this.worldHeight,
            levelData.color || "#ffffff" // Default to white
        );
        this.atmosphere = new Atmosphere(levelData.atmosphere, this.worldHeight);
        this.background = new Background(this.screenWidth, this.screenHeight, 150);

        const startPos = levelData.ship_start || { x: 500, y: 100 };
        this.ship = new Ship(startPos.x, startPos.y);

        this.active = true;
        requestAnimationFrame(this.loop);
    }

    update() {
        if (!this.active) return;

        // 1. Handle Explosion State
        if (this.ship.exploded && !this.ship.isDead) {
            this.ship.isDead = true;
            this.particles.createExplosion(this.ship.x, this.ship.y, this.ship.vx, this.ship.vy, "#ff5500", 40);
            this.handleCrash("SHIP DESTROYED");
        }

        // 2. Physics & Logic (only if alive)
        if (!this.ship.isDead) {
            const currentLayer = this.atmosphere.getLayerAt(this.ship.y);
            this.ship.applyAtmosphere(currentLayer, this.particles);
            this.ship.update(this.input, this.levelData.gravity, this.worldWidth, this.worldHeight);

            // Collision Detection
            const ground = this.terrain.getHeightAt(this.ship.x);
            if (this.ship.y + (this.ship.size / 2) >= ground.y) {
                this.checkLanding(ground);
            }
        }

        // 3. Systems Update
        this.particles.update(this.levelData.gravity, this.worldWidth);
        if (this.atmosphere) this.atmosphere.update(this.particles, this.worldWidth, this.worldHeight);

        // 4. Camera Follow
        this.camera.x = this.ship.x - this.screenWidth / 2;
        this.camera.y = this.ship.y - this.screenHeight / 2;

        // 5. UI HUD Update
        this.uiFuel.innerText = Math.max(0, Math.floor(this.ship.fuel));
        this.uiHeat.innerText = Math.floor(this.ship.heat);

        const groundUnder = this.terrain.getHeightAt(this.ship.x);
        const alt = Math.max(0, Math.floor(groundUnder.y - this.ship.y - (this.ship.size/2)));
        this.uiAlt.innerText = alt;
    }

    checkLanding(ground) {
        const speedV = this.ship.vy;
        const speedH = Math.abs(this.ship.vx);
        const angleDiff = Math.abs(this.ship.angle - (-Math.PI/2));

        const isSoft = speedV < 4.0 && speedH < 4.0;
        const isUpright = angleDiff < 0.25;

        if (ground.isPad && isSoft && isUpright) {
            this.handleLevelComplete();
        } else {
            this.ship.exploded = true; // Trigger explosion in next update
        }
    }

    draw() {
        this.ctx.fillStyle = '#050505';
        this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

        // 1. DRAW BACKGROUND (Screen Space - No Camera Translation yet)
        // This ensures stars are always covering the screen
        if (this.background) this.background.draw(this.ctx, this.camera.x, this.camera.y);

        // 2. SETUP WORLD DRAWING
        const cameraX = this.ship.x - this.screenWidth / 2;
        const cameraY = this.ship.y - this.screenHeight / 2;

        const drawWorldLayer = (offsetX) => {
            this.ctx.save();
            // Translate Camera + Wrap Offset
            this.ctx.translate(offsetX - cameraX, -cameraY);

            // Draw World Elements
            if (this.atmosphere) this.atmosphere.draw(this.ctx, this.worldWidth);
            if (this.terrain) this.terrain.draw(this.ctx);

            // Draw Particles (Wind/Explosions/Sparks)
            // They are in World Coordinates, so we draw them here
            this.particles.draw(this.ctx);

            if (!this.ship.isDead) this.ship.draw(this.ctx);

            this.ctx.restore();
        };

        // 3. RENDER WORLD (Center, Left, Right)
        drawWorldLayer(0); // Center

        if (this.ship.x < this.screenWidth) {
            drawWorldLayer(-this.worldWidth); // Left Neighbor
        }

        if (this.ship.x > this.worldWidth - this.screenWidth) {
            drawWorldLayer(this.worldWidth); // Right Neighbor
        }

        // 4. UI
        this.drawRadar();
    }

    drawRadar() {
        const radarW = 200;
        const radarH = 10;
        const centerX = this.screenWidth / 2;
        const radarX = centerX - (radarW / 2);
        const radarY = 40;

        // --- 1. RADAR ---
        this.ctx.fillStyle = "rgba(0, 40, 0, 0.6)";
        this.ctx.fillRect(radarX, radarY, radarW, radarH);
        this.ctx.strokeStyle = "#00ff00";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(radarX, radarY, radarW, radarH);

        // Pads
        this.ctx.fillStyle = "#ffffff";
        this.terrain.pads.forEach(pad => {
            const padX = (pad.x / this.worldWidth) * radarW;
            this.ctx.fillRect(radarX + padX - 2, radarY, 4, radarH);
        });

        // Ship
        const shipX = (this.ship.x / this.worldWidth) * radarW;
        this.ctx.fillStyle = "#00ff00";
        this.ctx.fillRect(radarX + shipX - 1, radarY - 4, 2, 18);

        // --- 2. TEXT INFO (Below Radar) ---
        this.ctx.font = "14px Courier New";
        this.ctx.textAlign = "center";

        // Atmosphere Name
        const currentLayer = this.atmosphere.getLayerAt(this.ship.y);
        this.ctx.fillStyle = currentLayer.color || "#aaa";
        this.ctx.fillText(currentLayer.name.toUpperCase(), centerX, radarY + 30);

        // --- 3. SPEED INDICATORS (Left/Right of Radar) ---

        // Horizontal Speed (VX)
        this.ctx.textAlign = "right";
        this.ctx.fillStyle = Math.abs(this.ship.vx) > 1.5 ? "red" : "white";
        this.ctx.fillText(`H.SPEED: ${this.ship.vx.toFixed(1)}`, radarX - 20, radarY + 10);

        // Vertical Speed (VY)
        this.ctx.textAlign = "left";
        this.ctx.fillStyle = this.ship.vy > 2.0 ? "red" : "white"; // Red if falling too fast
        this.ctx.fillText(`V.SPEED: ${this.ship.vy.toFixed(1)}`, radarX + radarW + 20, radarY + 10);
    }

    handleLevelComplete() {
        this.active = false;
        document.getElementById('end-message').innerText = "SUCCESSFUL LANDING";
        document.getElementById('end-message').style.color = "#00ff00";
        document.getElementById('end-screen').classList.remove('hidden');
    }

    handleCrash(reason) {
        // We don't stop 'active' immediately so the explosion particles can finish
        setTimeout(() => {
            this.active = false;
            document.getElementById('end-message').innerText = "CRITICAL FAILURE\n" + reason;
            document.getElementById('end-message').style.color = "#ff4444";
            document.getElementById('end-screen').classList.remove('hidden');
        }, 2000);
    }

    loop() {
        if (!this.active) return;
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }

    stop() {
        this.active = false;
    }
}
