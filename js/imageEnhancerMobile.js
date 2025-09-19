/* 移动端图片增强优化模块 - 专为移动设备优化的图片处理 */

class ImageEnhancerMobile {
    constructor() {
        this.isMobile = this.detectMobileDevice();
        this.deviceCapability = this.assessDeviceCapability();
        this.optimizationSettings = this.getOptimizationSettings();
        
        this.initMobileOptimizations();
    }

    detectMobileDevice() {
        const userAgent = navigator.userAgent;
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isSmallScreen = window.innerWidth <= 768;
        const isTouchDevice = 'ontouchstart' in window;
        
        return isMobileUA || isSmallScreen || isTouchDevice;
    }

    assessDeviceCapability() {
        const memory = navigator.deviceMemory || (this.isMobile ? 2 : 4);
        const cores = navigator.hardwareConcurrency || (this.isMobile ? 4 : 8);
        const connection = navigator.connection;
        
        let capability = 'medium';
        
        if (this.isMobile) {
            if (memory <= 2 && cores <= 4) {
                capability = 'low';
            } else if (memory <= 4 && cores <= 6) {
                capability = 'medium';
            } else {
                capability = 'high';
            }
        } else {
            if (memory <= 4) {
                capability = 'medium';
            } else {
                capability = 'high';
            }
        }
        
        // 网络状况影响
        if (connection && connection.effectiveType) {
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                capability = 'low';
            }
        }
        
