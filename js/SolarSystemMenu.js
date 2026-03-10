export class SolarSystemMenu {
    constructor(canvas, onPlayLevel, enforceProgression = true) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onPlayLevel = onPlayLevel;
        this.enforceProgression = enforceProgression;
        this.active = false;

        this.centerX = 0;
        this.centerY = 0;

        this.selectedPlanet = null;
        this.pulseAnim = 0;
        this.completedLevels = [];

        this.sun = { radius: 35, color: '#ffaa00', glow: '#ff5500' };

        this.stars = [];
        for(let i=0; i<150; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random(),
                size: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.5 + 0.3
            });
        }

        // --- NEW HIERARCHY ---
        this.planets = [
            {
                id: 1, name: "Terra Nova", desc: "Thick Atmosphere.\nWind Hazards.", color: "#4488ff", radius: 14, orbitRadius: 130, speed: 0.002, angle: Math.random() * 6.28,
                moons: [
                    { id: 2, name: "The Moon", desc: "Standard Mission.\nDusty surface.", color: "#eeeeee", radius: 6, orbitRadius: 38, speed: 0.0125, angle: 0 }
                ]
            },
            {
                id: 3, name: "Mars Outpost", desc: "High Gravity.\nRugged Terrain.", color: "#cc5500", radius: 13, orbitRadius: 235, speed: 0.00125, angle: Math.random() * 6.28,
                moons: [
                    { id: 4, name: "Luna Prime", desc: "Training Ground.\nLow Gravity.", color: "#bbbbbb", radius: 5, orbitRadius: 33, speed: 0.01, angle: 0 },
                    { id: 5, name: "Mars Sector", desc: "Meteor Showers.\nExtreme Danger.", color: "#ff3300", radius: 4, orbitRadius: 53, speed: 0.0075, angle: 2 }
                ]
            },
            {
                id: 6, name: "Venus", desc: "Acid Clouds.\nElectric Storms.", color: "#eebb00", radius: 15, orbitRadius: 290, speed: 0.0006, angle: Math.random() * 6.28,
                moons: []
            },
            {
                id: 7, name: "Earth Entry", desc: "Re-entry Mission.\nHome Base.", color: "#00bbff", radius: 16, orbitRadius: 395, speed: 0.0005, angle: Math.random() * 6.28,
                moons: [
                    { id: 8, name: "Enceladus", desc: "Ice World.\nGeyser Hazards.", color: "#aaccff", radius: 6, orbitRadius: 45, speed: 0.015, angle: 1 }
                ]
            }
        ];

        // Create a flat array of all playable bodies ordered by ID for easy progression logic
        this.allBodies = [];
        this.planets.forEach(p => {
            this.allBodies.push(p);
            p.moons.forEach(m => this.allBodies.push(m));
        });
        this.allBodies.sort((a, b) => a.id - b.id);

        this.handleInput = this.handleInput.bind(this);
        this.resize = this.resize.bind(this);
        window.addEventListener('resize', this.resize);
    }

    setProgress(completedIds) {
        this.completedLevels = completedIds;
    }

    // Now checks the absolute numerical order of the flat list
    getPlanetState(p) {
        if (!this.enforceProgression) {
            return this.completedLevels.includes(p.id) ? 'COMPLETED' : 'UNLOCKED';
        }
        if (this.completedLevels.includes(p.id)) return 'COMPLETED';

        let firstUncompletedIndex = this.allBodies.findIndex(body => !this.completedLevels.includes(body.id));
        if (firstUncompletedIndex === -1) firstUncompletedIndex = this.allBodies.length;

        const myIndex = this.allBodies.indexOf(p);
        if (myIndex === firstUncompletedIndex) return 'UNLOCKED';
        return 'LOCKED';
    }

    start() {
        this.active = true;
        this.selectedPlanet = null;
        this.pulseAnim = 0;
        this.resize();
        this.canvas.addEventListener('mousedown', this.handleInput);
        this.canvas.addEventListener('touchstart', this.handleInput, {passive: false});
        this.animate();
    }

    stop() {
        this.active = false;
        this.canvas.removeEventListener('mousedown', this.handleInput);
        this.canvas.removeEventListener('touchstart', this.handleInput);
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.ctx.scale(dpr, dpr);
        this.centerX = window.innerWidth / 2;
        this.centerY = window.innerHeight / 2;
    }

    handleInput(e) {
        if (!this.active) return;
        if (e.type === 'touchstart') e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();

        let clientX = e.clientX;
        let clientY = e.clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;


        // Purge Button
        const screenW = window.innerWidth;
        const screenH = window.innerHeight; // Get screen height
        const purgeBtnW = 140;
        const purgeBtnH = 30;
        const purgeBtnX = screenW - purgeBtnW - 20;
        const purgeBtnY = screenH - purgeBtnH - 20; // Anchor to bottom

        if (x >= purgeBtnX && x <= purgeBtnX + purgeBtnW && y >= purgeBtnY && y <= purgeBtnY + purgeBtnH) {
            if (confirm("WARNING: This will permanently erase all mission progress. Proceed?")) {
                localStorage.removeItem('neonLanderProgress');
                location.reload();
            }
            return;
        }

        // 1. Check Play Button
        if (this.selectedPlanet) {
            const p = this.selectedPlanet;
            const boxX = p.currentX + 50;
            const boxY = p.currentY - 50;
            const btnX = boxX + 15;
            const btnY = boxY + 75;
            const btnW = 140;
            const btnH = 25;

            if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
                const state = this.getPlanetState(p);
                if (state !== 'LOCKED') {
                    this.onPlayLevel(p.id);
                }
                return;
            }
        }

        // 2. Check Clicks on ANY body (Planets or Moons)
        let clickedBody = null;
        this.allBodies.forEach(p => {
            const dx = x - p.currentX;
            const dy = y - p.currentY;
            const dist = Math.sqrt(dx*dx + dy*dy);

            // Slightly larger hitbox for tiny moons to make tapping easier
            const hitRadius = Math.max(p.radius + 15, 25);

            if (dist < hitRadius) {
                // If multiple overlap, prefer the smallest one (moons are drawn on top)
                if (!clickedBody || p.radius < clickedBody.radius) {
                    clickedBody = p;
                }
            }
        });

        if (clickedBody) {
            this.selectedPlanet = clickedBody;
            this.pulseAnim = 1.0;
        } else {
            this.selectedPlanet = null;
        }
    }

    animate() {
        if (!this.active) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    update() {
        this.planets.forEach(p => {
            p.angle += p.speed;
            p.currentX = this.centerX + Math.cos(p.angle) * p.orbitRadius;
            p.currentY = this.centerY + Math.sin(p.angle) * p.orbitRadius;

            if (p.moons) {
                p.moons.forEach(m => {
                    m.angle += m.speed;
                    m.currentX = p.currentX + Math.cos(m.angle) * m.orbitRadius;
                    m.currentY = p.currentY + Math.sin(m.angle) * m.orbitRadius;
                });
            }
        });

        if (this.pulseAnim > 0) {
            this.pulseAnim -= 0.05;
            if (this.pulseAnim < 0) this.pulseAnim = 0;
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = "#020205";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();

        this.ctx.fillStyle = "#ffffff";
        this.stars.forEach(star => {
            this.ctx.globalAlpha = star.alpha;
            const sx = star.x * (this.canvas.width / (window.devicePixelRatio||1));
            const sy = star.y * (this.canvas.height / (window.devicePixelRatio||1));
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;

        // 1. Draw Planet Orbits
        this.ctx.lineWidth = 1;
        this.planets.forEach(p => {
            const state = this.getPlanetState(p);
            if (state === 'LOCKED') return;

            this.ctx.setLineDash([3, 10]);
            this.ctx.globalAlpha = 0.25;
            this.ctx.strokeStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, p.orbitRadius, 0, Math.PI * 2);
            this.ctx.stroke();
        });
        this.ctx.setLineDash([]);
        this.ctx.globalAlpha = 1.0;

        // 2. Sun
        this.ctx.shadowBlur = 60;
        this.ctx.shadowColor = this.sun.glow;
        this.ctx.fillStyle = this.sun.color;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.sun.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // 3. Draw Planets and their Moons
        this.planets.forEach(p => {
            // Draw Moon Orbits first
            if (p.moons) {
                p.moons.forEach(m => {
                    const mState = this.getPlanetState(m);
                    if (mState !== 'LOCKED') {
                        this.ctx.setLineDash([2, 5]);
                        this.ctx.strokeStyle = "rgba(255,255,255,0.1)";
                        this.ctx.lineWidth = 1;
                        this.ctx.beginPath();
                        this.ctx.arc(p.currentX, p.currentY, m.orbitRadius, 0, Math.PI*2);
                        this.ctx.stroke();
                        this.ctx.setLineDash([]);
                    }
                });
            }

            // Draw Planet
            const pState = this.getPlanetState(p);
            if (pState === 'LOCKED') {
                this.ctx.globalAlpha = 0.3;
            } else {
                this.ctx.globalAlpha = 1.0;
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = p.color;
            }

            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.currentX, p.currentY, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            this.ctx.globalAlpha = 1.0;

            // Draw Moons
            if (p.moons) {
                p.moons.forEach(m => {
                    const mState = this.getPlanetState(m);
                    this.ctx.globalAlpha = mState === 'LOCKED' ? 0.3 : 1.0;

                    this.ctx.fillStyle = m.color;
                    this.ctx.beginPath();
                    this.ctx.arc(m.currentX, m.currentY, m.radius, 0, Math.PI*2);
                    this.ctx.fill();

                    this.ctx.globalAlpha = 1.0;
                });
            }
        });

        // 4. Overlays (Target brackets and Selection Pulse) applied to ALL bodies
        this.allBodies.forEach(body => {
            const state = this.getPlanetState(body);

            // Active Target Brackets
            if (state === 'UNLOCKED') {
                this.ctx.save();
                this.ctx.translate(body.currentX, body.currentY);

                const now = performance.now();
                const s = body.radius + 6 + Math.sin(now / 300) * 2.0;

                this.ctx.strokeStyle = "#00ff00";
                this.ctx.lineWidth = 2.0;
                this.ctx.rotate(now / 1500);

                this.ctx.beginPath();
                this.ctx.moveTo(-s - 4, -6); this.ctx.lineTo(-s - 10, 0); this.ctx.lineTo(-s - 4, 6);
                this.ctx.moveTo(-s - 12, -6); this.ctx.lineTo(-s - 18, 0); this.ctx.lineTo(-s - 12, 6);

                this.ctx.moveTo(s + 4, -6); this.ctx.lineTo(s + 10, 0); this.ctx.lineTo(s + 4, 6);
                this.ctx.moveTo(s + 12, -6); this.ctx.lineTo(s + 18, 0); this.ctx.lineTo(s + 12, 6);
                this.ctx.stroke();

                this.ctx.restore();
            }

            // Click Selection Pulse
            if (this.selectedPlanet === body && this.pulseAnim > 0) {
                this.ctx.strokeStyle = "white";
                this.ctx.lineWidth = 2;
                this.ctx.globalAlpha = this.pulseAnim;
                this.ctx.beginPath();
                this.ctx.arc(body.currentX, body.currentY, body.radius + 12 + (1-this.pulseAnim)*15, 0, Math.PI*2);
                this.ctx.stroke();
                this.ctx.globalAlpha = 1.0;
            }
        });

        // Info Box
        if (this.selectedPlanet) {
            this.drawInfoBox(this.selectedPlanet);
        }



        // --- NEW: Draw Purge Data Button ---
        const screenW = window.innerWidth;
        const screenH = window.innerHeight; // Get screen height
        const purgeBtnW = 140;
        const purgeBtnH = 30;
        const purgeBtnX = screenW - purgeBtnW - 20;
        const purgeBtnY = screenH - purgeBtnH - 20; // Anchor to bottom

        this.ctx.strokeStyle = "rgba(255, 68, 68, 0.6)";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(purgeBtnX, purgeBtnY, purgeBtnW, purgeBtnH);

        this.ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
        this.ctx.fillRect(purgeBtnX, purgeBtnY, purgeBtnW, purgeBtnH);

        this.ctx.fillStyle = "#ff4444";
        this.ctx.font = "bold 14px Courier New";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText("[ PURGE DATA ]", purgeBtnX + purgeBtnW / 2, purgeBtnY + purgeBtnH / 2 + 1);


        this.ctx.restore();
    }

    drawInfoBox(p) {
        const boxW = 240;
        const boxH = 120;

        const targetX = p.currentX + 50;
        const targetY = p.currentY - 50;

        // Connector
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(p.currentX + p.radius + 5, p.currentY);
        this.ctx.lineTo(targetX - 20, p.currentY);
        this.ctx.lineTo(targetX, targetY + 20);
        this.ctx.stroke();

        this.ctx.fillStyle = "white";
        this.ctx.beginPath();
        this.ctx.arc(p.currentX + p.radius + 5, p.currentY, 2, 0, Math.PI*2);
        this.ctx.fill();

        // Box
        this.ctx.fillStyle = "rgba(0, 20, 40, 0.85)";
        this.ctx.beginPath();
        this.ctx.rect(targetX, targetY, boxW, boxH);
        this.ctx.fill();

        // Borders
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 2;
        const bracketLen = 20;

        this.ctx.beginPath();
        this.ctx.moveTo(targetX, targetY + bracketLen);
        this.ctx.lineTo(targetX, targetY);
        this.ctx.lineTo(targetX + bracketLen, targetY);
        this.ctx.moveTo(targetX + boxW - bracketLen, targetY + boxH);
        this.ctx.lineTo(targetX + boxW, targetY + boxH);
        this.ctx.lineTo(targetX + boxW, targetY + boxH - bracketLen);
        this.ctx.stroke();

        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(targetX, targetY, boxW, boxH);

        // Text
        this.ctx.fillStyle = "white";
        this.ctx.font = "bold 18px Courier New";
        this.ctx.textAlign = "left";
        this.ctx.fillText(p.name.toUpperCase(), targetX + 15, targetY + 30);

        this.ctx.strokeStyle = "rgba(255,255,255,0.3)";
        this.ctx.beginPath();
        this.ctx.moveTo(targetX + 15, targetY + 38);
        this.ctx.lineTo(targetX + boxW - 15, targetY + 38);
        this.ctx.stroke();

        this.ctx.fillStyle = "#aaccff";
        this.ctx.font = "13px Courier New";
        const lines = p.desc.split('\n');
        lines.forEach((line, i) => {
            this.ctx.fillText(line, targetX + 15, targetY + 60 + (i*16));
        });

        // Button UI
        const btnX = targetX + 15;
        const btnY = targetY + 80;
        const btnW = 140;
        const btnH = 25;

        const state = this.getPlanetState(p);

        if (state === 'LOCKED') {
            this.ctx.strokeStyle = "#ff4444";
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(btnX, btnY, btnW, btnH);

            this.ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
            this.ctx.fillRect(btnX, btnY, btnW, btnH);

            this.ctx.fillStyle = "#ff4444";
            this.ctx.font = "bold 12px Courier New";
            this.ctx.fillText("[ RESTRICTED ]", btnX + 18, btnY + 17);
        } else {
            this.ctx.strokeStyle = "#00ff00";
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(btnX, btnY, btnW, btnH);

            this.ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
            this.ctx.fillRect(btnX, btnY, btnW, btnH);

            this.ctx.fillStyle = "#00ff00";
            this.ctx.font = "bold 12px Courier New";
            this.ctx.fillText("<< INITIATE >>", btnX + 14, btnY + 17);
        }
    }
}
