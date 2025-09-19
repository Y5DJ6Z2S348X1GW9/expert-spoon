/* 图片增强主控制器 - 内存安全，移动端优化的图片增强系统 */

class ImageEnhancer {
    constructor() {
        this.enhancementLevels = {
            0: { name: '关闭', strength: 0, description: '保持原始图片' },
            1: { name: '轻度增强', strength: 0.3, description: '轻微提升清晰度，适合一般图片' },
            2: { name: '中度增强', strength: 0.6, description: '明显提升清晰度，适合模糊图片' },
            3: { name: '强度增强', strength: 1.0, description: '最大程度增强，适合严重模糊图片' }
        };
        
        this.isProcessing = false;
        this.currentProgress = 0;
        this.isMobile = window.imageEnhancerMobile?.isMobile || false;
        
        this.initEventListeners();
        this.checkDependencies();
    }

    checkDependencies() {
        const required = ['memoryManager', 'performanceMonitor', 'imageEnhancerCore', 'imageEnhancerMobile'];
        const missing = required.filter(dep => !window[dep]);
        
        if (missing.length > 0) {
            console.error('缺少依赖模块:', missing);
            if (window.fileHandler) {
                window.fileHandler.showError('图片增强模块初始化失败，缺少必要组件');
            }
        }
    }

