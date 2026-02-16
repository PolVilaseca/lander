import { Ship } from './Ship.js';
import { InputHandler } from './InputHandler.js';
import { Atmosphere } from './Atmosphere.js';
import { Terrain } from './Terrain.js';
import { ParticleSystem } from './ParticleSystem.js';
import { Background } from './Background.js';
import { HUD } from './HUD.js'; // NEW IMPORT

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
        this.hud = new HUD(canvas); // NEW HUD

        this.background = null;
        this.ship = null;
        this.terrain = null;
        this.atmosphere = null;
        this.levelData = null;

        // REMOVED: Old DOM Elements (uiFuel, uiHeat, uiAlt)

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
        this.ctx.scale(dpr, dpr);

        // 6. Resize Systems
        if (this.background) {
            this.background.resize(this.screenWidth, this.screenHeight);
        }
        if (this.hud) {
            this.hud.resize(this.screenWidth, this.screenHeight);
        }
    }

    start(levelData) {
        this.levelData = levelData;

        // Stars need screen dimensions
        this.background = new Background(window.innerWidth, window.innerHeight);

        this.resize();

        this.worldWidth = levelData.width;
        this.worldHeight = levelData.height;

        // PASS FLAG TO TERRAIN
        this.terrain = new Terrain(
            levelData.terrain,
            this.worldWidth,
            this.worldHeight,
            levelData.color,
            levelData.start_on_ground
        );

        this.atmosphere = new Atmosphere(levelData.atmosphere, this.worldHeight);

        const startPos = levelData.ship_start || { x: 100, y: 0 };
        this.ship = new Ship(startPos.x, startPos.y);
        if (startPos.angle !== undefined) this.ship.angle = startPos.angle;
        if (startPos.vx !== undefined) this.ship.vx = startPos.vx;

        // OVERRIDE IF START ON GROUND
        if (levelData.start_on_ground && this.terrain.launchPadPosition) {
            this.ship.x = this.terrain.launchPadPosition.x;
            this.ship.y = this.terrain.launchPadPosition.y - this.ship.size - 2;
            this.ship.vx = 0;
            this.ship.vy = 0;
            this.ship.angle = -Math.PI / 2;
        }

        this.particles.clear();
        this.atmosphere.initFeatures(this.particles, this.worldWidth);

        if (levelData.space_stations) {
            levelData.space_stations.forEach(st => {
                const y = this.worldHeight - st.altitude;
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

        // 1. Update Ship
        this.ship.update(this.input, gravity, this.worldWidth, this.worldHeight, this.atmosphere, this.terrain, dt);

        // 2. Friction Sparks
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

        // 3. Update Systems
        this.atmosphere.update(this.particles, this.worldWidth, this.worldHeight, dt);
        this.particles.update(gravity, this.worldWidth, this.atmosphere, this.terrain, this.ship, dt);

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

        // UPDATE HUD STATE
        this.hud.update(this.ship, this.terrain, this.atmosphere, this.particles);
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
        const padWidth = station.size * 0.35;

        // Tolerance
        const landingTolerance = 4;

        // 1. CHECK TOP PAD
        const topDist = Math.abs(localY - (-halfSize - this.ship.size/2));
        if (Math.abs(localX) < padWidth && topDist < landingTolerance) {
             this.attemptStationLand(station, -Math.PI/2);
             return;
        }

        // 2. CHECK BOTTOM PAD
        const botDist = Math.abs(localY - (halfSize + this.ship.size/2));
        if (Math.abs(localX) < padWidth && botDist < landingTolerance) {
             this.attemptStationLand(station, Math.PI/2);
             return;
        }

        // 3. COLLISION
        if (Math.abs(localX) < halfSize + 2 && Math.abs(localY) < halfSize + 2) {
             this.crashStation(station);
        }
    }

    attemptStationLand(station, padLocalNormal) {
        const relVx = this.ship.vx - station.vx;
        const relVy = this.ship.vy - station.vy;

        const targetAngle = station.angle + padLocalNormal;

        let angleDiff = Math.abs(this.ship.angle - targetAngle);
        while(angleDiff > Math.PI) angleDiff -= Math.PI*2;
        angleDiff = Math.abs(angleDiff);

        if (Math.abs(relVx) < 2.5 && Math.abs(relVy) < 2.5 && angleDiff < 0.6) {
             this.ship.landed = true;
             this.ship.vx = station.vx;
             this.ship.vy = station.vy;
        } else {
             this.crashStation(station);
        }
    }

    crashStation(station) {
        this.ship.exploded = true;
        this.particles.createExplosion(station.x, station.y, station.vx, 0, "#ffffff", 50);
        station.life = 0;
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

    draw() {
        this.ctx.clearRect(0, 0, this.screenWidth, this.screenHeight);

        // 1. Draw Background
        if (this.background) {
            this.background.draw(this.ctx);
        }

        // 2. Draw World
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

        // 3. Draw HUD (New Class)
        this.hud.draw(this.ctx);
    }
}
