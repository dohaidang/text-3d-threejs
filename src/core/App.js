/**
 * Main Application Class
 * Orchestrates all components
 */

import { CONFIG, createThemes } from '../config.js';
import { SceneManager } from './SceneManager.js';
import { ParticleSystem } from './ParticleSystem.js';
import { HandTracker } from './HandTracker.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';
import { throttle } from '../utils/Throttle.js';

export class App {
    constructor() {
        this.sceneManager = null;
        this.particleSystem = null;
        this.handTracker = null;
        this.performanceMonitor = new PerformanceMonitor();
        this.errorHandler = new ErrorHandler();
        this.clock = new THREE.Clock();
        this.THEMES = createThemes();
        this.currentTheme = this.THEMES[1];
        this.isRunning = false;
        this.animationFrameId = null;
    }

    async init() {
        try {
            // Initialize scene
            this.sceneManager = new SceneManager(document.body);
            if (!this.sceneManager.init()) {
                throw new Error('Failed to initialize scene');
            }

            // Initialize particle system
            this.particleSystem = new ParticleSystem(this.sceneManager.getScene());
            this.particleSystem.generateTextParticles(this.currentTheme.text);

            // Initialize hand tracker
            const videoElement = document.getElementById('input_video');
            this.handTracker = new HandTracker(videoElement, (interactionState) => {
                this.onHandTrackingUpdate(interactionState);
            });

            const handTrackerReady = await this.handTracker.init();
            if (!handTrackerReady) {
                throw new Error('Failed to initialize hand tracker');
            }

            // Hide loading
            const loadingEl = document.getElementById('loading');
            if (loadingEl) {
                loadingEl.style.display = 'none';
            }

            // Start animation loop
            this.start();

            return true;
        } catch (error) {
            this.errorHandler.log(error, 'App.init');
            return false;
        }
    }

    onHandTrackingUpdate(interactionState) {
        const mode = interactionState.mode;
        
        if (mode >= 1 && mode <= 3 && this.currentTheme !== this.THEMES[mode]) {
            this.currentTheme = this.THEMES[mode];
            this.particleSystem.generateTextParticles(this.currentTheme.text);
        }
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    animate() {
        if (!this.isRunning) return;

        this.animationFrameId = requestAnimationFrame(() => this.animate());
        
        const time = this.clock.getElapsedTime();
        const interactionState = this.handTracker.getInteractionState();

        // Update particles
        this.particleSystem.update(time, this.currentTheme, interactionState);

        // Update performance monitor
        this.performanceMonitor.update();

        // Render
        this.sceneManager.render();
    }

    dispose() {
        this.stop();
        
        if (this.handTracker) {
            this.handTracker.stop();
        }
        
        if (this.particleSystem) {
            this.particleSystem.dispose();
        }
        
        if (this.sceneManager) {
            this.sceneManager.dispose();
        }
    }

    getPerformanceStats() {
        return {
            fps: this.performanceMonitor.getFPS(),
            avgFrameTime: this.performanceMonitor.getAverageFrameTime()
        };
    }

    getInteractionState() {
        if (this.handTracker) {
            return this.handTracker.getInteractionState();
        }
        return null;
    }
}