    initEventListeners() {
        const sharpnessSelect = document.getElementById('imageSharpness');
        if (sharpnessSelect) {
            sharpnessSelect.addEventListener('change', (e) => {
                this.updateSharpnessPreview(e.target.value);
            });
        }

        // 监听设备变化
        window.addEventListener('resize', () => {
            this.handleDeviceChange();
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleDeviceChange(), 100);
        });
    }

    handleDeviceChange() {
        // 设备方向或尺寸变化时重新评估能力
        if (window.imageEnhancerMobile) {
            window.imageEnhancerMobile.deviceCapability = window.imageEnhancerMobile.assessDeviceCapability();
        }
    }

    updateSharpnessPreview(level) {
        const enhancement = this.enhancementLevels[level];
        
        // 更新描述文本
        this.showSharpnessDescription(enhancement);
        
        // 更新视觉指示器
        this.updateSharpnessIndicator(level);
        
        // 显示设备建议
        this.showDeviceRecommendations(level);
        
        // 如果有图片，显示对比预览
        if (window.imageProcessor && window.imageProcessor.getOrderedFiles().length > 0) {
            this.showQualityCompare(level);
        }
    }

    showSharpnessDescription(enhancement) {
        let descArea = document.querySelector('.sharpness-description');
        const sharpnessControl = document.getElementById('imageSharpness').closest('.control-group');
        
        if (!descArea) {
            descArea = document.createElement('div');
            descArea.className = 'sharpness-description';
            sharpnessControl.appendChild(descArea);
        }
        
        descArea.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">${enhancement.name}</div>
            <div>${enhancement.description}</div>
        `;
    }

    updateSharpnessIndicator(level) {
        let indicator = document.querySelector('.sharpness-level');
        const descArea = document.querySelector('.sharpness-description');
        
        if (!indicator && descArea) {
            indicator = document.createElement('div');
            indicator.className = `sharpness-level sharpness-level-${level}`;
            indicator.innerHTML = `
                <div class="sharpness-indicator"></div>
                <div class="sharpness-indicator"></div>
                <div class="sharpness-indicator"></div>
            `;
            descArea.appendChild(indicator);
        } else if (indicator) {
            indicator.className = `sharpness-level sharpness-level-${level}`;
        }
    }

    showDeviceRecommendations(level) {
        if (!this.isMobile) return;
        
        const recommendations = window.imageEnhancerMobile.getMobileRecommendations();
        const deviceInfo = window.imageEnhancerMobile.getDeviceInfo();
        
        // 检查选择的级别是否适合当前设备
        if (deviceInfo.capability.level === 'low' && level > 1) {
            const warning = {
                type: 'level_warning',
                message: '当前设备性能有限',
                suggestion: `建议使用轻度增强或关闭，当前选择的${this.enhancementLevels[level].name}可能导致处理缓慢`
            };
            recommendations.push(warning);
        }
        
        if (recommendations.length > 0) {
            this.displayRecommendations(recommendations);
        }
    }

    displayRecommendations(recommendations) {
        let recArea = document.querySelector('.device-recommendations');
        const sharpnessControl = document.getElementById('imageSharpness').closest('.control-group');
        
        if (!recArea) {
            recArea = document.createElement('div');
            recArea.className = 'device-recommendations';
            recArea.style.cssText = `
                margin-top: 15px;
                padding: 15px;
                background: rgba(237, 137, 54, 0.1);
                border: 1px solid rgba(237, 137, 54, 0.3);
                border-radius: 8px;
                font-size: 0.9rem;
            `;
            sharpnessControl.appendChild(recArea);
        }
        
        const html = recommendations.map(rec => `
            <div style="margin-bottom: 10px;">
                <strong style="color: #dd6b20;">💡 ${rec.message}</strong><br>
                <span style="color: #718096;">${rec.suggestion}</span>
            </div>
        `).join('');
        
        recArea.innerHTML = html;
    }

    async showQualityCompare(level) {
        if (this.isProcessing) return;
        
        const files = window.imageProcessor.getOrderedFiles();
        if (files.length === 0) return;

        const sampleFile = files[0];
        
        try {
            this.isProcessing = true;
            this.showProcessingStatus('正在生成预览对比...');
            
            // 使用核心算法生成预览
            const enhancedImageData = await window.imageEnhancerCore.createPreviewEnhancement(
                sampleFile.imageData, 
                level
            );
            
            this.displayQualityCompare(sampleFile.imageData, enhancedImageData, level);
            this.hideProcessingStatus();
            
        } catch (error) {
            console.error('预览生成失败:', error);
            this.showProcessingStatus('预览生成失败', 'error');
            setTimeout(() => this.hideProcessingStatus(), 3000);
        } finally {
            this.isProcessing = false;
        }
    }

    displayQualityCompare(originalData, enhancedData, level) {
        let compareArea = document.querySelector('.quality-compare');
        const controlsSection = document.getElementById('controlsSection');
        
        if (!compareArea) {
            compareArea = document.createElement('div');
            compareArea.className = 'quality-compare';
            controlsSection.appendChild(compareArea);
        }
        
        const enhancement = this.enhancementLevels[level];
        
        compareArea.innerHTML = `
            <h4 style="color: #667eea; margin-bottom: 15px; text-align: center;">
                📊 清晰度增强预览 - ${enhancement.name}
            </h4>
            <div class="compare-images">
                <div class="compare-item">
                    <h6>原始图片</h6>
                    <img src="${originalData}" alt="原始图片" style="max-width: 100%; height: auto;">
                </div>
                <div class="compare-item">
                    <h6>增强后 (${enhancement.name})</h6>
                    <img src="${enhancedData}" alt="增强后图片" style="max-width: 100%; height: auto;">
                </div>
            </div>
            <div style="text-align: center; margin-top: 15px; color: #718096; font-size: 0.9rem;">
                ${enhancement.description}
            </div>
        `;
        
        compareArea.classList.add('active');
    }

    showProcessingStatus(message, type = 'processing') {
        let statusEl = document.querySelector('.processing-status');
        const controlsSection = document.getElementById('controlsSection');
        
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.className = 'processing-status';
            controlsSection.appendChild(statusEl);
        }
        
        statusEl.className = `processing-status active enhancement-${type}`;
        
        let icon = '⚙️';
        if (type === 'success') icon = '✅';
        else if (type === 'error') icon = '❌';
        else if (type === 'warning') icon = '⚠️';
        
        statusEl.innerHTML = `
            <div class="status-icon">${icon}</div>
            <div class="status-text">${message}</div>
            <div class="status-detail">请稍候...</div>
        `;
    }

    hideProcessingStatus() {
        const statusEl = document.querySelector('.processing-status');
        if (statusEl) {
            statusEl.classList.remove('active');
        }
    }

    // 主要的批量增强接口
    async enhanceImages(files, level) {
        if (level === 0) return files;
        
        try {
            this.isProcessing = true;
            
            // 开始性能监控
            const taskName = `enhance_${files.length}_images_level_${level}`;
            window.performanceMonitor.startMonitoring(taskName);
            
            // 检查设备能力和内存
            const canProcess = this.validateProcessingCapability(files, level);
            if (!canProcess.allowed) {
                throw new Error(canProcess.reason);
            }
            
            // 选择合适的处理方法
            let enhancedFiles;
            
            if (this.isMobile) {
                // 移动端优化处理
                enhancedFiles = await window.imageEnhancerMobile.processBatchMobile(
                    files, 
                    level, 
                    this.createProgressCallback()
                );
            } else {
                // 桌面端处理
                enhancedFiles = await window.imageEnhancerCore.enhanceImagesBatch(
                    files, 
                    level, 
                    this.createProgressCallback()
                );
            }
            
            window.performanceMonitor.stopMonitoring();
            
            // 显示处理统计
            this.showProcessingStats(files.length, enhancedFiles.length, level);
            
            return enhancedFiles;
            
        } catch (error) {
            window.performanceMonitor.stopMonitoring();
            console.error('批量图片增强失败:', error);
            throw error;
        } finally {
            this.isProcessing = false;
            window.memoryManager.cleanup();
        }
    }

    validateProcessingCapability(files, level) {
        // 检查内存管理器
        if (!window.memoryManager.canProcessBatch(files)) {
            return {
                allowed: false,
                reason: '图片总大小超过设备处理能力，请减少图片数量或选择较小的图片'
            };
        }
        
        // 检查性能监控建议
        const shouldPause = window.performanceMonitor.shouldPauseProcessing();
        if (shouldPause.should) {
            return {
                allowed: false,
                reason: `当前设备状态不适合处理: ${shouldPause.reason}`
            };
        }
        
        // 移动端特殊检查
        if (this.isMobile) {
            const deviceInfo = window.imageEnhancerMobile.getDeviceInfo();
            
            if (deviceInfo.capability.level === 'low' && files.length > 5) {
                return {
                    allowed: false,
                    reason: '低端设备建议一次处理不超过5张图片'
                };
            }
            
            if (deviceInfo.capability.level === 'low' && level > 1) {
                if (window.fileHandler) {
                    window.fileHandler.showWarning('低端设备使用高级增强可能导致处理缓慢或失败');
                }
            }
        }
        
        return { allowed: true };
    }

    createProgressCallback() {
        return (current, total, filename) => {
            this.currentProgress = (current / total) * 100;
            
            if (window.pdfGenerator) {
                window.pdfGenerator.updateProgress(
                    this.currentProgress * 0.5, // 图片增强占总进度的50%
                    `增强图片 ${current + 1}/${total}: ${filename}`
                );
            }
        };
    }

    showProcessingStats(totalFiles, processedFiles, level) {
        const enhancement = this.enhancementLevels[level];
        const successRate = (processedFiles / totalFiles * 100).toFixed(1);
        
        let message = `图片增强完成！成功处理 ${processedFiles}/${totalFiles} 张图片 (${successRate}%)`;
        
        if (processedFiles < totalFiles) {
            message += `，${totalFiles - processedFiles} 张图片使用原始版本`;
        }
        
        if (window.fileHandler) {
            window.fileHandler.showSuccess(message);
        }
        
        // 记录统计信息
        console.log('图片增强统计:', {
            级别: enhancement.name,
            总数: totalFiles,
            成功: processedFiles,
            失败: totalFiles - processedFiles,
            成功率: successRate + '%'
        });
    }

    // 获取当前设置
    getCurrentSettings() {
        const sharpnessSelect = document.getElementById('imageSharpness');
        const level = sharpnessSelect ? parseInt(sharpnessSelect.value) : 1;
        
        return {
            level,
            enhancement: this.enhancementLevels[level],
            isMobile: this.isMobile,
            deviceCapability: window.imageEnhancerMobile?.getDeviceInfo()
        };
    }

    // 重置预览
    resetPreview() {
        const compareArea = document.querySelector('.quality-compare');
        if (compareArea) {
            compareArea.classList.remove('active');
        }
        
        const recommendations = document.querySelector('.device-recommendations');
        if (recommendations) {
            recommendations.remove();
        }
        
        this.hideProcessingStatus();
    }

    // 获取增强统计信息
    getEnhancementStats(files) {
        const settings = this.getCurrentSettings();
        
        if (settings.level === 0) {
            return {
                enhanced: false,
                level: 0,
                description: '未启用增强'
            };
        }
        
        const deviceOptimization = window.performanceMonitor.optimizeForDevice();
        
        return {
            enhanced: true,
            level: settings.level,
            name: settings.enhancement.name,
            description: settings.enhancement.description,
            affectedFiles: files.length,
            estimatedProcessingTime: files.length * (this.isMobile ? 1.5 : 0.5),
            deviceOptimization: deviceOptimization,
            memoryInfo: window.memoryManager.getMemoryInfo(),
            recommendations: window.imageEnhancerMobile?.getMobileRecommendations() || []
        };
    }

    // 获取完整的增强报告
    getEnhancementReport() {
        return {
            currentSettings: this.getCurrentSettings(),
            performanceReport: window.performanceMonitor.getPerformanceReport(),
            memoryInfo: window.memoryManager.getMemoryInfo(),
            deviceInfo: window.imageEnhancerMobile?.getDeviceInfo(),
            isProcessing: this.isProcessing,
            currentProgress: this.currentProgress
        };
    }

    // 应用推荐设置
    applyRecommendedSettings() {
        const deviceOptimization = window.performanceMonitor.optimizeForDevice();
        const sharpnessSelect = document.getElementById('imageSharpness');
        
        if (sharpnessSelect) {
            sharpnessSelect.value = deviceOptimization.recommendedEnhancementLevel;
            this.updateSharpnessPreview(deviceOptimization.recommendedEnhancementLevel);
        }
        
        if (window.fileHandler) {
            window.fileHandler.showSuccess(`已应用设备推荐设置: ${this.enhancementLevels[deviceOptimization.recommendedEnhancementLevel].name}`);
        }
    }

    // 清理资源
    cleanup() {
        this.isProcessing = false;
        this.currentProgress = 0;
        this.resetPreview();
        
        if (window.memoryManager) {
            window.memoryManager.cleanup();
        }
    }
}

// 全局实例
window.imageEnhancer = new ImageEnhancer();