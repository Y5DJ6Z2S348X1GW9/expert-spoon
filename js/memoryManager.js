/* 内存管理模块 - 防止内存溢出，优化移动端性能 */

class MemoryManager {
    constructor() {
        this.maxImageSize = this.getMaxImageSize();
        this.maxProcessingImages = this.getMaxProcessingImages();
        this.memoryThreshold = this.getMemoryThreshold();
        this.currentMemoryUsage = 0;
        this.processedCanvases = new Set();
        
        this.initMemoryMonitoring();
    }

    getMaxImageSize() {
        // 根据设备性能确定最大处理图片尺寸
        const memory = this.getDeviceMemory();
        const isMobile = this.isMobileDevice();
        
        if (isMobile) {
            if (memory <= 2) return 1024 * 1024; // 1MP for low-end mobile
            if (memory <= 4) return 2048 * 1536; // 3MP for mid-range mobile
            return 2560 * 1920; // 5MP for high-end mobile
        } else {
            if (memory <= 4) return 2048 * 1536; // 3MP for low-end desktop
            if (memory <= 8) return 3840 * 2160; // 8MP for mid-range desktop
            return 7680 * 4320; // 33MP for high-end desktop
        }
    }

    getMaxProcessingImages() {
        const memory = this.getDeviceMemory();
        const isMobile = this.isMobileDevice();
        
        if (isMobile) {
            return memory <= 2 ? 1 : (memory <= 4 ? 2 : 3);
        } else {
            return memory <= 4 ? 3 : (memory <= 8 ? 5 : 10);
        }
    }

    getMemoryThreshold() {
        const memory = this.getDeviceMemory();
        const isMobile = this.isMobileDevice();
        
        // 使用可用内存的百分比作为阈值
        if (isMobile) {
            return memory <= 2 ? 0.5 : (memory <= 4 ? 0.6 : 0.7);
        } else {
            return memory <= 4 ? 0.6 : (memory <= 8 ? 0.7 : 0.8);
        }
    }

