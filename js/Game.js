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

        this.screenWidth = 0;
        this.screenHeight = 0;
        this.worldWidth = 0;
        this.worldHeight = 0;

        this.camera = { x: 0, y: 0 };
        this.active = false;
        this.lastTime = 0;

        this.input = new InputHandler();
        this.particles = new ParticleSystem();
        this.background = null;
        this.ship = null;
        this.terrain = null;
        this.atmosphere = null;
        this.levelData = null;

        this.uiFuel = document.getElementById('hud-fuel');
        this.uiHeat = document.getElementById('hud-heat');
        this.uiAlt = document.getElementById('hud-alt');

        this.loop = this.loop.bind(this);
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;

        this.canvas.style.width = `${this.screenWidth}px`;
        this.canvas.style.height = `${this.screenHeight}px`;

        this.canvas.width = Math.floor(this.screenWidth * dpr);
        this.canvas.height = Math.floor(this.screenHeight * dpr);

        this.ctx.scale(dpr, dpr);

        if (this.background) {
            this.background.resize(this.screenWidth, this.screenHeight);
        }
    }

    start(levelData) {
        this.resize();
        this.levelData = levelData;
        this.worldWidth = levelData.width;
        this.worldHeight = levelData.height;

        this.terrain = new Terrain(levelData.terrain, this.worldWidth, this.worldHeight, levelData.color);
        this.atmosphere = new Atmosphere(levelData.atmosphere, this.worldHeight);

        const startPos = levelData.ship_start || { x: 100, y: 0 };
        this.ship = new Ship(startPos.x, startPos.y);
        if (startPos.angle !== undefined) this.ship.angle = startPos.angle;
        if (startPos.vx !== undefined) this.ship.vx = startPos.vx;

        this.background = new Background(this.screenWidth, this.screenHeight);

        this.particles.clear();
        this.atmosphere.initFeatures(this.particles, this.worldWidth);

        // Spawn Space Stations
        if (levelData.space_stations) {
            levelData.space_stations.forEach(st => {
                // Convert Altitude to Y
                const y = this.worldHeight - st.altitude;
                // Random X position if not specified
                const x = st.x || (Math.random() * this.worldWidth);
                this.particles.createSpaceStation(x, y, st.speed, st.size);
            });
        }

        this.active = true;
        this.lastTime = 0;
        requestAnimationFrame(this.loop);
    }

    stop() {
        this.active = false;
    }

    loop(timestamp) {
        if (!this.active) return;
        if (!this.lastTime) this.lastTime = timestamp;

        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        if (dt > 0.1) dt = 0.016;

        this.update(dt);
        this.draw();

        requestAnimationFrame(this.loop);
    }

    update(dt) {
        const gravity = this.levelData.gravity || 0.03;
        const step = dt * 60;

        this.ship.update(this.input, gravity, this.worldWidth, this.worldHeight, this.atmosphere, this.terrain, dt);

        // Friction Sparks
        if (this.atmosphere && !this.ship.isDead) {
            const layer = this.atmosphere.getLayerAt(this.ship.y);
            if (layer.viscosity > 0) {
                const relativeVx = this.ship.vx - (layer.wind || 0);
                const relativeVy = this.ship.vy;
                const speed = Math.sqrt(relativeVx * relativeVx + relativeVy * relativeVy);

                const sparkChance = speed * layer.viscosity * 4;
                if (Math.random() < sparkChance * step) {
                    this.particles.createFrictionSpark(
                        this.ship.x,
                        this.ship.y,
                        -relativeVx * 0.2 + (layer.wind || 0),
                        -relativeVy * 0.2
                    );
                }
            }
        }

        this.atmosphere.update(this.particles, this.worldWidth, this.worldHeight, dt);
        this.particles.update(gravity, this.worldWidth, this.atmosphere, this.terrain, this.ship, dt);

        // CHECK SPACE STATION COLLISIONS / LANDING
        if (!this.ship.isDead && !this.ship.landed) {
            this.particles.particles.forEach(p => {
                if (p.type === 'station') {
                    this.checkStationInteraction(p);
                }
            });
        }

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

    checkStationInteraction(station) {
        // Simple Coordinate Rotation to Local Space
        const dx = this.ship.x - station.x;
        const dy = this.ship.y - station.y;

        // Rotate point backward by station angle to align with axis
        const cos = Math.cos(-station.angle);
        const sin = Math.sin(-station.angle);

        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        const halfSize = station.size / 2;

        // 1. COLLISION (Body + Panels)
        // Main Body Box (approx)
        if (Math.abs(localX) < halfSize + 5 && Math.abs(localY) < halfSize + 5) {
             // 2. LANDING CHECK (Top Side -> Local Y approx -halfSize)
             // Landing Pad is on the "Top" (Negative Y in local)
             // Ship must be:
             // - Within X width of pad (say 30% of size)
             // - Near the surface Y = -halfSize
             // - Low Relative Speed

             // Pad width factor
             const padWidth = station.size * 0.3;
             const isAbovePad = Math.abs(localX) < padWidth;
             const isTouchingSurface = Math.abs(localY - (-halfSize - this.ship.size/2)) < 5;

             if (isAbovePad && isTouchingSurface) {
                 // Check Velocities (Relative to station)
                 const relVx = this.ship.vx - station.vx;
                 const relVy = this.ship.vy - station.vy; // station.vy is 0 usually

                 // Check Angle (Ship should be aligned with station Up vector)
                 // Station Up is -PI/2 + angle. Ship Angle should match.
                 // Ship default up is -PI/2.
                 // So Ship Angle should be roughly -PI/2 + Station Angle
                 const targetAngle = -Math.PI/2 + station.angle;
                 let angleDiff = Math.abs(this.ship.angle - targetAngle);
                 // Normalize angle
                 while(angleDiff > Math.PI) angleDiff -= Math.PI*2;
                 angleDiff = Math.abs(angleDiff);

                 if (Math.abs(relVx) < 2.0 && Math.abs(relVy) < 2.0 && angleDiff < 0.5) {
                     this.ship.landed = true;
                     return;
                 }
             }

             // If not landing successfully, it's a crash
             this.ship.exploded = true;
             // Explode station too? (Effect only)
             this.particles.createExplosion(station.x, station.y, station.vx, 0, "#ffffff", 50);
             station.life = 0; // Destroy station
        }
    }

    updateUI() {
        if (this.uiFuel) this.uiFuel.innerText = Math.floor(this.ship.fuel);

        if (this.uiHeat) {
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
        this.ctx.clearRect(0, 0, this.screenWidth, this.screenHeight);

        if (this.background) {
            this.background.draw(this.ctx);
        }

        const cameraX = this.ship.x - this.screenWidth / 2;
        const cameraY = this.ship.y - this.screenHeight / 2;

        const drawWorldLayer = (offsetX) => {
            this.ctx.save();
            this.ctx.translate(offsetX - cameraX, -cameraY);

            if (this.atmosphere) this.atmosphere.draw(this.ctx, this.worldWidth);
            this.particles.draw(this.ctx, 1);
            if (this.terrain) this.terrain.draw(this.ctx);
            this.particles.draw(this.ctx, 0);
            if (!this.ship.isDead) this.ship.draw(this.ctx);

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
