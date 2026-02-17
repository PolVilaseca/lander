import { Geyser } from './Geyser.js';

export class Terrain {
    constructor(params, width, height, color = "#ffffff", hasLaunchPad = false) {
        this.params = params;
        this.width = width;
        this.height = height;
        this.color = color;
        this.hasLaunchPad = hasLaunchPad;
        this.points = [];
        this.pads = [];
        this.launchPadPosition = null;
        this.segmentWidth = 20;

        // NEW: Geyser storage
        this.geysers = [];

        this.generate();
    }

    generate() {
        this.points = [];
        const numPoints = Math.ceil(this.width / this.segmentWidth) + 1;

        let currentY = this.height * 0.8;

        // Launch Pad Settings - CENTERED
        const centerIndex = Math.floor(numPoints / 2);
        const padRadius = 4;
        const lpStart = centerIndex - padRadius;
        const lpEnd = centerIndex + padRadius;
        const lpY = this.height - 100;

        // Landing Pad (Green) State
        let flattenSteps = 0;
        let flattenHeight = 0;
        let padsCreated = 0;
        const flatSpotsNeeded = this.params.flat_spots || 1;

        for (let i = 0; i < numPoints; i++) {
            const x = i * this.segmentWidth;
            let isLaunchPad = false;

            // 1. Force Launch Pad (Red)
            if (this.hasLaunchPad && i >= lpStart && i <= lpEnd) {
                currentY = lpY;
                isLaunchPad = true;

                if (i === centerIndex) {
                    this.launchPadPosition = { x: x, y: currentY };
                }
                flattenSteps = 0;
            }
            else {
                // 2. Normal Terrain Logic
                if (flattenSteps > 0) {
                    currentY = flattenHeight;
                    flattenSteps--;
                } else {
                    const variation = (Math.random() - 0.5) * this.params.roughness;
                    currentY += variation;

                    if (currentY < this.height * 0.5) currentY = this.height * 0.5;
                    if (currentY > this.height - 20) currentY = this.height - 20;

                    const distToLP = Math.abs(i - centerIndex);
                    const safeDist = padRadius + 10;

                    if (distToLP > safeDist && padsCreated < flatSpotsNeeded && i > 20 && Math.random() < 0.02) {
                        flattenSteps = 4;
                        flattenHeight = currentY;
                        padsCreated++;
                    }
                }
            }

            this.points.push({ x: x, y: currentY, isPad: false, isLaunchPad: isLaunchPad });
        }

        // Post-Processing: Detect flat spots
        for(let i=0; i<this.points.length-1; i++) {
            if (this.points[i].isLaunchPad) continue;

            if (Math.abs(this.points[i].y - this.points[i+1].y) < 0.1) {
                let count = 1;
                while(i+count < this.points.length && Math.abs(this.points[i].y - this.points[i+count].y) < 0.1) {
                    count++;
                }

                if (count >= 3) {
                    for(let k=0; k<count; k++) {
                        this.points[i+k].isPad = true;
                    }
                    this.pads.push({ x: this.points[i].x + (count*this.segmentWidth)/2, y: this.points[i].y });
                    i += count - 1;
                }
            }
        }

        // NEW: Generate Geysers (Using the points we just created)
        if (this.params.geysers) {
            this.generateGeysers(this.params.geysers);
        }
    }

    // NEW: Geyser Generation Logic
    generateGeysers(config) {
        const count = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
        let placed = 0;
        let attempts = 0;

        while (placed < count && attempts < 200) {
            attempts++;
            // Pick a random point index (avoid edges)
            const idx = Math.floor(Math.random() * (this.points.length - 10)) + 5;
            const point = this.points[idx];

            // Safety Check: Don't spawn on Pads or Launch Pads
            // We check the point itself and neighbors to avoid visual overlap
            let safe = true;
            for(let k = -2; k <= 2; k++) {
                if (this.points[idx+k] && (this.points[idx+k].isPad || this.points[idx+k].isLaunchPad)) {
                    safe = false;
                    break;
                }
            }

            if (safe) {
                this.geysers.push(new Geyser(point.x, point.y, config.strength, config.frequency, this.color));
                placed++;
            }
        }
    }

    // NEW: Update Geysers
    updateGeysers(dt, ship) {
        this.geysers.forEach(g => g.update(dt, ship));
    }

    getHeightAt(x) {
        const index = Math.floor(x / this.segmentWidth);
        if (index < 0 || index >= this.points.length - 1) {
            return { y: this.height + 1000, isPad: false, isLaunchPad: false };
        }

        const p1 = this.points[index];
        const p2 = this.points[index + 1];

        const ratio = (x - p1.x) / this.segmentWidth;
        const y = p1.y + (p2.y - p1.y) * ratio;

        return {
            y: y,
            isPad: p1.isPad && p2.isPad,
            isLaunchPad: p1.isLaunchPad && p2.isLaunchPad
        };
    }

    draw(ctx) {
        ctx.save();

        // 1. Black Fill
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        if (this.points.length > 0) {
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                ctx.lineTo(this.points[i].x, this.points[i].y);
            }
            ctx.lineTo(this.width, this.height + 5000);
            ctx.lineTo(0, this.height + 5000);
        }
        ctx.fill();

        // 2. Surface Line
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < this.points.length - 1; i++) {
            ctx.moveTo(this.points[i].x, this.points[i].y);
            ctx.lineTo(this.points[i+1].x, this.points[i+1].y);
        }
        ctx.stroke();

        // 3. Landing Pads (Green)
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ff00';
        ctx.beginPath();
        for (let i = 0; i < this.points.length - 1; i++) {
            if (this.points[i].isPad && this.points[i+1].isPad) {
                ctx.moveTo(this.points[i].x, this.points[i].y);
                ctx.lineTo(this.points[i+1].x, this.points[i+1].y);
            }
        }
        ctx.stroke();

        // 4. Launch Pads (Red)
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        for (let i = 0; i < this.points.length - 1; i++) {
            if (this.points[i].isLaunchPad && this.points[i+1].isLaunchPad) {
                ctx.moveTo(this.points[i].x, this.points[i].y);
                ctx.lineTo(this.points[i+1].x, this.points[i+1].y);
            }
        }
        ctx.stroke();

        // 5. Draw Geysers
        this.geysers.forEach(g => g.draw(ctx));

        ctx.restore();
    }
}
