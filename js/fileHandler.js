/* 文件处理模块 - 负责文件上传、验证和基础处理 */

class FileHandler {
    constructor() {
        this.supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        this.maxFileSize = Infinity; // 无限制
        this.files = [];
        this.fileData = new Map();
        
        this.initEventListeners();
    }

    initEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const uploadBtn = document.getElementById('uploadBtn');

        // 点击上传按钮
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });

        // 点击上传区域
        uploadArea.addEventListener('click', (e) => {
            if (e.target === uploadArea || e.target.closest('.upload-area')) {
                fileInput.click();
            }
        });

        // 文件选择
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });

        // 拖拽功能
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (!uploadArea.contains(e.relatedTarget)) {
                uploadArea.classList.remove('drag-over');
            }
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            this.handleFileSelection(e.dataTransfer.files);
        });
    }

    async handleFileSelection(fileList) {
        const files = Array.from(fileList);
        
        if (files.length === 0) {
            this.showError('请选择至少一个图片文件');
            return;
        }

        // 验证文件类型
        const validFiles = files.filter(file => this.validateFile(file));
        
        if (validFiles.length === 0) {
            this.showError('没有找到有效的图片文件');
            return;
        }

        if (validFiles.length !== files.length) {
            this.showWarning(`已过滤 ${files.length - validFiles.length} 个无效文件`);
        }

        // 显示加载状态
        this.showProgress(true, '正在处理文件...');

        try {
            // 处理文件
            await this.processFiles(validFiles);
            
            // 更新UI
            this.updateFileInfo();
            this.hideProgress();
            
            // 触发顺序检测
            if (window.orderDetector) {
                window.orderDetector.detectOrder(this.files);
            }
            
        } catch (error) {
            console.error('文件处理错误:', error);
            this.showError('文件处理失败，请重试');
            this.hideProgress();
        }
    }

    validateFile(file) {
        // 检查文件类型
        if (!this.supportedTypes.includes(file.type)) {
            console.warn(`不支持的文件类型: ${file.type}`);
            return false;
        }

        // 检查文件大小（虽然设置为无限制，但可以在这里添加合理限制）
        if (file.size > 100 * 1024 * 1024) { // 100MB 单个文件限制
            console.warn(`文件过大: ${file.name} (${this.formatFileSize(file.size)})`);
            return false;
        }

        return true;
    }

    async processFiles(files) {
        this.files = [];
        this.fileData.clear();

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // 更新进度
            this.updateProgress((i / files.length) * 100, `处理 ${file.name}...`);

            try {
                const fileInfo = await this.createFileInfo(file);
                this.files.push(fileInfo);
                this.fileData.set(fileInfo.id, file);
            } catch (error) {
                console.error(`处理文件失败: ${file.name}`, error);
            }
        }

        // 按文件名初步排序
        this.files.sort((a, b) => a.name.localeCompare(b.name));
    }

    async createFileInfo(file) {
        const id = this.generateFileId();
        const imageData = await this.readFileAsDataURL(file);
        const dimensions = await this.getImageDimensions(imageData);

        return {
            id,
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            imageData,
            dimensions,
            originalIndex: 0 // 将在排序时更新
        };
    }

    generateFileId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    getImageDimensions(imageSrc) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight
                });
            };
            img.onerror = reject;
            img.src = imageSrc;
        });
    }

    updateFileInfo() {
        const fileInfo = document.getElementById('fileInfo');
        const fileCount = document.getElementById('fileCount');
        const totalSize = document.getElementById('totalSize');

        if (this.files.length > 0) {
            fileCount.textContent = this.files.length;
            totalSize.textContent = this.formatFileSize(this.getTotalSize());
            fileInfo.style.display = 'block';
            fileInfo.classList.add('fade-in');
        } else {
            fileInfo.style.display = 'none';
        }
    }

    getTotalSize() {
        return this.files.reduce((total, file) => total + file.size, 0);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showProgress(show, text = '') {
        const progressSection = document.getElementById('progressSection');
        const progressText = document.getElementById('progressText');
        
        if (show) {
            progressText.textContent = text;
            progressSection.style.display = 'block';
            progressSection.classList.add('fade-in');
        } else {
            progressSection.style.display = 'none';
        }
    }

    hideProgress() {
        this.showProgress(false);
    }

    updateProgress(percent, text = '') {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        if (text) {
            progressText.textContent = text;
        }
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showWarning(message) {
        this.showMessage(message, 'warning');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type = 'info') {
        // 创建临时消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `toast-message toast-${type}`;
        messageEl.textContent = message;
        
        // 添加样式
        Object.assign(messageEl.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 25px',
            borderRadius: '10px',
            color: 'white',
            fontWeight: '600',
            zIndex: '10001',
            maxWidth: '400px',
            wordWrap: 'break-word',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
            transform: 'translateX(400px)',
            opacity: '0'
        });

        // 设置背景色
        const colors = {
            error: '#e53e3e',
            warning: '#dd6b20',
            success: '#38a169',
            info: '#667eea'
        };
        messageEl.style.background = colors[type] || colors.info;

        // 添加到页面
        document.body.appendChild(messageEl);

        // 显示动画
        setTimeout(() => {
            messageEl.style.transform = 'translateX(0)';
            messageEl.style.opacity = '1';
        }, 100);

        // 自动隐藏
        setTimeout(() => {
            messageEl.style.transform = 'translateX(400px)';
            messageEl.style.opacity = '0';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 4000);
    }

    clearFiles() {
        this.files = [];
        this.fileData.clear();
        this.updateFileInfo();
        
        // 重置文件输入
        const fileInput = document.getElementById('fileInput');
        fileInput.value = '';
        
        // 隐藏其他区域
        document.getElementById('controlsSection').style.display = 'none';
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('progressSection').style.display = 'none';
        
        this.showSuccess('已清空所有文件');
    }

    getFiles() {
        return this.files;
    }

    getFileData(fileId) {
        return this.fileData.get(fileId);
    }

    updateFilesOrder(newOrder) {
        this.files = newOrder;
        this.updateFileInfo();
    }
}

// 全局实例
window.fileHandler = new FileHandler();
