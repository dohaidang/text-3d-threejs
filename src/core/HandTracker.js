/**
 * Hand Tracker
 * Manages MediaPipe hand tracking and gesture recognition
 */

import { CONFIG } from '../config.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

export class HandTracker {
    constructor(videoElement, onResultsCallback) {
        this.videoElement = videoElement;
        this.onResultsCallback = onResultsCallback;
        this.errorHandler = new ErrorHandler();
        this.hands = null;
        this.camera = null;
        this.interactionState = {
            mode: 1,
            rightHandPos: new THREE.Vector3(9999, 9999, 0),
            rightHandAction: 'neutral'
        };
    }

    async init() {
        try {
            await this.setupHands();
            await this.setupCamera();
            return true;
        } catch (error) {
            this.errorHandler.handleHandTrackingError(error);
            return false;
        }
    }

    setupHands() {
        return new Promise((resolve, reject) => {
            try {
                this.hands = new Hands({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
                });
                
                this.hands.setOptions({
                    maxNumHands: CONFIG.hands.maxNumHands,
                    modelComplexity: CONFIG.hands.modelComplexity,
                    minDetectionConfidence: CONFIG.hands.minDetectionConfidence,
                    minTrackingConfidence: CONFIG.hands.minTrackingConfidence
                });
                
                this.hands.onResults((results) => {
                    this.processResults(results);
                    if (this.onResultsCallback) {
                        this.onResultsCallback(this.interactionState);
                    }
                });
                
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    setupCamera() {
        return new Promise((resolve, reject) => {
            try {
                this.camera = new Camera(this.videoElement, {
                    onFrame: async () => {
                        try {
                            await this.hands.send({ image: this.videoElement });
                        } catch (error) {
                            this.errorHandler.handleHandTrackingError(error);
                        }
                    },
                    width: CONFIG.camera.width,
                    height: CONFIG.camera.height
                });
                
                this.camera.start().then(() => {
                    resolve();
                }).catch((error) => {
                    this.errorHandler.handleCameraError(error);
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    processResults(results) {
        // Reset state
        this.interactionState.rightHandPos.set(9999, 9999, 0);
        this.interactionState.rightHandAction = 'neutral';

        if (!results.multiHandLandmarks || !results.multiHandedness) {
            return;
        }

        for (let index = 0; index < results.multiHandLandmarks.length; index++) {
            const classification = results.multiHandedness[index];
            const isRightHand = classification.label === 'Right';
            const landmarks = results.multiHandLandmarks[index];

            if (!isRightHand) {
                // Left hand: gesture recognition
                this.processLeftHand(landmarks);
            } else {
                // Right hand: position and action
                this.processRightHand(landmarks);
            }
        }
    }

    processLeftHand(landmarks) {
        let fingers = 0;
        if (landmarks[8].y < landmarks[6].y) fingers++;
        if (landmarks[12].y < landmarks[10].y) fingers++;
        if (landmarks[16].y < landmarks[14].y) fingers++;
        if (landmarks[20].y < landmarks[18].y) fingers++;

        // Only update if mode changed to avoid unnecessary text regeneration
        if (fingers >= 1 && fingers <= 3 && this.interactionState.mode !== fingers) {
            this.interactionState.mode = fingers;
        }
    }

    processRightHand(landmarks) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Use middle finger MCP (landmark 9) as hand position
        const x = (1 - landmarks[9].x) * width - width / 2;
        const y = -(landmarks[9].y * height - height / 2);
        this.interactionState.rightHandPos.set(x, y, 0);

        // Improved fist detection using finger curl analysis
        // MediaPipe landmarks: 8=Index tip, 12=Middle tip, 16=Ring tip, 20=Pinky tip
        // PIP joints: 6=Index PIP, 10=Middle PIP, 14=Ring PIP, 18=Pinky PIP
        const tip8 = landmarks[8];   // Index tip
        const tip12 = landmarks[12]; // Middle tip
        const tip16 = landmarks[16];  // Ring tip
        const tip20 = landmarks[20]; // Pinky tip
        const pip6 = landmarks[6];   // Index PIP
        const pip10 = landmarks[10]; // Middle PIP
        const pip14 = landmarks[14]; // Ring PIP
        const pip18 = landmarks[18]; // Pinky PIP
        const wrist = landmarks[0];
        
        // Check if fingers are curled by comparing tip Y position with PIP Y position
        // For a fist, tips should be below (higher Y value) or close to PIP joints
        let curledFingers = 0;
        
        // Index finger: tip should be below PIP when curled
        if (tip8.y > pip6.y) {
            curledFingers++;
        }
        
        // Middle finger: tip should be below PIP when curled
        if (tip12.y > pip10.y) {
            curledFingers++;
        }
        
        // Ring finger: tip should be below PIP when curled
        if (tip16.y > pip14.y) {
            curledFingers++;
        }
        
        // Pinky finger: tip should be below PIP when curled
        if (tip20.y > pip18.y) {
            curledFingers++;
        }
        
        // Calculate distance from fingertips to wrist as secondary check
        const dist8 = Math.sqrt(
            Math.pow(tip8.x - wrist.x, 2) + 
            Math.pow(tip8.y - wrist.y, 2)
        );
        const dist12 = Math.sqrt(
            Math.pow(tip12.x - wrist.x, 2) + 
            Math.pow(tip12.y - wrist.y, 2)
        );
        const dist16 = Math.sqrt(
            Math.pow(tip16.x - wrist.x, 2) + 
            Math.pow(tip16.y - wrist.y, 2)
        );
        const dist20 = Math.sqrt(
            Math.pow(tip20.x - wrist.x, 2) + 
            Math.pow(tip20.y - wrist.y, 2)
        );
        
        const avgDist = (dist8 + dist12 + dist16 + dist20) / 4;
        
        // Check if fingertips are close to their PIP joints (another sign of fist)
        const distTipToPip8 = Math.sqrt(
            Math.pow(tip8.x - pip6.x, 2) + 
            Math.pow(tip8.y - pip6.y, 2)
        );
        const distTipToPip12 = Math.sqrt(
            Math.pow(tip12.x - pip10.x, 2) + 
            Math.pow(tip12.y - pip10.y, 2)
        );
        const distTipToPip16 = Math.sqrt(
            Math.pow(tip16.x - pip14.x, 2) + 
            Math.pow(tip16.y - pip14.y, 2)
        );
        const distTipToPip20 = Math.sqrt(
            Math.pow(tip20.x - pip18.x, 2) + 
            Math.pow(tip20.y - pip18.y, 2)
        );
        
        const avgTipToPipDist = (distTipToPip8 + distTipToPip12 + distTipToPip16 + distTipToPip20) / 4;
        
        // Fist detection: at least 3 fingers curled AND fingertips close to PIP joints
        // OR average distance to wrist is very small
        const isFist = (curledFingers >= 3 && avgTipToPipDist < 0.08) || avgDist < CONFIG.interaction.fistThreshold;
        
        // Open hand: most fingers extended AND average distance to wrist is large
        const isOpen = curledFingers <= 1 && avgDist > CONFIG.interaction.openThreshold;
        
        // Detect action with improved accuracy
        if (isFist) {
            this.interactionState.rightHandAction = 'fist';
        } else if (isOpen) {
            this.interactionState.rightHandAction = 'open';
        } else {
            this.interactionState.rightHandAction = 'neutral';
        }
    }

    getInteractionState() {
        return this.interactionState;
    }

    stop() {
        if (this.camera) {
            this.camera.stop();
        }
    }
}

