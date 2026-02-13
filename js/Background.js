export class Background {
    constructor(screenWidth, screenHeight, starCount = 200) {
        this.starCount = starCount;
        this.stars = [];
        this.resize(screenWidth, screenHeight);
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.stars = [];

        // Generate static stars fixed to the screen
        for (let i = 0; i < this.starCount; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 1.5 + 0.5, // 0.5 to 2.0 pixels
                alpha: Math.random() * 0.5 + 0.3 // Varied opacity for depth feeling
            });
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = '#ffffff';

        this.stars.forEach(star => {
            ctx.globalAlpha = star.alpha;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        });

        ctx.restore();
    }
}
