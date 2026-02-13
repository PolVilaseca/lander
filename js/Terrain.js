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

        this.generate();
    }

    generate() {
        this.points = [];
        const numPoints = Math.ceil(this.width / this.segmentWidth) + 1;

        let currentY = this.height * 0.8;

        // Launch Pad Settings - CENTERED
        // We want the pad in the middle of the world width
        const centerIndex = Math.floor(numPoints / 2);
        const padRadius = 4; // Total width approx 8-9 segments
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

                // Store center of launch pad
                if (i === centerIndex) {
                    this.launchPadPosition = { x: x, y: currentY };
                }

                // Cancel any green pad flattening here
                flattenSteps = 0;
            }
            else {
                // 2. Normal Terrain Logic
                if (flattenSteps > 0) {
                    // We are currently generating a flat Green Pad
                    currentY = flattenHeight;
                    flattenSteps--;
                } else {
                    // Random terrain variation
                    const variation = (Math.random() - 0.5) * this.params.roughness;
                    currentY += variation;

                    // Clamp to screen bounds
                    if (currentY < this.height * 0.5) currentY = this.height * 0.5;
                    if (currentY > this.height - 20) currentY = this.height - 20;

                    // Chance to Start a Green Landing Pad
                    // Conditions: Not a launch pad area (check margin), we need pads, random chance
                    // Ensure we are far enough from launch pad
                    const distToLP = Math.abs(i - centerIndex);
                    const safeDist = padRadius + 10; // Buffer

                    if (distToLP > safeDist && padsCreated < flatSpotsNeeded && i > 20 && Math.random() < 0.02) {
                        flattenSteps = 4; // Flatten for next 4 points
                        flattenHeight = currentY;
                        padsCreated++;
                    }
                }
            }

            this.points.push({ x: x, y: currentY, isPad: false, isLaunchPad: isLaunchPad });
        }

        // Post-Processing: Detect flat spots to mark them as "isPad" for physics/drawing
        for(let i=0; i<this.points.length-1; i++) {
            if (this.points[i].isLaunchPad) continue;

            // Check if this point and next are flat relative to each other
            if (Math.abs(this.points[i].y - this.points[i+1].y) < 0.1) {
                // Check sequence length
                let count = 1;
                while(i+count < this.points.length && Math.abs(this.points[i].y - this.points[i+count].y) < 0.1) {
                    count++;
                }

                // If reasonably long, mark as Pad
                if (count >= 3) {
                    for(let k=0; k<count; k++) {
                        this.points[i+k].isPad = true;
                    }
                    // Register for Radar
                    this.pads.push({ x: this.points[i].x + (count*this.segmentWidth)/2, y: this.points[i].y });
                    i += count - 1;
                }
            }
        }
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

        ctx.restore();
    }
}
