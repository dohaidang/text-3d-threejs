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

        // Detect hand action (fist vs open) - improved detection
        const tip8 = landmarks[8];
        const tip12 = landmarks[12];
        const tip16 = landmarks[16];
        const tip20 = landmarks[20];
        const wrist = landmarks[0];
        
        // Calculate distance from multiple fingertips to wrist for better accuracy
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
        
        // Average distance for more stable detection
        const avgDist = (dist8 + dist12 + dist16 + dist20) / 4;

        // Detect action with improved thresholds - immediate response
        if (avgDist < CONFIG.interaction.fistThreshold) {
            this.interactionState.rightHandAction = 'fist';
        } else if (avgDist > CONFIG.interaction.openThreshold) {
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

