/**
 * Error Handler Utility
 * Centralized error handling and logging
 */

export class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 50;
    }

    log(error, context = '') {
        const errorInfo = {
            message: error.message || error,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        };

        this.errors.push(errorInfo);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        console.error(`[ErrorHandler] ${context}:`, errorInfo);
        
        // Could send to analytics service here
        return errorInfo;
    }

    handleCameraError(error) {
        this.log(error, 'Camera');
        this.showUserMessage('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.', 'error');
    }

    handleHandTrackingError(error) {
        this.log(error, 'HandTracking');
        this.showUserMessage('Lỗi nhận diện tay. Vui lòng thử lại.', 'warning');
    }

    handleWebGLError(error) {
        this.log(error, 'WebGL');
        this.showUserMessage('Trình duyệt không hỗ trợ WebGL. Vui lòng cập nhật trình duyệt.', 'error');
    }

    showUserMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.className = `error-message error-message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'error' ? 'rgba(255,0,0,0.9)' : 'rgba(255,165,0,0.9)'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            font-family: 'Segoe UI', Arial, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => messageEl.remove(), 300);
        }, 5000);
    }

    getErrors() {
        return this.errors;
    }

    clearErrors() {
        this.errors = [];
    }
}

