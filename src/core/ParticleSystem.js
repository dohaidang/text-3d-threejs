/**
 * Particle System
 * Manages particle geometry, material, and physics
 */

import { CONFIG } from '../config.js';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = null;
        this.geometry = null;
        this.currentPositions = [];
        this.velocities = [];
        this.targetPositions = [];
        this.init();
    }

    init() {
        this.createGeometry();
        this.createMaterial();
        this.createParticles();
    }

    createGeometry() {
        this.geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(CONFIG.particleCount * 3);
        const colors = new Float32Array(CONFIG.particleCount * 3);

        for (let i = 0; i < CONFIG.particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 1500;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 1500;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 1000;

            colors[i * 3] = 1;
            colors[i * 3 + 1] = 1;
            colors[i * 3 + 2] = 1;

            this.currentPositions.push(
                new THREE.Vector3(positions[i*3], positions[i*3+1], positions[i*3+2])
            );
            this.velocities.push(new THREE.Vector3(0, 0, 0));
            this.targetPositions.push(new THREE.Vector3(0, 0, 0));
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }

    createMaterial() {
        const sprite = this.createTexture();
        const material = new THREE.PointsMaterial({
            size: CONFIG.particleSize,
            map: sprite,
            vertexColors: true,
            transparent: true,
            opacity: 1.3, // Increased opacity for brighter particles
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.material = material;
    }

    createTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    createParticles() {
        this.particles = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.particles);
    }

    generateTextParticles(text) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const { width: W, height: H, fontSize, fontFamily, samplingStep: step } = CONFIG.textCanvas;
        
        canvas.width = W;
        canvas.height = H;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);
        
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = fontFamily;
        ctx.fillText(text, W/2, H/2);

        const data = ctx.getImageData(0, 0, W, H).data;
        const validPoints = [];

        for (let y = 0; y < H; y += step) {
            for (let x = 0; x < W; x += step) {
                if (data[(y * W + x) * 4] > 128) {
                    validPoints.push({
                        x: (x - W / 2) * 2.2,
                        y: -(y - H / 2) * 2.2
                    });
                }
            }
        }

        // Shuffle for more organic movement
        validPoints.sort(() => Math.random() - 0.5);

        for (let i = 0; i < CONFIG.particleCount; i++) {
            if (i < validPoints.length) {
                this.targetPositions[i].set(validPoints[i].x, validPoints[i].y, 0);
            } else {
                const angle = Math.random() * Math.PI * 2;
                const r = 500 + Math.random() * 500;
                this.targetPositions[i].set(
                    Math.cos(angle) * r, 
                    Math.sin(angle) * r, 
                    (Math.random() - 0.5) * 400
                );
            }
        }
    }

    update(time, theme, interactionState) {
        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;
        const rhPos = interactionState.rightHandPos;
        const rhAction = interactionState.rightHandAction;
        const tempColor = new THREE.Color();
        const { color1: targetColor1, color2: targetColor2 } = theme;

        for (let i = 0; i < CONFIG.particleCount; i++) {
            const p = this.currentPositions[i];
            const v = this.velocities[i];
            const t = this.targetPositions[i];

            // Color animation
            const mixRatio = (Math.sin(time * 1.5 + p.x * 0.0015) + 1) / 2;
            tempColor.copy(targetColor1).lerp(targetColor2, mixRatio);

            // Hand proximity color effect
            if (rhPos.x !== 9999) {
                const distToHand = p.distanceTo(rhPos);
                if (distToHand < CONFIG.interaction.handInfluenceRadius) {
                    const influence = 1 - (distToHand / CONFIG.interaction.handInfluenceRadius);
                    tempColor.lerp(new THREE.Color(0xffffff), influence * 0.9);
                    tempColor.r *= 1.2;
                    tempColor.g *= 1.2;
                    tempColor.b *= 1.2;
                }
            }

            // Increase color intensity for brighter particles
            colors[i * 3] = Math.min(1.0, tempColor.r * 1.2);
            colors[i * 3 + 1] = Math.min(1.0, tempColor.g * 1.2);
            colors[i * 3 + 2] = Math.min(1.0, tempColor.b * 1.2);

            // Return force to target
            const forceX = (t.x - p.x) * CONFIG.returnSpeed;
            const forceY = (t.y - p.y) * CONFIG.returnSpeed;
            const forceZ = (t.z - p.z) * CONFIG.returnSpeed;

            v.x += forceX;
            v.y += forceY;
            v.z += forceZ;

            // Random noise for organic movement
            v.x += (Math.random() - 0.5) * 0.8;
            v.y += (Math.random() - 0.5) * 0.8;
            v.z += (Math.random() - 0.5) * 0.8;

            // Hand interaction physics
            if (rhPos.x !== 9999) {
                const dx = p.x - rhPos.x;
                const dy = p.y - rhPos.y;
                const dz = p.z - rhPos.z;
                const distSq = dx * dx + dy * dy + dz * dz + 100;
                
                if (distSq < CONFIG.interaction.physicsInfluenceRadius) {
                    const forceMagnitude = CONFIG.interaction.forceMultiplier / distSq;
                    
                    if (rhAction === 'fist') {
                        // Black hole effect
                        v.x -= dx * forceMagnitude * 0.08;
                        v.y -= dy * forceMagnitude * 0.08;
                        v.z -= dz * forceMagnitude * 0.08;
                        v.x += dy * 0.05; // Rotation
                        v.y -= dx * 0.05;
                    } else if (rhAction === 'open') {
                        // Explosion effect
                        v.x += dx * forceMagnitude * 0.15;
                        v.y += dy * forceMagnitude * 0.15;
                        v.z += dz * forceMagnitude * 0.15 + 2;
                    } else {
                        // Flow effect
                        v.x += dx * forceMagnitude * 0.02;
                        v.y += dy * forceMagnitude * 0.02;
                        v.z += dz * forceMagnitude * 0.02;
                    }
                }
            }

            // Apply friction
            v.x *= CONFIG.friction;
            v.y *= CONFIG.friction;
            v.z *= CONFIG.friction;

            // Update position
            p.add(v);

            positions[i * 3] = p.x;
            positions[i * 3 + 1] = p.y;
            positions[i * 3 + 2] = p.z;
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }

    dispose() {
        if (this.geometry) this.geometry.dispose();
        if (this.material) {
            if (this.material.map) this.material.map.dispose();
            this.material.dispose();
        }
        if (this.particles) {
            this.scene.remove(this.particles);
        }
    }
}

