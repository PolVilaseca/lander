export class InputHandler {
    constructor() {
        this.keys = {
            up: false,
            left: false,
            right: false
        };

        window.addEventListener('keydown', (e) => this.handleKey(e, true));
        window.addEventListener('keyup', (e) => this.handleKey(e, false));
    }

    handleKey(e, isPressed) {
        // Support Arrow Keys and WASD
        switch(e.code) {
            case 'ArrowUp':
            case 'KeyW':
            case 'Space':
                this.keys.up = isPressed;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.keys.left = isPressed;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.keys.right = isPressed;
                break;
        }
    }

    // specific getters for cleaner code later
    get thrust() { return this.keys.up; }
    get rotateLeft() { return this.keys.left; }
    get rotateRight() { return this.keys.right; }
}
