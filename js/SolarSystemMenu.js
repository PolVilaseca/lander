export class SolarSystemMenu {
    constructor(canvas, onPlayLevel) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onPlayLevel = onPlayLevel;
        this.active = false;

        this.centerX = 0;
        this.centerY = 0;

        this.selectedPlanet = null;
        this.pulseAnim = 0;

        // Visual Settings
        this.sun = { radius: 40, color: '#ffaa00', glow: '#ff5500' };

        // Define Planets (Linked to Level IDs)
        this.planets = [
            {
                id: 1, // Matches "Luna Prime" in levels.json
                name: "Luna Prime",
                desc: "Low gravity training ground.\nIdeal for new pilots.",
                color: "#aaaaaa",
                radius: 15,
                orbitRadius: 120,
                speed: 0.005,
                angle: Math.random() * Math.PI * 2,
                moons: []
            },
            {
                id: 3, // Matches "Terra Nova"
                name: "Terra Nova",
                desc: "Thick atmosphere & winds.\nWatch your heat levels.",
                color: "#4488ff",
                radius: 22,
                orbitRadius: 200,
                speed: 0.003,
                angle: Math.random() * Math.PI * 2,
                moons: [
                    { radius: 5, orbitRadius: 35, speed: 0.05, angle: 0, color: "#ffffff" }
                ]
            },
            {
                id: 5, // Matches "Mars"
                name: "Mars Sector",
                desc: "Meteorite hazards detected.\nExtreme caution advised.",
                color: "#ff4422",
                radius: 18,
                orbitRadius: 300,
                speed: 0.002,
                angle: Math.random() * Math.PI * 2,
                moons: [
                    { radius: 4, orbitRadius: 28, speed: 0.04, angle: 0, color: "#ccaa88" },
                    { radius: 3, orbitRadius: 40, speed: 0.03, angle: 2, color: "#ccaa88" }
                ]
            }
        ];

        this.handleInput = this.handleInput.bind(this);
        this.resize = this.resize.bind(this); // Bind resize
        window.addEventListener('resize', this.resize); // Auto-resize
    }

    start() {
        this.active = true;
        this.resize(); // Force resize immediately on start

        this.canvas.addEventListener('mousedown', this.handleInput);
        this.canvas.addEventListener('touchstart', this.handleInput, {passive: false});

        this.animate();
    }

    stop() {
        this.active = false;
        this.canvas.removeEventListener('mousedown', this.handleInput);
        this.canvas.removeEventListener('touchstart', this.handleInput);
        // We keep the window resize listener as it doesn't hurt
    }

    resize() {
        // Force Canvas to fill window
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';

        // Scale context for High DPI
        this.ctx.scale(dpr, dpr);

        // Center logic coordinates
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
            const boxX = p.currentX + 30;
            const boxY = p.currentY - 40;
            const btnX = boxX + 10;
            const btnY = boxY + 75;
            const btnW = 100;
            const btnH = 25;

            if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
                this.onPlayLevel(p.id);
                return;
            }
        }

        // 2. Check Planet Clicks
        let clickedPlanet = null;
        this.planets.forEach(p => {
            const dx = x - p.currentX;
            const dy = y - p.currentY;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < p.radius + 15) {
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
        this.ctx.fillStyle = "#050505";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();

        // 1. Draw Orbits
        this.ctx.lineWidth = 1;
        this.planets.forEach(p => {
            this.ctx.strokeStyle = p.color;
            this.ctx.globalAlpha = 0.2;
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, p.orbitRadius, 0, Math.PI * 2);
            this.ctx.stroke();
        });
        this.ctx.globalAlpha = 1.0;

        // 2. Draw Sun
        this.ctx.shadowBlur = 40;
        this.ctx.shadowColor = this.sun.glow;
        this.ctx.fillStyle = this.sun.color;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.sun.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0; // Reset

        // 3. Draw Planets
        this.planets.forEach(p => {
            // SUBTLE GLOW (New)
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = p.color;

            // Planet Body (Single Color)
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.currentX, p.currentY, p.radius, 0, Math.PI * 2);
            this.ctx.fill();

            // Removed: Inner Highlight Section

            // Reset Shadow for next elements
            this.ctx.shadowBlur = 0;

            // Selected Pulse
            if (this.selectedPlanet === p && this.pulseAnim > 0) {
                this.ctx.strokeStyle = "white";
                this.ctx.lineWidth = 2;
                this.ctx.globalAlpha = this.pulseAnim;
                this.ctx.beginPath();
                this.ctx.arc(p.currentX, p.currentY, p.radius + 10 + (1-this.pulseAnim)*15, 0, Math.PI*2);
                this.ctx.stroke();
                this.ctx.globalAlpha = 1.0;
            }

            // Moons (No glow for moons to keep performance high and visual clutter low)
            if (p.moons) {
                p.moons.forEach(m => {
                    this.ctx.strokeStyle = "rgba(255,255,255,0.1)";
                    this.ctx.beginPath();
                    this.ctx.arc(p.currentX, p.currentY, m.orbitRadius, 0, Math.PI*2);
                    this.ctx.stroke();

                    this.ctx.fillStyle = m.color;
                    this.ctx.beginPath();
                    this.ctx.arc(m.currentX, m.currentY, m.radius, 0, Math.PI*2);
                    this.ctx.fill();
                });
            }
        });

        // 4. Info Box
        if (this.selectedPlanet) {
            this.drawInfoBox(this.selectedPlanet);
        }

        this.ctx.restore();
    }

    drawInfoBox(p) {
        const boxW = 220;
        const boxH = 110;
        const x = p.currentX + 30;
        const y = p.currentY - 40;

        this.ctx.fillStyle = "rgba(10, 20, 30, 0.9)";
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.rect(x, y, boxW, boxH);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(p.currentX + p.radius + 5, p.currentY);
        this.ctx.lineTo(x, y + 20);
        this.ctx.stroke();

        this.ctx.fillStyle = "white";
        this.ctx.font = "bold 16px Courier New";
        this.ctx.textAlign = "left";
        this.ctx.fillText(p.name.toUpperCase(), x + 10, y + 25);

        this.ctx.fillStyle = "#bbbbbb";
        this.ctx.font = "12px Courier New";

        const lines = p.desc.split('\n');
        lines.forEach((line, i) => {
            this.ctx.fillText(line, x + 10, y + 45 + (i*15));
        });

        const btnX = x + 10;
        const btnY = y + 75;
        this.ctx.fillStyle = "#00ff00";
        this.ctx.fillRect(btnX, btnY, 100, 25);

        this.ctx.fillStyle = "black";
        this.ctx.font = "bold 14px Courier New";
        this.ctx.fillText("LAUNCH >", btnX + 15, btnY + 18);
    }
}
