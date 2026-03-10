export class SolarSystemMenu {
    // NEW: Accepts progression config
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
        this.completedLevels = []; // Tracks saved progress

        // Visual Settings
        this.sun = { radius: 35, color: '#ffaa00', glow: '#ff5500' };

        // Background Stars
        this.stars = [];
        for(let i=0; i<150; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random(),
                size: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.5 + 0.3
            });
        }

        // Define Planets (8 Levels)
        this.planets = [
            { id: 1, name: "Luna Prime", desc: "Training Ground.\nLow Gravity.", color: "#bbbbbb", radius: 10, orbitRadius: 100, speed: 0.002, angle: Math.random() * 6.28, moons: [] },
            { id: 4, name: "The Moon", desc: "Standard Mission.\nDusty surface.", color: "#eeeeee", radius: 11, orbitRadius: 140, speed: 0.0015, angle: Math.random() * 6.28, moons: [] },
            { id: 2, name: "Mars Outpost", desc: "High Gravity.\nRugged Terrain.", color: "#cc5500", radius: 13, orbitRadius: 180, speed: 0.00125, angle: Math.random() * 6.28, moons: [] },
            { id: 3, name: "Terra Nova", desc: "Thick Atmosphere.\nWind Hazards.", color: "#4488ff", radius: 14, orbitRadius: 220, speed: 0.001, angle: Math.random() * 6.28, moons: [{ radius: 3, orbitRadius: 25, speed: 0.0125, angle: 0, color: "#fff" }] },
            { id: 5, name: "Mars Sector", desc: "Meteor Showers.\nExtreme Danger.", color: "#ff3300", radius: 12, orbitRadius: 260, speed: 0.0009, angle: Math.random() * 6.28, moons: [ { radius: 3, orbitRadius: 20, speed: 0.01, angle: 0, color: "#ccaa88" }, { radius: 2, orbitRadius: 30, speed: 0.0075, angle: 2, color: "#ccaa88" } ] },
            { id: 6, name: "Venus", desc: "Acid Clouds.\nElectric Storms.", color: "#eebb00", radius: 15, orbitRadius: 300, speed: 0.0006, angle: Math.random() * 6.28, moons: [] },
            { id: 7, name: "Earth Entry", desc: "Re-entry Mission.\nHome Base.", color: "#00bbff", radius: 16, orbitRadius: 340, speed: 0.0005, angle: Math.random() * 6.28, moons: [{ radius: 4, orbitRadius: 28, speed: 0.015, angle: 1, color: "#cccccc" }] },
            { id: 8, name: "Enceladus", desc: "Ice World.\nGeyser Hazards.", color: "#aaccff", radius: 12, orbitRadius: 380, speed: 0.0004, angle: Math.random() * 6.28, moons: [] }
        ];

        this.handleInput = this.handleInput.bind(this);
        this.resize = this.resize.bind(this);
        window.addEventListener('resize', this.resize);
    }

    // NEW: Inject save data
    setProgress(completedIds) {
        this.completedLevels = completedIds;
    }

    // NEW: Determine if planet is playable
    getPlanetState(p, index) {
        if (!this.enforceProgression) {
            return this.completedLevels.includes(p.id) ? 'COMPLETED' : 'UNLOCKED';
        }
        if (this.completedLevels.includes(p.id)) return 'COMPLETED';

        // Find the first planet in the array that hasn't been completed yet
        let firstUncompletedIndex = this.planets.findIndex(planet => !this.completedLevels.includes(planet.id));
        if (firstUncompletedIndex === -1) firstUncompletedIndex = this.planets.length;

        if (index === firstUncompletedIndex) return 'UNLOCKED';
        return 'LOCKED';
    }

    start() {
        this.active = true;
        this.selectedPlanet = null; // Clear selection when returning to menu
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

        // 1. Check Play Button
        if (this.selectedPlanet) {
            const p = this.selectedPlanet;
            const boxX = p.currentX + 50;
            const boxY = p.currentY - 50;
            const btnX = boxX + 15;
            const btnY = boxY + 75;
            const btnW = 140; // Increased width for "<< INITIATE >>"
            const btnH = 25;

            if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
                // NEW: Block click if locked
                const state = this.getPlanetState(p, this.planets.indexOf(p));
                if (state !== 'LOCKED') {
                    this.onPlayLevel(p.id);
                }
                return;
            }
        }

        // 2. Check Planet Clicks
        let clickedPlanet = null;
        this.planets.forEach(p => {
            const dx = x - p.currentX;
            const dy = y - p.currentY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < p.radius + 20) {
                clickedPlanet = p;
            }
        });

        if (clickedPlanet) {
            this.selectedPlanet = clickedPlanet;
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

        // Background
        this.ctx.fillStyle = "#020205";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();

        // Stars
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

        // Orbits
        this.ctx.lineWidth = 1;
        this.planets.forEach((p, index) => {
            const state = this.getPlanetState(p, index);

            // Hide orbit completely if locked
            if (state === 'LOCKED') return;

            // Revert to original dashed style for unlocked/completed
            this.ctx.setLineDash([3, 10]);
            this.ctx.globalAlpha = 0.25;

            this.ctx.strokeStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, p.orbitRadius, 0, Math.PI * 2);
            this.ctx.stroke();
        });
        this.ctx.setLineDash([]);
        this.ctx.globalAlpha = 1.0;

        // Sun
        this.ctx.shadowBlur = 60;
        this.ctx.shadowColor = this.sun.glow;
        this.ctx.fillStyle = this.sun.color;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.sun.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // Planets
        this.planets.forEach((p, index) => {
            const state = this.getPlanetState(p, index);

            // Visual dimming for locked planets
            if (state === 'LOCKED') {
                this.ctx.globalAlpha = 0.3;
                this.ctx.shadowBlur = 0;
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

            // Render Animated << >> for UNLOCKED (Active Target)
                  if (state === 'UNLOCKED') {
                      this.ctx.save();
                      this.ctx.translate(p.currentX, p.currentY);

                      // Use performance.now() for perfectly smooth, sub-millisecond continuous animation
                      const now = performance.now();

                      // Smooth, slightly larger pulse
                      const s = p.radius + 6 + Math.sin(now / 300) * 2.0;

                      this.ctx.strokeStyle = "#00ff00"; // Neon Green
                      this.ctx.lineWidth = 2.0; // Slightly thicker to support larger size

                      // Smooth continuous rotation
                      this.ctx.rotate(now / 1500);

                      this.ctx.beginPath();
                      // Inner Left < (Doubled size)
                      this.ctx.moveTo(-s - 4, -6); this.ctx.lineTo(-s - 10, 0); this.ctx.lineTo(-s - 4, 6);
                      // Outer Left < (Doubled size)
                      this.ctx.moveTo(-s - 12, -6); this.ctx.lineTo(-s - 18, 0); this.ctx.lineTo(-s - 12, 6);

                      // Inner Right > (Doubled size)
                      this.ctx.moveTo(s + 4, -6); this.ctx.lineTo(s + 10, 0); this.ctx.lineTo(s + 4, 6);
                      // Outer Right > (Doubled size)
                      this.ctx.moveTo(s + 12, -6); this.ctx.lineTo(s + 18, 0); this.ctx.lineTo(s + 12, 6);
                      this.ctx.stroke();

                      this.ctx.restore();
                  }



            // Click Selection Pulse
            if (this.selectedPlanet === p && this.pulseAnim > 0) {
                this.ctx.strokeStyle = "white";
                this.ctx.lineWidth = 2;
                this.ctx.globalAlpha = this.pulseAnim;
                this.ctx.beginPath();
                this.ctx.arc(p.currentX, p.currentY, p.radius + 12 + (1-this.pulseAnim)*15, 0, Math.PI*2);
                this.ctx.stroke();
                this.ctx.globalAlpha = 1.0;
            }

            // Moons
            if (p.moons) {
                p.moons.forEach(m => {
                    this.ctx.globalAlpha = state === 'LOCKED' ? 0.2 : 1.0; // Dim moons if locked

                    // Only draw moon orbit lines if the planet is unlocked/completed
                    if (state !== 'LOCKED') {
                        // NEW: Dashed moon orbits (smaller dashes than the planets)
                        this.ctx.setLineDash([2, 5]);

                        this.ctx.strokeStyle = "rgba(255,255,255,0.1)";
                        this.ctx.lineWidth = 1;
                        this.ctx.beginPath();
                        this.ctx.arc(p.currentX, p.currentY, m.orbitRadius, 0, Math.PI*2);
                        this.ctx.stroke();

                        // Reset line dash
                        this.ctx.setLineDash([]);
                    }

                    this.ctx.fillStyle = m.color;
                    this.ctx.beginPath();
                    this.ctx.arc(m.currentX, m.currentY, m.radius, 0, Math.PI*2);
                    this.ctx.fill();

                    this.ctx.globalAlpha = 1.0;
                });
            }
        });

        // Info Box
        if (this.selectedPlanet) {
            this.drawInfoBox(this.selectedPlanet);
        }

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

        // Button UI (changes based on state)
        const btnX = targetX + 15;
        const btnY = targetY + 80;
        const btnW = 140;
        const btnH = 25;

        const state = this.getPlanetState(p, this.planets.indexOf(p));

        if (state === 'LOCKED') {
            this.ctx.strokeStyle = "#ff4444";
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(btnX, btnY, btnW, btnH);

            this.ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
            this.ctx.fillRect(btnX, btnY, btnW, btnH);

            this.ctx.fillStyle = "#ff4444";
            this.ctx.font = "bold 12px Courier New";
            this.ctx.fillText("[ RESTRICTED ]", btnX + 8, btnY + 17);
        } else {
            this.ctx.strokeStyle = "#00ff00";
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(btnX, btnY, btnW, btnH);

            this.ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
            this.ctx.fillRect(btnX, btnY, btnW, btnH);

            this.ctx.fillStyle = "#00ff00";
            this.ctx.font = "bold 12px Courier New";
            this.ctx.fillText("<< INITIATE >>", btnX + 18, btnY + 17);
        }
    }
}
