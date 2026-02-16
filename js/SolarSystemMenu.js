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
        this.sun = { radius: 35, color: '#ffaa00', glow: '#ff5500' };

        // Generate static stars for background
        this.stars = [];
        for(let i=0; i<150; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random(),
                size: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.5 + 0.3
            });
        }

        // Define Planets (All 7 Levels)
        // Orbits spaced by ~35-40px to fit on standard screens
        this.planets = [
            {
                id: 1,
                name: "Luna Prime",
                desc: "Training Ground.\nLow Gravity.",
                color: "#bbbbbb",
                radius: 10,
                orbitRadius: 85,
                speed: 0.008,
                angle: Math.random() * 6.28,
                moons: []
            },
            {
                id: 4,
                name: "The Moon",
                desc: "Standard Mission.\nDusty surface.",
                color: "#eeeeee",
                radius: 11,
                orbitRadius: 120,
                speed: 0.006,
                angle: Math.random() * 6.28,
                moons: []
            },
            {
                id: 2,
                name: "Mars Outpost",
                desc: "High Gravity.\nRugged Terrain.",
                color: "#cc5500",
                radius: 13,
                orbitRadius: 155,
                speed: 0.005,
                angle: Math.random() * 6.28,
                moons: []
            },
            {
                id: 3,
                name: "Terra Nova",
                desc: "Thick Atmosphere.\nWind Hazards.",
                color: "#4488ff",
                radius: 14,
                orbitRadius: 190,
                speed: 0.004,
                angle: Math.random() * 6.28,
                moons: [{ radius: 3, orbitRadius: 25, speed: 0.05, angle: 0, color: "#fff" }]
            },
            {
                id: 5,
                name: "Mars Sector",
                desc: "Meteor Showers.\nExtreme Danger.",
                color: "#ff3300",
                radius: 12,
                orbitRadius: 225,
                speed: 0.0035,
                angle: Math.random() * 6.28,
                moons: [
                    { radius: 3, orbitRadius: 20, speed: 0.04, angle: 0, color: "#ccaa88" },
                    { radius: 2, orbitRadius: 30, speed: 0.03, angle: 2, color: "#ccaa88" }
                ]
            },
            {
                id: 6,
                name: "Venus",
                desc: "Acid Clouds.\nHigh Pressure.",
                color: "#eebb00",
                radius: 15,
                orbitRadius: 265,
                speed: 0.0025,
                angle: Math.random() * 6.28,
                moons: []
            },
            {
                id: 7,
                name: "Earth Entry",
                desc: "Re-entry Mission.\nHome Base.",
                color: "#00bbff",
                radius: 16,
                orbitRadius: 305,
                speed: 0.002,
                angle: Math.random() * 6.28,
                moons: [{ radius: 4, orbitRadius: 28, speed: 0.06, angle: 1, color: "#cccccc" }]
            }
        ];

        this.handleInput = this.handleInput.bind(this);
        this.resize = this.resize.bind(this);
        window.addEventListener('resize', this.resize);
    }

    start() {
        this.active = true;
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

            // Hitbox slightly larger than visual radius
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

        // 0. Background
        this.ctx.fillStyle = "#020205";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();

        // 0.1 Stars
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

        // 1. Orbits (Dashed)
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 10]); // Tighter dash for denser orbits
        this.planets.forEach(p => {
            this.ctx.strokeStyle = p.color;
            this.ctx.globalAlpha = 0.25;
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

        // 3. Planets
        this.planets.forEach(p => {
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = p.color;

            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.currentX, p.currentY, p.radius, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.shadowBlur = 0;

            // Selection Ring
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
                    this.ctx.strokeStyle = "rgba(255,255,255,0.1)";
                    this.ctx.lineWidth = 1;
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

        // Box Background
        this.ctx.fillStyle = "rgba(0, 20, 40, 0.85)";
        this.ctx.beginPath();
        this.ctx.rect(targetX, targetY, boxW, boxH);
        this.ctx.fill();

        // Borders
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 2;
        const bracketLen = 20;

        this.ctx.beginPath();
        // Top Left
        this.ctx.moveTo(targetX, targetY + bracketLen);
        this.ctx.lineTo(targetX, targetY);
        this.ctx.lineTo(targetX + bracketLen, targetY);
        // Bottom Right
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

        // Button
        const btnX = targetX + 15;
        const btnY = targetY + 80;
        const btnW = 100;
        const btnH = 25;

        this.ctx.strokeStyle = "#00ff00";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(btnX, btnY, btnW, btnH);

        this.ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
        this.ctx.fillRect(btnX, btnY, btnW, btnH);

        this.ctx.fillStyle = "#00ff00";
        this.ctx.font = "bold 14px Courier New";
        this.ctx.fillText("INITIATE >", btnX + 10, btnY + 17);
    }
}
