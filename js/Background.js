export class Background {
    constructor(screenWidth, screenHeight, starCount = 150) {
        this.width = screenWidth;
        this.height = screenHeight;
        this.stars = [];

        // Create stars randomly within the SCREEN dimensions
        for(let i=0; i<starCount; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2 + 0.5,
                // Parallax factor: 0 = moves with ship (UI), 1 = stationary in world
                // We want small values so they look far away
                parallaxX: 0.05 + Math.random() * 0.1,
                parallaxY: 0.05 + Math.random() * 0.1
            });
        }
    }

    draw(ctx, cameraX, cameraY) {
        ctx.fillStyle = 'white';

        this.stars.forEach(star => {
            // Calculate position based on camera movement
            // We use modulo (%) with the SCREEN width, not world width
            let x = (star.x - cameraX * star.parallaxX) % this.width;
            let y = (star.y - cameraY * star.parallaxY) % this.height;

            // Fix negative wrap
            if (x < 0) x += this.width;
            if (y < 0) y += this.height;

            ctx.fillRect(x, y, star.size, star.size);
        });
    }
}
