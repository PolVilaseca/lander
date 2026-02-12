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
        this.screenWidth = canvas.width;
        this.screenHeight = canvas.height;
        this.worldWidth = 0;
        this.worldHeight = 0;
        this.camera = { x: 0, y: 0 };
        this.active = false;
        this.input = new InputHandler();
        this.particles = new ParticleSystem();
        this.background = null;
        this.ship = null;
        this.terrain = null;
        this.atmosphere = null;
        this.uiFuel = document.getElementById('hud-fuel');
        this.uiHeat = document.getElementById('hud-heat');
        this.uiAlt = document.getElementById('hud-alt');
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
        this.particles.clear();
        this.terrain = new Terrain(levelData.terrain, this.worldWidth, this.worldHeight, levelData.color || "#ffffff");
        this.atmosphere = new Atmosphere(levelData.atmosphere, this.worldHeight);
        this.background = new Background(this.screenWidth, this.screenHeight, 150);
        this.atmosphere.initFeatures(this.particles, this.worldWidth);

        const startPos = levelData.ship_start || { x: 500, y: 100 };
        this.ship = new Ship(startPos.x, startPos.y);
        this.ship.vx = startPos.vx || 0;
        this.ship.vy = startPos.vy || 0;
        this.ship.heat = 0;
        this.ship.fuel = 100;
        this.ship.exploded = false;
        this.ship.isDead = false;

        this.active = true;
        requestAnimationFrame(this.loop);
    }

    update() {
        if (!this.active) return;

        if (this.ship.exploded && !this.ship.isDead) {
            this.ship.isDead = true;
            this.particles.createExplosion(this.ship.x, this.ship.y, this.ship.vx, this.ship.vy, "#ff5500", 40);
            this.handleCrash("SHIP DESTROYED");
        }

        if (!this.ship.isDead) {
            const currentLayer = this.atmosphere.getLayerAt(this.ship.y);
            this.ship.applyAtmosphere(currentLayer, this.particles);
            this.ship.update(this.input, this.levelData.gravity, this.worldWidth, this.worldHeight);
            const ground = this.terrain.getHeightAt(this.ship.x);
            if (this.ship.y + (this.ship.size / 2) >= ground.y) {
                this.checkLanding(ground);
            }
        }

        // UPDATE PARTICLES (Now with Meteorite Physics/Collision)
        this.particles.update(
            this.levelData.gravity,
            this.worldWidth,
            this.atmosphere, // Passed for Sparks
            this.terrain,    // Passed for Collision
            this.ship        // Passed for Collision
        );

        if (this.atmosphere) this.atmosphere.update(this.particles, this.worldWidth, this.worldHeight);

        this.camera.x = this.ship.x - this.screenWidth / 2;
        this.camera.y = this.ship.y - this.screenHeight / 2;

        const heatPercent = this.ship.heat / this.ship.maxHeat;
        this.uiHeat.innerText = Math.floor(this.ship.heat);
        if (heatPercent > 0.8) {
            this.uiHeat.style.color = "#ff0000";
            this.uiHeat.style.textShadow = "0 0 5px red";
        } else if (heatPercent > 0.5) {
            this.uiHeat.style.color = "#ffaa00";
            this.uiHeat.style.textShadow = "none";
        } else {
            this.uiHeat.style.color = "#00ff00";
            this.uiHeat.style.textShadow = "none";
        }
        this.uiFuel.innerText = Math.max(0, Math.floor(this.ship.fuel));
        const groundUnder = this.terrain.getHeightAt(this.ship.x);
        const alt = Math.max(0, Math.floor(groundUnder.y - this.ship.y - (this.ship.size/2)));
        this.uiAlt.innerText = alt;
    }

    checkLanding(ground) {
        const speedV = this.ship.vy;
        const speedH = Math.abs(this.ship.vx);
        const angleDiff = Math.abs(this.ship.angle - (-Math.PI/2));
        const isSoft = speedV < 5.0 && speedH < 5.0;
        const isUpright = true;

        if (ground.isPad && isSoft && isUpright) {
            this.handleLevelComplete();
        } else {
            this.ship.exploded = true;
        }
    }

    draw() {
        this.ctx.fillStyle = '#050505';
        this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
        if (this.background) this.background.draw(this.ctx, this.camera.x, this.camera.y);

        const cameraX = this.ship.x - this.screenWidth / 2;
        const cameraY = this.ship.y - this.screenHeight / 2;

        const drawWorldLayer = (offsetX) => {
            this.ctx.save();
            this.ctx.translate(offsetX - cameraX, -cameraY);
            if (this.atmosphere) this.atmosphere.draw(this.ctx, this.worldWidth);
            if (this.terrain) this.terrain.draw(this.ctx);
            this.particles.draw(this.ctx, 0);
            if (!this.ship.isDead) this.ship.draw(this.ctx);
            this.particles.draw(this.ctx, 1);
            this.ctx.restore();
        };

        drawWorldLayer(0);
        if (this.ship.x < this.screenWidth) drawWorldLayer(-this.worldWidth);
        if (this.ship.x > this.worldWidth - this.screenWidth) drawWorldLayer(this.worldWidth);

        this.drawRadar();
    }

    drawRadar() {
        const radarW = 200;
        const radarH = 10;
        const centerX = this.screenWidth / 2;
        const radarX = centerX - (radarW / 2);
        const radarY = 40;
        this.ctx.fillStyle = "rgba(0, 40, 0, 0.6)";
        this.ctx.fillRect(radarX, radarY, radarW, radarH);
        this.ctx.strokeStyle = "#00ff00";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(radarX, radarY, radarW, radarH);
        this.ctx.fillStyle = "#ffffff";
        if (this.terrain) {
            this.terrain.pads.forEach(pad => {
                const padX = (pad.x / this.worldWidth) * radarW;
                this.ctx.fillRect(radarX + padX - 2, radarY, 4, radarH);
            });
        }
        const shipX = (this.ship.x / this.worldWidth) * radarW;
        this.ctx.fillStyle = "#00ff00";
        this.ctx.fillRect(radarX + shipX - 1, radarY - 4, 2, 18);
        this.ctx.font = "bold 16px Courier New";
        this.ctx.textAlign = "center";
        let layerName = "SPACE";
        if (this.atmosphere) {
            const currentLayer = this.atmosphere.getLayerAt(this.ship.y);
            layerName = currentLayer.name.toUpperCase();
        }
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = "black";
        this.ctx.strokeText(layerName, centerX, radarY + 35);
        this.ctx.fillStyle = "white";
        this.ctx.fillText(layerName, centerX, radarY + 35);
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

    // ... rest of methods
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
