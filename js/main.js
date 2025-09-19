/* 主逻辑文件 - 整合所有模块，应用程序入口点 */

class ImageToPDFApp {
    constructor() {
        this.version = '1.0.0';
        this.isInitialized = false;
        this.modules = {};
    }

    async init() {
        if (this.isInitialized) return;

        try {
            // 显示初始化状态
            this.showInitMessage('正在初始化应用...');

            // 检查浏览器兼容性
            this.checkBrowserCompatibility();

            // 等待DOM加载完成
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // 检查必要的库
            await this.checkRequiredLibraries();

            // 初始化模块
            this.initializeModules();

            // 设置全局错误处理
            this.setupErrorHandling();

            // 绑定全局事件
            this.bindGlobalEvents();

            // 恢复之前的状态
            this.restorePreviousState();

            // 显示欢迎信息
            this.showWelcomeMessage();

            this.isInitialized = true;
            this.hideInitMessage();

            console.log(`图片转PDF工具 v${this.version} 初始化完成`);

        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showInitError(error.message);
        }
    }

    checkBrowserCompatibility() {
        const requiredFeatures = [
            'FileReader',
            'DataTransfer', 
            'DragEvent',
            'localStorage',
            'Promise',
            'async',
            'fetch'
        ];

        const missing = requiredFeatures.filter(feature => {
            try {
                return !window[feature] && !eval(`typeof ${feature}`) === 'function';
            } catch {
                return true;
            }
        });

        if (missing.length > 0) {
            throw new Error(`浏览器不支持以下功能: ${missing.join(', ')}。请使用现代浏览器。`);
        }

        // 检查特定API
        if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
            throw new Error('浏览器不支持文件API，请升级浏览器');
        }
    }

    async checkRequiredLibraries() {
        const libraries = [
            { name: 'jsPDF', check: () => window.jspdf?.jsPDF },
            { name: 'html2canvas', check: () => window.html2canvas }
        ];

        const missing = [];
        
        for (const lib of libraries) {
            let attempts = 0;
            const maxAttempts = 50; // 最多等待5秒
            
            while (!lib.check() && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!lib.check()) {
                missing.push(lib.name);
            }
        }

        if (missing.length > 0) {
            throw new Error(`缺少必要的库: ${missing.join(', ')}。请检查网络连接。`);
        }
    }

    initializeModules() {
        // 验证模块是否存在
        const requiredModules = [
            'fileHandler',
            'orderDetector', 
            'imageProcessor',
            'memoryManager',
            'performanceMonitor',
            'imageEnhancerCore',
            'imageEnhancerMobile',
            'imageEnhancer',
            'filenameManager',
            'pdfGenerator',
            'uiController'
        ];

        requiredModules.forEach(moduleName => {
            if (!window[moduleName]) {
                throw new Error(`模块 ${moduleName} 未找到`);
            }
            this.modules[moduleName] = window[moduleName];
        });

        // 建立模块间的引用关系
        this.linkModules();

        console.log('所有模块初始化完成');
    }

    linkModules() {
        // 确保模块间能够相互调用
        const modules = this.modules;

        // 设置文件处理完成后的回调
        if (modules.fileHandler.onFilesProcessed) {
            modules.fileHandler.onFilesProcessed = (files) => {
                modules.orderDetector.detectOrder(files);
            };
        }

        // 设置顺序检测完成后的回调  
        if (modules.orderDetector.onOrderDetected) {
            modules.orderDetector.onOrderDetected = (files) => {
                modules.imageProcessor.updatePreview();
                modules.uiController.updatePDFInfo();
            };
        }
    }

    setupErrorHandling() {
        // 全局错误处理
        window.addEventListener('error', (event) => {
            console.error('全局错误:', event.error);
            this.handleGlobalError(event.error);
        });

        // Promise错误处理
        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise拒绝:', event.reason);
            this.handleGlobalError(event.reason);
        });
    }

    handleGlobalError(error) {
        // 避免错误循环
        if (this.isHandlingError) return;
        this.isHandlingError = true;

        const errorMsg = error?.message || '未知错误';
        
        // 显示用户友好的错误信息
        if (this.modules.uiController) {
            this.modules.uiController.showMessage(
                '应用遇到了错误，请刷新页面重试', 
                'error'
            );
        }

        // 清理可能的错误状态
        this.cleanupErrorState();

        setTimeout(() => {
            this.isHandlingError = false;
        }, 1000);
    }

    cleanupErrorState() {
        // 隐藏加载状态
        const loadingElements = document.querySelectorAll('.loading');
        loadingElements.forEach(el => el.classList.remove('loading'));

        // 重置进度条
        const progressSection = document.getElementById('progressSection');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
    }

    bindGlobalEvents() {
        // 应用生命周期事件
        window.addEventListener('beforeunload', () => {
            this.saveApplicationState();
        });

        // 可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveApplicationState();
            }
        });

        // 网络状态
        window.addEventListener('online', () => {
            this.modules.uiController.showMessage('网络连接已恢复', 'success');
        });

        window.addEventListener('offline', () => {
            this.modules.uiController.showMessage('网络连接已断开', 'warning');
        });
    }

    restorePreviousState() {
        try {
            const state = this.modules.uiController.loadState();
            if (state && state.settings) {
                // 恢复设置
                Object.entries(state.settings).forEach(([key, value]) => {
                    const element = document.getElementById(key);
                    if (element && value) {
                        element.value = value;
                    }
                });

                console.log('已恢复之前的设置');
            }
        } catch (error) {
            console.warn('恢复状态失败:', error);
        }
    }

    saveApplicationState() {
        try {
            if (this.modules.uiController) {
                this.modules.uiController.saveState();
            }
        } catch (error) {
            console.warn('保存状态失败:', error);
        }
    }

    showInitMessage(message) {
        // 创建初始化提示
        const initEl = document.getElementById('initMessage') || this.createInitMessage();
        initEl.textContent = message;
        initEl.style.display = 'block';
    }

    createInitMessage() {
        const initEl = document.createElement('div');
        initEl.id = 'initMessage';
        initEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(102, 126, 234, 0.95);
            color: white;
            padding: 20px 40px;
            border-radius: 15px;
            font-weight: 600;
            z-index: 10004;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
            text-align: center;
        `;
        document.body.appendChild(initEl);
        return initEl;
    }

    hideInitMessage() {
        const initEl = document.getElementById('initMessage');
        if (initEl) {
            initEl.style.opacity = '0';
            setTimeout(() => {
                if (initEl.parentNode) {
                    initEl.parentNode.removeChild(initEl);
                }
            }, 300);
        }
    }

    showInitError(message) {
        const initEl = document.getElementById('initMessage') || this.createInitMessage();
        initEl.style.background = 'rgba(245, 101, 101, 0.95)';
        initEl.innerHTML = `
            <div style="margin-bottom: 15px;">❌ 初始化失败</div>
            <div style="font-size: 0.9rem; font-weight: normal;">${message}</div>
            <button onclick="location.reload()" style="
                margin-top: 15px;
                padding: 10px 20px;
                background: white;
                color: #e53e3e;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
            ">重新加载</button>
        `;
    }

    showWelcomeMessage() {
        // 欢迎信息
        if (this.modules.uiController) {
            setTimeout(() => {
                this.modules.uiController.showMessage(
                    '欢迎使用图片转PDF工具！请选择图片开始制作', 
                    'info'
                );
            }, 500);
        }
    }

    // 提供给外部的API
    getFiles() {
        return this.modules.fileHandler?.getFiles() || [];
    }

    addFiles(files) {
        if (this.modules.fileHandler) {
            this.modules.fileHandler.handleFileSelection(files);
        }
    }

    generatePDF() {
        if (this.modules.pdfGenerator) {
            this.modules.pdfGenerator.generatePDF();
        }
    }

    clearAll() {
        if (this.modules.fileHandler) {
            this.modules.fileHandler.clearFiles();
        }
    }

    // 调试工具
    debug() {
        return {
            version: this.version,
            isInitialized: this.isInitialized,
            modules: Object.keys(this.modules),
            files: this.getFiles(),
            state: this.modules.uiController?.getCurrentSettings()
        };
    }

    // 性能监控
    getPerformanceInfo() {
        if (window.performance) {
            return {
                loadTime: performance.now(),
                navigation: performance.getEntriesByType('navigation')[0],
                memory: performance.memory
            };
        }
        return null;
    }
}

// 创建全局应用实例
window.imageToPDFApp = new ImageToPDFApp();

// 自动初始化
(async () => {
    try {
        await window.imageToPDFApp.init();
    } catch (error) {
        console.error('应用启动失败:', error);
    }
})();

// 导出到全局作用域供调试使用
window.debug = () => window.imageToPDFApp.debug();

// 添加开发者工具
if (process?.env?.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
    console.log('%c图片转PDF工具 开发模式', 'color: #667eea; font-size: 14px; font-weight: bold;');
    console.log('可用的调试命令:');
    console.log('- debug(): 显示调试信息');
    console.log('- imageToPDFApp: 主应用实例');
    
    // 性能监控
    const perf = window.imageToPDFApp.getPerformanceInfo();
    if (perf) {
        console.log('性能信息:', perf);
    }
}
