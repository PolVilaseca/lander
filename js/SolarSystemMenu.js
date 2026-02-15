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

        // Generate static stars for background
        this.stars = [];
        for(let i=0; i<100; i++) {
            this.stars.push({
                x: Math.random(), // Relative position 0-1
                y: Math.random(),
                size: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.5 + 0.3
            });
        }

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
        // Clear Screen
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 0. Draw Background (Deep Space Black)
        this.ctx.fillStyle = "#020205";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();

        // 0.1 Draw Starfield
        this.ctx.fillStyle = "#ffffff";
        this.stars.forEach(star => {
            this.ctx.globalAlpha = star.alpha;
            // Use window size for positioning since stars are 0-1 relative
            const sx = star.x * (this.canvas.width / (window.devicePixelRatio||1));
            const sy = star.y * (this.canvas.height / (window.devicePixelRatio||1));
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;

        // 1. Draw Orbits (Dashed Lines for Tactical Look)
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 15]); // Dotted/Dashed effect
        this.planets.forEach(p => {
            this.ctx.strokeStyle = p.color;
            this.ctx.globalAlpha = 0.3;
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, p.orbitRadius, 0, Math.PI * 2);
            this.ctx.stroke();
        });
        this.ctx.setLineDash([]); // Reset to solid
        this.ctx.globalAlpha = 1.0;

        // 2. Draw Sun (Increased Atmosphere/Glow)
        this.ctx.shadowBlur = 80; // High glow
        this.ctx.shadowColor = this.sun.glow;
        this.ctx.fillStyle = this.sun.color;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.sun.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0; // Reset

        // 3. Draw Planets
        this.planets.forEach(p => {
            // Subtle Glow for Planets
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = p.color;

            // Planet Body
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.currentX, p.currentY, p.radius, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.shadowBlur = 0;

            // Selection Pulse (Holographic Ring)
            if (this.selectedPlanet === p && this.pulseAnim > 0) {
                this.ctx.strokeStyle = "white";
                this.ctx.lineWidth = 2;
                this.ctx.globalAlpha = this.pulseAnim;
                this.ctx.beginPath();
                this.ctx.arc(p.currentX, p.currentY, p.radius + 15 + (1-this.pulseAnim)*20, 0, Math.PI*2);
                this.ctx.stroke();
                this.ctx.globalAlpha = 1.0;
            }

            // Moons
            if (p.moons) {
                p.moons.forEach(m => {
                    // Moon Orbit (Faint Solid)
                    this.ctx.strokeStyle = "rgba(255,255,255,0.1)";
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.arc(p.currentX, p.currentY, m.orbitRadius, 0, Math.PI*2);
                    this.ctx.stroke();

                    // Moon Body
                    this.ctx.fillStyle = m.color;
                    this.ctx.beginPath();
                    this.ctx.arc(m.currentX, m.currentY, m.radius, 0, Math.PI*2);
                    this.ctx.fill();
                });
            }
        });

        // 4. Info Box (Holographic HUD)
        if (this.selectedPlanet) {
            this.drawInfoBox(this.selectedPlanet);
        }

        this.ctx.restore();
    }

    drawInfoBox(p) {
        // Holographic Box Settings
        const boxW = 240;
        const boxH = 120;

        // Position to the right, slightly up
        const targetX = p.currentX + 50;
        const targetY = p.currentY - 50;

        // -- 1. Connector Line (Tactical "Knee" Bend) --
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        // Start from planet edge
        this.ctx.moveTo(p.currentX + p.radius + 5, p.currentY);
        // Horizontal segment
        this.ctx.lineTo(targetX - 20, p.currentY);
        // Diagonal/Vertical segment to box corner
        this.ctx.lineTo(targetX, targetY + 20);
        this.ctx.stroke();

        // Small dot at anchor
        this.ctx.fillStyle = "white";
        this.ctx.beginPath();
        this.ctx.arc(p.currentX + p.radius + 5, p.currentY, 2, 0, Math.PI*2);
        this.ctx.fill();

        // -- 2. HUD Box Body --
        // Semi-transparent dark background
        this.ctx.fillStyle = "rgba(0, 20, 40, 0.85)";
        this.ctx.beginPath();
        this.ctx.rect(targetX, targetY, boxW, boxH);
        this.ctx.fill();

        // -- 3. HUD Borders (Bracket Style) --
        this.ctx.strokeStyle = p.color; // Use planet color for accent
        this.ctx.lineWidth = 2;
        const bracketLen = 20;

        this.ctx.beginPath();
        // Top-Left Bracket
        this.ctx.moveTo(targetX, targetY + bracketLen);
        this.ctx.lineTo(targetX, targetY);
        this.ctx.lineTo(targetX + bracketLen, targetY);
        // Bottom-Right Bracket
        this.ctx.moveTo(targetX + boxW - bracketLen, targetY + boxH);
        this.ctx.lineTo(targetX + boxW, targetY + boxH);
        this.ctx.lineTo(targetX + boxW, targetY + boxH - bracketLen);
        this.ctx.stroke();

        // Thin white outline for rest
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(targetX, targetY, boxW, boxH);

        // -- 4. Text Content --
        // Title
        this.ctx.fillStyle = "white";
        this.ctx.font = "bold 18px Courier New";
        this.ctx.textAlign = "left";
        this.ctx.fillText(p.name.toUpperCase(), targetX + 15, targetY + 30);

        // Underline title
        this.ctx.strokeStyle = "rgba(255,255,255,0.3)";
        this.ctx.beginPath();
        this.ctx.moveTo(targetX + 15, targetY + 38);
        this.ctx.lineTo(targetX + boxW - 15, targetY + 38);
        this.ctx.stroke();

        // Description
        this.ctx.fillStyle = "#aaccff";
        this.ctx.font = "13px Courier New";
        const lines = p.desc.split('\n');
        lines.forEach((line, i) => {
            this.ctx.fillText(line, targetX + 15, targetY + 60 + (i*16));
        });

        // -- 5. Launch Button --
        const btnX = targetX + 15;
        const btnY = targetY + 80;
        const btnW = 100;
        const btnH = 25;

        // Button Glow/Stroke instead of solid block
        this.ctx.strokeStyle = "#00ff00";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(btnX, btnY, btnW, btnH);

        // Low opacity fill
        this.ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
        this.ctx.fillRect(btnX, btnY, btnW, btnH);

        // Text
        this.ctx.fillStyle = "#00ff00";
        this.ctx.font = "bold 14px Courier New";
        this.ctx.fillText("INITIATE >", btnX + 10, btnY + 17);
    }
}
