/* 性能监控模块 - 监控处理性能，防止浏览器卡顿或崩溃 */

class PerformanceMonitor {
    constructor() {
        this.processingTimes = [];
        this.errorCounts = {};
        this.warningThresholds = {
            processingTime: 10000, // 10秒
            memoryUsage: 0.8, // 80%
            consecutiveErrors: 3
        };
        
        this.isMonitoring = false;
        this.performanceData = {};
        
        this.initPerformanceMonitoring();
    }

    initPerformanceMonitoring() {
        // 监控帧率
        this.monitorFrameRate();
        
        // 监控长任务
        this.monitorLongTasks();
        
        // 监控错误
        this.monitorErrors();
    }

    monitorFrameRate() {
        let lastTime = performance.now();
        let frameCount = 0;
        let fps = 60;

        const measureFPS = (currentTime) => {
            frameCount++;
            
            if (currentTime - lastTime >= 1000) {
                fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                frameCount = 0;
                lastTime = currentTime;
                
                this.performanceData.fps = fps;
                
                // 如果FPS过低，可能是性能问题
                if (fps < 20 && this.isMonitoring) {
                    this.handlePerformanceIssue('low_fps', { fps });
                }
            }
            
            if (this.isMonitoring) {
                requestAnimationFrame(measureFPS);
            }
        };

        requestAnimationFrame(measureFPS);
    }

