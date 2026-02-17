import { Geyser } from './Geyser.js';

export class Terrain {
    constructor(params, width, height, color = "#ffffff", hasLaunchPad = false) {
        this.params = params;
        this.width = width;
        this.height = height;
        this.color = color;
        this.hasLaunchPad = hasLaunchPad;
        this.points = [];
        this.pads = []; // Stores pad info for collision logic
        this.launchPadPosition = null;
        this.segmentWidth = 20;

        // Geyser storage
        this.geysers = [];

        this.generate();
    }

    generate() {
        this.points = [];
        const numPoints = Math.ceil(this.width / this.segmentWidth) + 1;

        // --- PASS 1: Generate Raw Noise ---
        let currentY = this.height * 0.8;

        for (let i = 0; i < numPoints; i++) {
            const variation = (Math.random() - 0.5) * this.params.roughness;
            currentY += variation;

            // Keep within reasonable vertical bounds
            if (currentY < this.height * 0.4) currentY = this.height * 0.4;
            if (currentY > this.height - 50) currentY = this.height - 50;

            this.points.push({
                x: i * this.segmentWidth,
                y: currentY,
                isPad: false,
                isLaunchPad: false
            });
        }

        // --- PASS 2: Loop Smoothing (Fix Discontinuity) ---
        // Calculate difference between start and end
        const firstY = this.points[0].y;
        const lastY = this.points[this.points.length - 1].y;
        const offset = lastY - firstY;

        // Distribute the offset linearly across all points to close the loop
        for (let i = 0; i < this.points.length; i++) {
            const progress = i / (this.points.length - 1);
            this.points[i].y -= offset * progress;
        }

        // --- PASS 3: Create Features (Pads) ---
        // Now that terrain is smoothed, we can flatten areas safely.

        // 3a. Launch Pad (Centered)
        if (this.hasLaunchPad) {
            const centerIndex = Math.floor(numPoints / 2);
            const padRadius = 4;
            const lpStart = centerIndex - padRadius;
            const lpEnd = centerIndex + padRadius;
            const lpY = this.height - 100; // Fixed height for launch pad

            this.launchPadPosition = { x: this.points[centerIndex].x, y: lpY };

            for (let i = lpStart; i <= lpEnd; i++) {
                if (this.points[i]) {
                    this.points[i].y = lpY;
                    this.points[i].isLaunchPad = true;
                }
            }
        }

        // 3b. Landing Pads (Random Placement)
        const flatSpotsNeeded = this.params.flat_spots || 1;
        let padsCreated = 0;
        let attempts = 0;

        while (padsCreated < flatSpotsNeeded && attempts < 500) {
            attempts++;

            // Pick random spot (margin of 10 segments from edges)
            const idx = Math.floor(Math.random() * (this.points.length - 20)) + 10;
            const padWidth = 6; // Width of landing pads in segments

            // Safety Check: Don't overwrite Launch Pad
            let safe = true;
            for(let k = 0; k < padWidth; k++) {
                if (this.points[idx+k].isLaunchPad || this.points[idx+k].isPad) {
                    safe = false;
                    break;
                }
            }

            if (safe) {
                // Calculate average Y to flatten nicely, or just pick the center Y
                let avgY = 0;
                for(let k=0; k<padWidth; k++) avgY += this.points[idx+k].y;
                avgY /= padWidth;

                // Flatten and Mark
                for (let k = 0; k < padWidth; k++) {
                    this.points[idx+k].y = avgY;
                    this.points[idx+k].isPad = true;
                }

                // Store pad info for Geyser generation safety
                this.pads.push({
                    x: this.points[idx].x,
                    width: padWidth * this.segmentWidth,
                    y: avgY
                });

                padsCreated++;
            }
        }

        // --- PASS 4: Generate Geysers ---
        if (this.params.geysers) {
            this.generateGeysers(this.params.geysers);
        }
    }

    generateGeysers(config) {
        const count = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
        let placed = 0;
        let attempts = 0;

        while (placed < count && attempts < 200) {
            attempts++;
            const idx = Math.floor(Math.random() * (this.points.length - 10)) + 5;
            const point = this.points[idx];

            // Safety Check: Don't spawn on Pads or Launch Pads
            let safe = true;

            // Check neighbors to avoid visual clutter
            for(let k = -2; k <= 2; k++) {
                const neighbor = this.points[idx+k];
                if (neighbor && (neighbor.isPad || neighbor.isLaunchPad)) {
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

    updateGeysers(dt, ship) {
        this.geysers.forEach(g => g.update(dt, ship));
    }

    getHeightAt(x) {
        // Handle wrapping for x coordinates outside bounds
        if (x < 0) x += this.width;
        if (x >= this.width) x -= this.width;

        const index = Math.floor(x / this.segmentWidth);

        // Safe access
        const p1 = this.points[index];
        const p2 = this.points[index + 1] || this.points[0]; // Wrap to 0 if at end

        const ratio = (x - p1.x) / this.segmentWidth;
        const y = p1.y + (p2.y - p1.y) * ratio;

        return {
            y: y,
            isPad: p1.isPad && p2.isPad, // Only safe if both points are pad
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
            // Fill down way below screen to ensure coverage
            ctx.lineTo(this.width, this.height + 5000);
            ctx.lineTo(0, this.height + 5000);
        }
        ctx.fill();

        // 2. Surface Line
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (this.points.length > 0) {
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                ctx.lineTo(this.points[i].x, this.points[i].y);
            }
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
