export class Terrain {
  constructor(params, width, height, color = "#ffffff") { // Add color param
      this.params = params;
      this.width = width;
      this.height = height;
      this.color = color; // Store it
      this.points = [];
      this.pads = [];
      this.segmentWidth = 20;

      this.generate();
  }

    generate() {
        this.points = [];
        const numPoints = Math.ceil(this.width / this.segmentWidth) + 1;

        // 1. Start with a baseline height (e.g., bottom 20% of screen)
        let currentY = this.height * 0.8;
        const startY = currentY;

        // 2. Walk through points
        for (let i = 0; i < numPoints; i++) {
            const x = i * this.segmentWidth;

            // Randomly move up or down based on roughness
            // We verify later if this section should be a landing pad
            const variation = (Math.random() - 0.5) * this.params.roughness;
            currentY += variation;

            // Clamp height so we don't go off-screen
            // Keep it between 50% height and bottom-10px
            if (currentY < this.height * 0.5) currentY = this.height * 0.5;
            if (currentY > this.height - 20) currentY = this.height - 20;

            this.points.push({ x: x, y: currentY, isPad: false });
        }

        // 3. Enforce Loop (Make end match start)
        // Linearly interpolate the last 20% of points to match the startY
        const fadeRange = Math.floor(numPoints * 0.2);
        for (let i = 0; i < fadeRange; i++) {
            const index = (numPoints - 1) - i;
            const t = i / fadeRange; // 0 to 1
            // Blend current noise with startY
            this.points[index].y = (this.points[index].y * (1-t)) + (startY * t);
        }
        // Force exact match on last point
        this.points[numPoints-1].y = startY;

        // 4. Create Landing Pads
        // We pick random spots and flatten them
        for (let k = 0; k < (this.params.flat_spots || 1); k++) {
            this.createLandingPad();
        }
    }

    createLandingPad() {
        // Pick a random starting index (avoiding very edges)
        const padWidth = 5; // How many segments wide?
        const minIdx = 5;
        const maxIdx = this.points.length - 5 - padWidth;
        const startIdx = Math.floor(Math.random() * (maxIdx - minIdx) + minIdx);

        // Calculate average height of this area to flatten it reasonably
        let avgHeight = 0;
        for(let i=0; i<padWidth; i++) avgHeight += this.points[startIdx + i].y;
        avgHeight /= padWidth;

        // Flatten logic
        for (let i = 0; i < padWidth; i++) {
            this.points[startIdx + i].y = avgHeight;
            this.points[startIdx + i].isPad = true;
        }

        const padCenterX = (this.points[startIdx].x + this.points[startIdx + padWidth].x) / 2;
        this.pads.push({ x: padCenterX });
    }

    // Get the exact ground height at a specific X coordinate
    getHeightAt(x) {
        // Find which segment we are in
        // Since points are sorted by X, we can calculate index directly
        const index = Math.floor(x / this.segmentWidth);

        if (index < 0 || index >= this.points.length - 1) return this.height;

        const p1 = this.points[index];
        const p2 = this.points[index + 1];

        // Linear Interpolation (LERP) to find exact Y between points
        const t = (x - p1.x) / (p2.x - p1.x);
        const y = p1.y + t * (p2.y - p1.y);

        return { y: y, isPad: p1.isPad && p2.isPad }; // Return Y and if it's safe
    }

    // In js/Terrain.js, replace the draw() method:

    draw(ctx) {
        ctx.save();

        // 1. Draw The Black Fill
        // We extend the bottom to this.height + 5000 to cover any camera overshoot
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        if (this.points.length > 0) {
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                ctx.lineTo(this.points[i].x, this.points[i].y);
            }
            // Extend infinite black void downwards
            ctx.lineTo(this.width, this.height + 5000);
            ctx.lineTo(0, this.height + 5000);
        }
        ctx.fill();

        // 2. Draw The Surface Line
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < this.points.length - 1; i++) {
            ctx.moveTo(this.points[i].x, this.points[i].y);
            ctx.lineTo(this.points[i+1].x, this.points[i+1].y);
        }
        ctx.stroke();

        // 3. Draw Landing Pads
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

        ctx.restore();
    }
}
