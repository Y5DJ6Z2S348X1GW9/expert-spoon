/* PDF生成模块 - 核心PDF生成功能 */

class PDFGenerator {
    constructor() {
        this.isGenerating = false;
        this.pageFormats = {
            a4: [210, 297],
            a3: [297, 420], 
            a5: [148, 210],
            letter: [216, 279],
            legal: [216, 356]
        };
        this.initEventListeners();
    }

    initEventListeners() {
        const generateBtn = document.getElementById('generateBtn');
        const clearBtn = document.getElementById('clearBtn');
        const pageSizeSelect = document.getElementById('pageSize');
        
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generatePDF());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAll());
        }
        
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.toggleCustomSize(e.target.value === 'custom');
            });
        }
    }

    toggleCustomSize(show) {
        const customSizeGroup = document.getElementById('customSizeGroup');
        if (customSizeGroup) {
            customSizeGroup.style.display = show ? 'block' : 'none';
        }
    }

    async generatePDF() {
        if (this.isGenerating) {
            return;
        }

        const files = window.imageProcessor ? window.imageProcessor.getOrderedFiles() : [];
        
        if (files.length === 0) {
            this.showError('没有图片可以生成PDF');
            return;
        }

        this.isGenerating = true;
        
        try {
            // 获取PDF设置
            const settings = this.getPDFSettings();
            
            // 显示进度
            this.showProgress(true, '正在生成PDF...');
            this.updateProgress(0, '初始化...');
            
            // 应用图片增强（如果启用）
            const enhancedFiles = await this.applyImageEnhancement(files, settings);
            
            // 创建PDF文档
            const pdf = this.createPDFDocument(settings);
            
            // 添加图片到PDF
            await this.addImagesToPDF(pdf, enhancedFiles, settings);
            
            // 生成并下载PDF
            await this.savePDF(pdf);
            
            this.showProgress(false);
            this.showSuccess('PDF生成完成！');
            
        } catch (error) {
            console.error('PDF生成错误:', error);
            this.showError('PDF生成失败: ' + error.message);
            this.showProgress(false);
        } finally {
            this.isGenerating = false;
        }
    }

    getPDFSettings() {
        const pageSize = document.getElementById('pageSize').value;
        const pageMargin = parseFloat(document.getElementById('pageMargin').value) || 10;
        const imageQuality = parseFloat(document.getElementById('imageQuality').value) || 0.8;
        const orientation = document.getElementById('orientation').value;
        const imageSharpness = parseInt(document.getElementById('imageSharpness').value) || 1;
        
        let dimensions;
        
        if (pageSize === 'custom') {
            const customWidth = parseFloat(document.getElementById('customWidth').value);
            const customHeight = parseFloat(document.getElementById('customHeight').value);
            
            if (!customWidth || !customHeight || customWidth < 50 || customHeight < 50) {
                throw new Error('请输入有效的自定义尺寸（最小50mm）');
            }
            
            dimensions = [customWidth, customHeight];
        } else {
            dimensions = this.pageFormats[pageSize];
            if (!dimensions) {
                throw new Error('无效的页面尺寸');
            }
        }

        return {
            pageSize,
            dimensions,
            pageMargin,
            imageQuality,
            orientation,
            imageSharpness
        };
    }

    async applyImageEnhancement(files, settings) {
        if (!window.imageEnhancer || settings.imageSharpness === 0) {
            this.updateProgress(10, '跳过图片增强...');
            return files;
        }
        
        this.updateProgress(5, '开始图片增强处理...');
        
        try {
            const enhancedFiles = await window.imageEnhancer.enhanceImages(files, settings.imageSharpness);
            this.updateProgress(50, '图片增强完成');
            return enhancedFiles;
        } catch (error) {
            console.error('图片增强失败:', error);
            this.showMessage('图片增强失败，使用原始图片', 'warning');
            return files;
        }
    }

    createPDFDocument(settings) {
        const { jsPDF } = window.jspdf;
        
        // 转换mm到pt (1mm = 2.834645669pt)
        const mmToPt = 2.834645669;
        const width = settings.dimensions[0] * mmToPt;
        const height = settings.dimensions[1] * mmToPt;
        
        return new jsPDF({
            orientation: width > height ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [width, height],
            compress: true
        });
    }

    async addImagesToPDF(pdf, files, settings) {
        const mmToPt = 2.834645669;
        const pageWidth = settings.dimensions[0] * mmToPt;
        const pageHeight = settings.dimensions[1] * mmToPt;
        const margin = settings.pageMargin * mmToPt;
        
        const contentWidth = pageWidth - (margin * 2);
        const contentHeight = pageHeight - (margin * 2);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // 更新进度
            const progress = (i / files.length) * 100;
            this.updateProgress(progress, `处理图片 ${i + 1}/${files.length}: ${file.name}`);
            
            try {
                // 如果不是第一页，添加新页面
                if (i > 0) {
                    pdf.addPage();
                }
                
                // 获取图片数据
                const imageData = await this.processImageForPDF(file, settings);
                
                // 计算图片尺寸和位置
                const placement = this.calculateImagePlacement(
                    file.dimensions,
                    { width: contentWidth, height: contentHeight },
                    settings.orientation
                );
                
                // 添加图片到PDF
                pdf.addImage(
                    imageData,
                    this.getImageFormat(file.type),
                    margin + placement.x,
                    margin + placement.y,
                    placement.width,
                    placement.height,
                    undefined,
                    'FAST'
                );
                
                // 页码功能已移除，按用户要求不显示页码
                
            } catch (error) {
                console.error(`处理图片失败: ${file.name}`, error);
                // 继续处理下一张图片
            }
        }
        
        this.updateProgress(100, '完成图片处理');
    }

    async processImageForPDF(file, settings) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    // 创建canvas来处理图片
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // 设置canvas尺寸
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    
                    // 绘制图片
                    ctx.drawImage(img, 0, 0);
                    
                    // 转换为指定质量的数据URL
                    const dataURL = canvas.toDataURL('image/jpeg', settings.imageQuality);
                    resolve(dataURL);
                    
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = reject;
            img.src = file.imageData;
        });
    }

    calculateImagePlacement(imageDimensions, pageDimensions, orientation) {
        const imageAspect = imageDimensions.width / imageDimensions.height;
        const pageAspect = pageDimensions.width / pageDimensions.height;
        
        let width, height;
        
        if (orientation === 'auto') {
            // 自动适应：保持宽高比，适应页面
            if (imageAspect > pageAspect) {
                // 图片更宽，以宽度为准
                width = pageDimensions.width;
                height = width / imageAspect;
            } else {
                // 图片更高，以高度为准
                height = pageDimensions.height;
                width = height * imageAspect;
            }
        } else if (orientation === 'landscape') {
            // 强制横向：以宽度为准
            width = pageDimensions.width;
            height = width / imageAspect;
            if (height > pageDimensions.height) {
                height = pageDimensions.height;
                width = height * imageAspect;
            }
        } else {
            // 强制纵向：以高度为准
            height = pageDimensions.height;
            width = height * imageAspect;
            if (width > pageDimensions.width) {
                width = pageDimensions.width;
                height = width / imageAspect;
            }
        }
        
        // 居中计算
        const x = (pageDimensions.width - width) / 2;
        const y = (pageDimensions.height - height) / 2;
        
        return { x, y, width, height };
    }

    getImageFormat(mimeType) {
        switch (mimeType) {
            case 'image/jpeg':
            case 'image/jpg':
                return 'JPEG';
            case 'image/png':
                return 'PNG';
            case 'image/gif':
                return 'GIF';
            case 'image/webp':
                return 'WEBP';
            default:
                return 'JPEG';
        }
    }

    // addPageNumber 函数已移除，按用户要求不显示页码

    async savePDF(pdf) {
        this.updateProgress(95, '保存PDF文件...');
        
        try {
            // 使用文件名管理器获取文件名
            const fileName = this.getCustomFileName();
            
            // 保存PDF
            pdf.save(fileName);
            
            this.updateProgress(100, 'PDF已下载');
            
        } catch (error) {
            throw new Error('保存PDF失败: ' + error.message);
        }
    }

    getCustomFileName() {
        // 使用文件名管理器获取用户设置的文件名
        if (window.filenameManager) {
            return window.filenameManager.getCurrentFilename();
        }
        
        // 备用方案：生成默认文件名
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '');
        return `images-to-pdf-${timestamp}.pdf`;
    }

    clearAll() {
        if (this.isGenerating) {
            this.showError('正在生成PDF，请等待完成');
            return;
        }
        
        if (window.fileHandler) {
            window.fileHandler.clearFiles();
        }
    }

    showProgress(show, text = '') {
        const progressSection = document.getElementById('progressSection');
        const progressText = document.getElementById('progressText');
        
        if (show) {
            if (progressText) progressText.textContent = text;
            if (progressSection) {
                progressSection.style.display = 'block';
                progressSection.classList.add('fade-in');
            }
        } else {
            if (progressSection) {
                progressSection.style.display = 'none';
            }
        }
    }

    updateProgress(percent, text = '') {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        }
        
        if (text && progressText) {
            progressText.textContent = text;
        }
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type = 'info') {
        if (window.fileHandler) {
            if (type === 'error') {
                window.fileHandler.showError(message);
            } else if (type === 'success') {
                window.fileHandler.showSuccess(message);
            } else {
                window.fileHandler.showMessage(message, type);
            }
        }
    }

    // 预设配置快速设置
    applyPreset(presetName) {
        const presets = {
            comic: {
                pageSize: 'a4',
                pageMargin: 5,
                imageQuality: 0.9,
                orientation: 'auto'
            },
            document: {
                pageSize: 'a4',
                pageMargin: 20,
                imageQuality: 0.8,
                orientation: 'portrait'
            },
            photo: {
                pageSize: 'a4',
                pageMargin: 10,
                imageQuality: 0.9,
                orientation: 'auto'
            },
            web: {
                pageSize: 'letter',
                pageMargin: 15,
                imageQuality: 0.7,
                orientation: 'auto'
            }
        };

        const preset = presets[presetName];
        if (preset) {
            document.getElementById('pageSize').value = preset.pageSize;
            document.getElementById('pageMargin').value = preset.pageMargin;
            document.getElementById('imageQuality').value = preset.imageQuality;
            document.getElementById('orientation').value = preset.orientation;
            
            this.toggleCustomSize(preset.pageSize === 'custom');
            this.showSuccess(`已应用${presetName}预设`);
        }
    }

    // 获取PDF预览信息
    getPDFInfo() {
        const files = window.imageProcessor ? window.imageProcessor.getOrderedFiles() : [];
        const settings = this.getPDFSettings();
        
        const mmToPt = 2.834645669;
        const pageWidth = settings.dimensions[0];
        const pageHeight = settings.dimensions[1];
        
        return {
            pageCount: files.length,
            pageSize: `${pageWidth}×${pageHeight}mm`,
            totalImages: files.length,
            estimatedSize: this.estimatePDFSize(files, settings),
            settings
        };
    }

    estimatePDFSize(files, settings) {
        // 简单估算PDF大小
        const avgImageSize = files.reduce((sum, file) => sum + file.size, 0) / files.length;
        const compressionRatio = settings.imageQuality;
        const estimatedSize = files.length * avgImageSize * compressionRatio * 0.7; // 70%压缩比例
        
        return this.formatFileSize(estimatedSize);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 全局实例
window.pdfGenerator = new PDFGenerator();