    monitorLongTasks() {
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) { // 长任务阈值50ms
                            this.handlePerformanceIssue('long_task', {
                                duration: entry.duration,
                                startTime: entry.startTime
                            });
                        }
                    }
                });
                
                observer.observe({ entryTypes: ['longtask'] });
            } catch (error) {
                console.log('长任务监控不支持');
            }
        }
    }

    monitorErrors() {
        window.addEventListener('error', (event) => {
            this.recordError('javascript', event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.recordError('promise', event.reason);
        });
    }

    startMonitoring(taskName) {
        this.isMonitoring = true;
        this.currentTask = taskName;
        this.taskStartTime = performance.now();
        
        console.log(`开始监控任务: ${taskName}`);
    }

    stopMonitoring() {
        if (this.isMonitoring && this.currentTask) {
            const duration = performance.now() - this.taskStartTime;
            this.processingTimes.push({
                task: this.currentTask,
                duration: duration,
                timestamp: Date.now()
            });
            
            console.log(`任务 ${this.currentTask} 完成，用时: ${duration.toFixed(2)}ms`);
            
            // 检查是否超过阈值
            if (duration > this.warningThresholds.processingTime) {
                this.handlePerformanceIssue('slow_processing', {
                    task: this.currentTask,
                    duration: duration
                });
            }
        }
        
        this.isMonitoring = false;
        this.currentTask = null;
        this.taskStartTime = null;
    }

    recordError(type, error) {
        const errorKey = `${type}_${error?.message || 'unknown'}`;
        this.errorCounts[errorKey] = (this.errorCounts[errorKey] || 0) + 1;
        
        if (this.errorCounts[errorKey] >= this.warningThresholds.consecutiveErrors) {
            this.handlePerformanceIssue('frequent_errors', {
                type: type,
                error: error,
                count: this.errorCounts[errorKey]
            });
        }
    }

    handlePerformanceIssue(issueType, data) {
        console.warn(`性能问题检测: ${issueType}`, data);
        
        let message = '';
        let suggestion = '';
        
        switch (issueType) {
            case 'low_fps':
                message = `检测到帧率过低 (${data.fps} FPS)`;
                suggestion = '建议减少图片数量或降低清晰度增强级别';
                break;
                
            case 'long_task':
                message = `检测到长时间阻塞任务 (${data.duration.toFixed(0)}ms)`;
                suggestion = '正在优化处理，请稍候...';
                break;
                
            case 'slow_processing':
                message = `任务处理时间过长 (${(data.duration / 1000).toFixed(1)}秒)`;
                suggestion = '建议使用较低的清晰度增强级别或减少图片数量';
                break;
                
            case 'frequent_errors':
                message = `频繁出现错误 (${data.count}次)`;
                suggestion = '建议刷新页面或重新选择图片';
                break;
                
            case 'memory_warning':
                message = '内存使用率过高';
                suggestion = '建议处理较小的图片或减少数量';
                break;
        }
        
        // 显示警告给用户
        if (window.fileHandler) {
            window.fileHandler.showWarning(message + ' - ' + suggestion);
        }
        
        // 记录性能数据
        this.performanceData.lastIssue = {
            type: issueType,
            timestamp: Date.now(),
            data: data
        };
    }

    async measureTaskPerformance(taskName, taskFunction) {
        this.startMonitoring(taskName);
        
        try {
            const result = await taskFunction();
            this.stopMonitoring();
            return result;
        } catch (error) {
            this.stopMonitoring();
            this.recordError('task', error);
            throw error;
        }
    }

    getAverageProcessingTime() {
        if (this.processingTimes.length === 0) return 0;
        
        const total = this.processingTimes.reduce((sum, item) => sum + item.duration, 0);
        return total / this.processingTimes.length;
    }

    getPerformanceRecommendations() {
        const recommendations = [];
        const avgTime = this.getAverageProcessingTime();
        const memoryInfo = window.memoryManager?.getMemoryInfo();
        
        // 基于处理时间的建议
        if (avgTime > 5000) {
            recommendations.push({
                type: 'processing_time',
                severity: 'warning',
                message: '图片处理时间较长',
                suggestion: '建议降低清晰度增强级别或减少图片数量'
            });
        }
        
        // 基于内存使用的建议
        if (memoryInfo?.usageRatio > 0.7) {
            recommendations.push({
                type: 'memory_usage',
                severity: 'warning',
                message: '内存使用率较高',
                suggestion: '建议处理较小的图片或分批处理'
            });
        }
        
        // 基于设备类型的建议
        if (memoryInfo?.isMobile) {
            recommendations.push({
                type: 'mobile_optimization',
                severity: 'info',
                message: '移动设备性能优化',
                suggestion: '推荐使用轻度或中度增强，避免处理过大图片'
            });
        }
        
        // 基于错误频率的建议
        const errorCount = Object.values(this.errorCounts).reduce((sum, count) => sum + count, 0);
        if (errorCount > 2) {
            recommendations.push({
                type: 'error_frequency',
                severity: 'error',
                message: '处理过程中出现多次错误',
                suggestion: '建议刷新页面重试，或检查图片格式是否正确'
            });
        }
        
        return recommendations;
    }

    shouldPauseProcessing() {
        // 检查是否应该暂停处理以保护用户设备
        const memoryInfo = window.memoryManager?.getMemoryInfo();
        
        // 内存使用率过高
        if (memoryInfo?.usageRatio > 0.9) {
            return { should: true, reason: 'memory_critical' };
        }
        
        // 帧率过低
        if (this.performanceData.fps < 10) {
            return { should: true, reason: 'fps_critical' };
        }
        
        // 连续错误过多
        const recentErrors = Object.values(this.errorCounts).reduce((sum, count) => sum + count, 0);
        if (recentErrors > 5) {
            return { should: true, reason: 'errors_critical' };
        }
        
        return { should: false };
    }

    optimizeForDevice() {
        const memoryInfo = window.memoryManager?.getMemoryInfo();
        
        const optimization = {
            maxConcurrentProcessing: 1,
            recommendedEnhancementLevel: 1,
            shouldResizeImages: false,
            batchSize: 1
        };
        
        if (memoryInfo?.isMobile) {
            if (memoryInfo.deviceMemory <= 2) {
                // 低端移动设备
                optimization.maxConcurrentProcessing = 1;
                optimization.recommendedEnhancementLevel = 0;
                optimization.shouldResizeImages = true;
                optimization.batchSize = 1;
            } else if (memoryInfo.deviceMemory <= 4) {
                // 中端移动设备
                optimization.maxConcurrentProcessing = 1;
                optimization.recommendedEnhancementLevel = 1;
                optimization.shouldResizeImages = false;
                optimization.batchSize = 2;
            } else {
                // 高端移动设备
                optimization.maxConcurrentProcessing = 2;
                optimization.recommendedEnhancementLevel = 2;
                optimization.shouldResizeImages = false;
                optimization.batchSize = 3;
            }
        } else {
            // 桌面设备
            if (memoryInfo?.deviceMemory <= 4) {
                optimization.maxConcurrentProcessing = 2;
                optimization.recommendedEnhancementLevel = 2;
                optimization.batchSize = 3;
            } else {
                optimization.maxConcurrentProcessing = 3;
                optimization.recommendedEnhancementLevel = 3;
                optimization.batchSize = 5;
            }
        }
        
        return optimization;
    }

    getPerformanceReport() {
        return {
            processingTimes: this.processingTimes.slice(-10), // 最近10次
            averageTime: this.getAverageProcessingTime(),
            errorCounts: { ...this.errorCounts },
            performanceData: { ...this.performanceData },
            memoryInfo: window.memoryManager?.getMemoryInfo(),
            recommendations: this.getPerformanceRecommendations(),
            deviceOptimization: this.optimizeForDevice()
        };
    }

    reset() {
        this.processingTimes = [];
        this.errorCounts = {};
        this.performanceData = {};
        this.isMonitoring = false;
    }
}

// 全局实例
window.performanceMonitor = new PerformanceMonitor();
