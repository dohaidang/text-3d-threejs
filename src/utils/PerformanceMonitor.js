/**
 * Performance Monitor
 * Tracks FPS and performance metrics
 */

export class PerformanceMonitor {
    constructor() {
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.frameTimes = [];
        this.maxFrameTimeHistory = 60;
    }

    update() {
        const now = performance.now();
        const delta = now - this.lastTime;
        this.frameTimes.push(delta);
        
        if (this.frameTimes.length > this.maxFrameTimeHistory) {
            this.frameTimes.shift();
        }

        this.frameCount++;
        this.lastTime = now;

        // Calculate FPS every second
        if (this.frameCount % 60 === 0) {
            const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
            this.fps = Math.round(1000 / avgFrameTime);
        }
    }

    getFPS() {
        return this.fps;
    }

    getAverageFrameTime() {
        if (this.frameTimes.length === 0) return 0;
        return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    }

    reset() {
        this.fps = 0;
        this.frameCount = 0;
        this.frameTimes = [];
        this.lastTime = performance.now();
    }
}

