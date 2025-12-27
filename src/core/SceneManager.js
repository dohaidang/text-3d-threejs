/**
 * Scene Manager
 * Manages Three.js scene, camera, renderer, and post-processing
 */

import { CONFIG } from '../config.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

export class SceneManager {
    constructor(container) {
        this.container = container;
        this.errorHandler = new ErrorHandler();
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
    }

    init() {
        try {
            this.createScene();
            this.createCamera();
            this.createRenderer();
            this.createPostProcessing();
            this.setupResizeHandler();
            return true;
        } catch (error) {
            this.errorHandler.handleWebGLError(error);
            return false;
        }
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(
            CONFIG.scene.fogColor, 
            CONFIG.scene.fogDensity
        );
    }

    createCamera() {
        this.camera = new THREE.PerspectiveCamera(
            CONFIG.scene.cameraFov,
            this.width / this.height,
            CONFIG.scene.cameraNear,
            CONFIG.scene.cameraFar
        );
        this.camera.position.z = CONFIG.scene.cameraZ;
    }

    createRenderer() {
        try {
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: false, 
                alpha: false, 
                powerPreference: "high-performance" 
            });
            this.renderer.setSize(this.width, this.height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.5; // Increased exposure for brighter particles
            this.container.appendChild(this.renderer.domElement);
        } catch (error) {
            throw new Error('Failed to create WebGL renderer: ' + error.message);
        }
    }

    createPostProcessing() {
        const renderScene = new THREE.RenderPass(this.scene, this.camera);
        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(this.width, this.height), 
            1.5, 
            0.4, 
            0.85
        );
        bloomPass.threshold = CONFIG.bloom.threshold;
        bloomPass.strength = CONFIG.bloom.strength;
        bloomPass.radius = CONFIG.bloom.radius;

        this.composer = new THREE.EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(bloomPass);
    }

    setupResizeHandler() {
        const handleResize = () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            
            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.width, this.height);
            this.composer.setSize(this.width, this.height);
        };

        // Debounce resize for better performance
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(handleResize, CONFIG.performance.debounceResizeMs);
        });
    }

    render() {
        if (this.composer) {
            this.composer.render();
        }
    }

    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.composer) {
            this.composer.dispose();
        }
    }
}

