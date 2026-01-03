/**
 * Configuration file for Particle Text 3D System
 * Centralized configuration management
 */

export const CONFIG = {
    // Particle System
    particleCount: 8000,
    particleSize: 4.5,
    returnSpeed: 0.12,
    friction: 0.92,
    
    // Text Generation
    textCanvas: {
        width: 1000,
        height: 400,
        fontSize: 150,
        fontFamily: '900 150px "Microsoft YaHei", "Arial Black", sans-serif',
        samplingStep: 4
    },
    
    // Hand Tracking
    hands: {
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6, // Lowered for faster detection
        minTrackingConfidence: 0.6 // Lowered for faster tracking
    },
    
    // Camera
    camera: {
        width: 640,
        height: 480
    },
    
    // Scene
    scene: {
        fogColor: 0x000000,
        fogDensity: 0.0008,
        cameraFov: 75,
        cameraNear: 1,
        cameraFar: 3000,
        cameraZ: 600
    },
    
    // Post Processing
    bloom: {
        threshold: 0.0,
        strength: 4.5, // Increased bloom strength for brighter glow
        radius: 0.85
    },
    
    // Interaction
    interaction: {
        handInfluenceRadius: 250,
        physicsInfluenceRadius: 50000,
        forceMultiplier: 15000,
        fistThreshold: 0.15, // Lowered for more sensitive fist detection
        openThreshold: 0.28 // Lowered for more sensitive open hand detection
    },
    
    // Performance
    performance: {
        throttleMs: 16, // ~60fps
        debounceResizeMs: 250
    }
};

// Themes will be initialized after THREE is loaded
export function createThemes() {
    return {
        1: { 
            name: 'Neon Cyan',
            color1: new THREE.Color(0x00ffff), 
            color2: new THREE.Color(0x8800ff),
            text: 'Hello'
        },
        2: { 
            name: 'Gold',
            color1: new THREE.Color(0xffdd00), 
            color2: new THREE.Color(0xff3300),
            text: 'HaiDang'
        },
        3: { 
            name: 'Pink Love',
            color1: new THREE.Color(0xff0055), 
            color2: new THREE.Color(0xffbbdd),
            text: 'I Love You'
        },
        4: { 
            name: 'Purple',
            color1: new THREE.Color(0xaa00ff), 
            color2: new THREE.Color(0xff00aa),
            text: 'Awesome'
        },
        5: { 
            name: 'Green',
            color1: new THREE.Color(0x00ff88), 
            color2: new THREE.Color(0x88ff00),
            text: 'Welcome'
        }
    };
}