    getDeviceMemory() {
        // 尝试获取设备内存信息
        if (navigator.deviceMemory) {
            return navigator.deviceMemory;
        }
        
        // 备用检测方法
        if (navigator.hardwareConcurrency) {
            const cores = navigator.hardwareConcurrency;
            if (cores <= 2) return 2;
            if (cores <= 4) return 4;
            if (cores <= 8) return 8;
            return 16;
        }
        
        // 默认假设
        return this.isMobileDevice() ? 2 : 4;
    }

    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    initMemoryMonitoring() {
        // 监控内存使用情况
        if (window.performance && window.performance.memory) {
            setInterval(() => {
                this.checkMemoryUsage();
            }, 5000); // 每5秒检查一次
        }
        
        // 监听内存警告事件
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.cleanup();
            }
        });
    }

    checkMemoryUsage() {
        if (!window.performance?.memory) return false;
        
        const memory = window.performance.memory;
        const usedRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        if (usedRatio > this.memoryThreshold) {
            console.warn('内存使用率过高:', (usedRatio * 100).toFixed(1) + '%');
            this.triggerMemoryCleanup();
            return false;
        }
        
        return true;
    }

    triggerMemoryCleanup() {
        // 清理所有canvas
        this.processedCanvases.forEach(canvas => {
            if (canvas && canvas.getContext) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        });
        this.processedCanvases.clear();
        
        // 强制垃圾回收（如果浏览器支持）
        if (window.gc) {
            window.gc();
        }
        
        // 显示内存警告
        if (window.fileHandler) {
            window.fileHandler.showWarning('内存使用率较高，已自动清理。建议处理较小的图片或减少数量。');
        }
    }

    canProcessImage(width, height) {
        const pixels = width * height;
        return pixels <= this.maxImageSize;
    }

    getOptimalImageSize(originalWidth, originalHeight) {
        const pixels = originalWidth * originalHeight;
        
        if (pixels <= this.maxImageSize) {
            return { width: originalWidth, height: originalHeight, needsResize: false };
        }
        
        // 计算缩放比例以适应最大尺寸
        const scale = Math.sqrt(this.maxImageSize / pixels);
        const newWidth = Math.floor(originalWidth * scale);
        const newHeight = Math.floor(originalHeight * scale);
        
        return { 
            width: newWidth, 
            height: newHeight, 
            needsResize: true,
            scale: scale
        };
    }

    createOptimizedCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // 优化canvas设置
        const ctx = canvas.getContext('2d', {
            alpha: false,
            desynchronized: true,
            willReadFrequently: false
        });
        
        // 记录canvas以便后续清理
        this.processedCanvases.add(canvas);
        
        return { canvas, ctx };
    }

    resizeImageSafely(imageDataUrl, targetWidth, targetHeight) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const { canvas, ctx } = this.createOptimizedCanvas(targetWidth, targetHeight);
                    
                    // 使用高质量缩放
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                    
                    const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    resolve(resizedDataUrl);
                    
                } catch (error) {
                    reject(new Error('图片缩放失败: ' + error.message));
                }
            };
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = imageDataUrl;
        });
    }

    async processImageSafely(imageDataUrl, processor) {
        return new Promise(async (resolve, reject) => {
            try {
                // 检查内存状态
                if (!this.checkMemoryUsage()) {
                    throw new Error('内存不足，无法处理图片');
                }
                
                const img = new Image();
                img.onload = async () => {
                    try {
                        const originalWidth = img.naturalWidth;
                        const originalHeight = img.naturalHeight;
                        
                        // 获取最优处理尺寸
                        const optimalSize = this.getOptimalImageSize(originalWidth, originalHeight);
                        
                        let processImageData = imageDataUrl;
                        
                        // 如果需要缩放，先缩放
                        if (optimalSize.needsResize) {
                            console.log(`图片过大，从 ${originalWidth}×${originalHeight} 缩放到 ${optimalSize.width}×${optimalSize.height}`);
                            processImageData = await this.resizeImageSafely(imageDataUrl, optimalSize.width, optimalSize.height);
                        }
                        
                        // 执行处理
                        const result = await processor(processImageData, optimalSize);
                        
                        resolve(result);
                        
                    } catch (error) {
                        reject(error);
                    }
                };
                img.onerror = () => reject(new Error('图片加载失败'));
                img.src = imageDataUrl;
                
            } catch (error) {
                reject(error);
            }
        });
    }

    estimateMemoryUsage(width, height, channels = 4) {
        // 估算处理该尺寸图片需要的内存（字节）
        return width * height * channels * 2; // *2 for input and output
    }

    canProcessBatch(files) {
        let totalMemoryNeeded = 0;
        
        for (const file of files) {
            if (file.dimensions) {
                const optimalSize = this.getOptimalImageSize(file.dimensions.width, file.dimensions.height);
                totalMemoryNeeded += this.estimateMemoryUsage(optimalSize.width, optimalSize.height);
            }
        }
        
        // 检查是否超过设备能力
        const deviceMemoryBytes = this.getDeviceMemory() * 1024 * 1024 * 1024; // GB to bytes
        const maxUsableMemory = deviceMemoryBytes * this.memoryThreshold;
        
        return totalMemoryNeeded <= maxUsableMemory;
    }

    cleanup() {
        // 清理所有资源
        this.processedCanvases.forEach(canvas => {
            if (canvas && canvas.getContext) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.width = 0;
                canvas.height = 0;
            }
        });
        this.processedCanvases.clear();
        this.currentMemoryUsage = 0;
    }

    getMemoryInfo() {
        const info = {
            maxImageSize: this.maxImageSize,
            maxProcessingImages: this.maxProcessingImages,
            memoryThreshold: this.memoryThreshold,
            isMobile: this.isMobileDevice(),
            deviceMemory: this.getDeviceMemory()
        };
        
        if (window.performance?.memory) {
            const memory = window.performance.memory;
            info.jsHeapUsed = memory.usedJSHeapSize;
            info.jsHeapTotal = memory.totalJSHeapSize;
            info.jsHeapLimit = memory.jsHeapSizeLimit;
            info.usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        }
        
        return info;
    }
}

// 全局实例
window.memoryManager = new MemoryManager();