        return {
            level: capability,
            memory: memory,
            cores: cores,
            isMobile: this.isMobile,
            connection: connection?.effectiveType || 'unknown'
        };
    }

    getOptimizationSettings() {
        const settings = {
            maxImageSize: 2048 * 1536,
            maxBatchSize: 1,
            processingDelay: 200,
            qualityReduction: 0.1,
            enableProgressiveProcessing: true,
            enableMemoryMonitoring: true
        };
        
        switch (this.deviceCapability.level) {
            case 'low':
                settings.maxImageSize = 1024 * 768;
                settings.maxBatchSize = 1;
                settings.processingDelay = 500;
                settings.qualityReduction = 0.2;
                break;
                
            case 'medium':
                settings.maxImageSize = 1920 * 1080;
                settings.maxBatchSize = 1;
                settings.processingDelay = 200;
                settings.qualityReduction = 0.1;
                break;
                
            case 'high':
                settings.maxImageSize = 2560 * 1920;
                settings.maxBatchSize = 2;
                settings.processingDelay = 100;
                settings.qualityReduction = 0.05;
                break;
        }
        
        return settings;
    }

    initMobileOptimizations() {
        if (this.isMobile) {
            this.setupTouchOptimizations();
            this.setupNetworkOptimizations();
            this.setupBatteryOptimizations();
        }
    }

    setupTouchOptimizations() {
        // 优化触摸事件
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
        
        // 禁用双击缩放在某些区域
        const controlElements = document.querySelectorAll('.control-group, .preview-item');
        controlElements.forEach(element => {
            element.style.touchAction = 'manipulation';
        });
    }

    setupNetworkOptimizations() {
        if (navigator.connection) {
            const connection = navigator.connection;
            
            connection.addEventListener('change', () => {
                this.adjustForNetworkChange();
            });
            
            // 初始网络优化
            this.adjustForNetworkChange();
        }
    }

    setupBatteryOptimizations() {
        if (navigator.getBattery) {
            navigator.getBattery().then(battery => {
                battery.addEventListener('levelchange', () => {
                    this.adjustForBatteryLevel(battery.level);
                });
                
                battery.addEventListener('chargingchange', () => {
                    this.adjustForChargingState(battery.charging);
                });
                
                // 初始电池优化
                this.adjustForBatteryLevel(battery.level);
                this.adjustForChargingState(battery.charging);
            });
        }
    }

    handleTouchStart(event) {
        // 记录触摸开始，用于优化处理
        this.lastTouchTime = Date.now();
    }

    handleTouchMove(event) {
        // 在用户滑动时暂停重度计算
        if (window.imageEnhancer && window.imageEnhancer.isProcessing) {
            const timeSinceLastTouch = Date.now() - this.lastTouchTime;
            if (timeSinceLastTouch < 100) {
                // 用户正在活跃操作，暂缓处理
                return;
            }
        }
    }

    adjustForNetworkChange() {
        const connection = navigator.connection;
        if (!connection) return;
        
        const effectiveType = connection.effectiveType;
        
        // 根据网络状况调整处理策略
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            this.optimizationSettings.qualityReduction = 0.3;
            this.optimizationSettings.maxImageSize = 1024 * 768;
        } else if (effectiveType === '3g') {
            this.optimizationSettings.qualityReduction = 0.2;
            this.optimizationSettings.maxImageSize = 1920 * 1080;
        } else {
            // 4G or better
            this.optimizationSettings.qualityReduction = 0.1;
            this.optimizationSettings.maxImageSize = 2560 * 1920;
        }
        
        // 通知用户网络状况
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            if (window.fileHandler) {
                window.fileHandler.showWarning('检测到慢速网络，已自动降低处理质量以提升速度');
            }
        }
    }

    adjustForBatteryLevel(level) {
        // 根据电池电量调整处理强度
        if (level < 0.2) { // 电量低于20%
            this.optimizationSettings.processingDelay = 1000;
            this.optimizationSettings.maxBatchSize = 1;
            
            if (window.fileHandler) {
                window.fileHandler.showWarning('电量较低，已启用省电模式');
            }
        } else if (level < 0.5) { // 电量低于50%
            this.optimizationSettings.processingDelay = 500;
            this.optimizationSettings.maxBatchSize = 1;
        } else {
            this.optimizationSettings.processingDelay = 200;
            this.optimizationSettings.maxBatchSize = this.deviceCapability.level === 'high' ? 2 : 1;
        }
    }

    adjustForChargingState(isCharging) {
        if (isCharging) {
            // 充电时可以更积极地处理
            this.optimizationSettings.processingDelay = Math.max(100, this.optimizationSettings.processingDelay - 100);
        } else {
            // 不在充电时保守一些
            this.optimizationSettings.processingDelay += 100;
        }
    }

    async optimizeImageForMobile(imageDataUrl, targetSize) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const originalWidth = img.naturalWidth;
                    const originalHeight = img.naturalHeight;
                    
                    // 计算合适的尺寸
                    const { width, height, needsResize } = this.calculateOptimalSize(
                        originalWidth, 
                        originalHeight, 
                        targetSize
                    );
                    
                    if (!needsResize) {
                        resolve(imageDataUrl);
                        return;
                    }
                    
                    // 创建优化的canvas
                    const { canvas, ctx } = window.memoryManager.createOptimizedCanvas(width, height);
                    
                    // 高质量缩放
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // 应用移动端优化
                    const quality = 0.85 - this.optimizationSettings.qualityReduction;
                    const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    
                    resolve(optimizedDataUrl);
                    
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = reject;
            img.src = imageDataUrl;
        });
    }

    calculateOptimalSize(originalWidth, originalHeight, maxSize) {
        const pixels = originalWidth * originalHeight;
        
        if (pixels <= maxSize) {
            return { 
                width: originalWidth, 
                height: originalHeight, 
                needsResize: false 
            };
        }
        
        const scale = Math.sqrt(maxSize / pixels);
        const width = Math.floor(originalWidth * scale);
        const height = Math.floor(originalHeight * scale);
        
        return { width, height, needsResize: true, scale };
    }

    async enhanceImageMobile(imageDataUrl, level) {
        // 移动端专用的增强算法
        if (level === 0) return imageDataUrl;
        
        try {
            // 先优化图片尺寸
            const optimizedImage = await this.optimizeImageForMobile(
                imageDataUrl, 
                this.optimizationSettings.maxImageSize
            );
            
            // 应用轻量级增强
            return await this.applyMobileFriendlyEnhancement(optimizedImage, level);
            
        } catch (error) {
            console.error('移动端图片增强失败:', error);
            throw error;
        }
    }

    async applyMobileFriendlyEnhancement(imageDataUrl, level) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const { canvas, ctx } = window.memoryManager.createOptimizedCanvas(img.naturalWidth, img.naturalHeight);
                    
                    ctx.drawImage(img, 0, 0);
                    
                    // 使用优化的增强算法
                    this.applyLightweightSharpening(ctx, canvas.width, canvas.height, level);
                    
                    const quality = 0.88 - this.optimizationSettings.qualityReduction;
                    const enhancedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    
                    resolve(enhancedDataUrl);
                    
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = reject;
            img.src = imageDataUrl;
        });
    }

    applyLightweightSharpening(ctx, width, height, level) {
        // 轻量级锐化算法，适合移动设备
        const strengths = [0, 0.2, 0.4, 0.6];
        const strength = strengths[level] || 0.2;
        
        if (strength === 0) return;
        
        // 使用WebGL如果可用
        if (this.canUseWebGL(ctx)) {
            this.applyWebGLSharpening(ctx, width, height, strength);
        } else {
            this.applyCPUSharpening(ctx, width, height, strength);
        }
    }

    canUseWebGL(ctx) {
        // 检查是否可以使用WebGL加速
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }

    applyWebGLSharpening(ctx, width, height, strength) {
        // WebGL加速的锐化（简化版）
        // 这里可以实现WebGL着色器版本，但为了兼容性使用CPU版本
        this.applyCPUSharpening(ctx, width, height, strength);
    }

    applyCPUSharpening(ctx, width, height, strength) {
        // 优化的CPU锐化算法
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const output = new Uint8ClampedArray(data);
        
        // 简化的锐化核
        const center = 1 + 4 * strength;
        const edge = -strength;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) {
                    const pos = (y * width + x) * 4 + c;
                    
                    const value = 
                        data[pos] * center +
                        data[pos - 4] * edge +           // left
                        data[pos + 4] * edge +           // right
                        data[pos - width * 4] * edge +   // top
                        data[pos + width * 4] * edge;    // bottom
                    
                    output[pos] = Math.max(0, Math.min(255, value));
                }
            }
        }
        
        const outputImageData = new ImageData(output, width, height);
        ctx.putImageData(outputImageData, 0, 0);
    }

    async processBatchMobile(files, level, progressCallback) {
        const results = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            try {
                if (progressCallback) {
                    progressCallback(i, files.length, file.name);
                }
                
                // 检查设备状态
                if (this.shouldPauseForDevice()) {
                    await this.waitForOptimalConditions();
                }
                
                const enhancedImage = await this.enhanceImageMobile(file.imageData, level);
                
                results.push({
                    ...file,
                    imageData: enhancedImage,
                    enhanced: true,
                    enhancementLevel: level
                });
                
                // 移动设备间隔处理
                if (i < files.length - 1) {
                    await new Promise(resolve => 
                        setTimeout(resolve, this.optimizationSettings.processingDelay)
                    );
                }
                
            } catch (error) {
                console.error(`移动端处理失败: ${file.name}`, error);
                results.push(file); // 使用原图
            }
        }
        
        return results;
    }

    shouldPauseForDevice() {
        // 检查是否应该暂停处理
        const memoryInfo = window.memoryManager?.getMemoryInfo();
        
        // 内存压力
        if (memoryInfo?.usageRatio > 0.8) return true;
        
        // 电池电量低
        if (navigator.getBattery) {
            navigator.getBattery().then(battery => {
                if (battery.level < 0.15 && !battery.charging) return true;
            });
        }
        
        // 网络状况差
        if (navigator.connection?.effectiveType === 'slow-2g') return true;
        
        return false;
    }

    async waitForOptimalConditions() {
        // 等待设备条件改善
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (window.fileHandler) {
            window.fileHandler.showMessage('等待设备条件改善...', 'info');
        }
    }

    getDeviceInfo() {
        return {
            isMobile: this.isMobile,
            capability: this.deviceCapability,
            optimizations: this.optimizationSettings,
            userAgent: navigator.userAgent,
            memory: navigator.deviceMemory,
            cores: navigator.hardwareConcurrency,
            connection: navigator.connection?.effectiveType
        };
    }

    getMobileRecommendations() {
        const recommendations = [];
        
        if (this.deviceCapability.level === 'low') {
            recommendations.push({
                type: 'device_limitation',
                message: '检测到低端设备',
                suggestion: '建议使用关闭或轻度增强，避免处理过多图片'
            });
        }
        
        if (this.deviceCapability.memory <= 2) {
            recommendations.push({
                type: 'memory_limitation',
                message: '设备内存有限',
                suggestion: '建议一次处理少量图片，避免浏览器崩溃'
            });
        }
        
        if (navigator.connection?.effectiveType === 'slow-2g' || navigator.connection?.effectiveType === '2g') {
            recommendations.push({
                type: 'network_limitation',
                message: '网络速度较慢',
                suggestion: '已自动降低处理质量以提升速度'
            });
        }
        
        return recommendations;
    }
}

// 全局实例
window.imageEnhancerMobile = new ImageEnhancerMobile();
