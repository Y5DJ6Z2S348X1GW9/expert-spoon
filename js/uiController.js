/* UI控制模块 - 负责界面交互和状态管理 */

class UIController {
    constructor() {
        this.currentStep = 'upload'; // upload, configure, preview, generate
        this.isAdvancedMode = false;
        this.presets = {
            comic: { name: '漫画模式', icon: '📚' },
            document: { name: '文档模式', icon: '📄' },
            photo: { name: '照片模式', icon: '📷' },
            web: { name: '网页模式', icon: '🌐' }
        };
        this.initEventListeners();
        this.initPresets();
    }

    initEventListeners() {
        // 窗口调整大小
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // 拖拽全局处理
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.target.closest('.upload-area')) return; // 让上传区域处理
            
            // 阻止其他地方的拖拽
            this.showMessage('请将文件拖拽到上传区域', 'warning');
        });

        // 高级设置切换
        this.initAdvancedSettings();
        
        // 预设按钮
        this.initPresetButtons();
        
        // 表单验证
        this.initFormValidation();
    }

    initAdvancedSettings() {
        // 检查是否存在高级设置区域
        const advancedToggle = document.querySelector('.advanced-toggle');
        const advancedContent = document.querySelector('.advanced-content');
        
        if (advancedToggle && advancedContent) {
            advancedToggle.addEventListener('click', () => {
                this.isAdvancedMode = !this.isAdvancedMode;
                
                if (this.isAdvancedMode) {
                    advancedContent.classList.add('show');
                    advancedToggle.classList.remove('collapsed');
                } else {
                    advancedContent.classList.remove('show');
                    advancedToggle.classList.add('collapsed');
                }
            });
        }
    }

    initPresets() {
        const controlsSection = document.getElementById('controlsSection');
        if (!controlsSection) return;

        // 创建预设按钮区域
        const presetArea = document.createElement('div');
        presetArea.className = 'preset-area';
        presetArea.innerHTML = `
            <div class="hint-box">
                <h4>快速设置</h4>
                <p>选择预设模式快速配置PDF参数</p>
            </div>
            <div class="preset-buttons" id="presetButtons"></div>
        `;

        // 插入到控制面板开始
        const firstChild = controlsSection.firstElementChild;
        controlsSection.insertBefore(presetArea, firstChild);
    }

    initPresetButtons() {
        const presetButtons = document.getElementById('presetButtons');
        if (!presetButtons) return;

        Object.entries(this.presets).forEach(([key, preset]) => {
            const button = document.createElement('button');
            button.className = 'preset-btn';
            button.innerHTML = `${preset.icon} ${preset.name}`;
            button.addEventListener('click', () => {
                this.applyPreset(key);
                this.updatePresetButtons(key);
            });
            presetButtons.appendChild(button);
        });
    }

    updatePresetButtons(activePreset) {
        const buttons = document.querySelectorAll('.preset-btn');
        buttons.forEach((btn, index) => {
            const presetKey = Object.keys(this.presets)[index];
            if (presetKey === activePreset) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    applyPreset(presetName) {
        if (window.pdfGenerator) {
            window.pdfGenerator.applyPreset(presetName);
        }
        
        this.showMessage(`已应用${this.presets[presetName].name}`, 'success');
        
        // 更新PDF信息预览
        this.updatePDFInfo();
    }

    initFormValidation() {
        // 实时验证表单输入
        const inputs = document.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.validateInput(input);
            });
            
            input.addEventListener('blur', () => {
                this.validateInput(input);
            });
        });

        // 页面尺寸切换验证
        const pageSizeSelect = document.getElementById('pageSize');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', () => {
                this.updatePDFInfo();
            });
        }
    }

    validateInput(input) {
        const value = parseFloat(input.value);
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        
        // 移除之前的错误状态
        input.classList.remove('error');
        this.removeFieldError(input);
        
        if (isNaN(value) || (min && value < min) || (max && value > max)) {
            input.classList.add('error');
            this.showFieldError(input, `请输入 ${min || 0} 到 ${max || '无限制'} 之间的数值`);
            return false;
        }
        
        return true;
    }

    showFieldError(input, message) {
        const errorEl = document.createElement('div');
        errorEl.className = 'field-error';
        errorEl.textContent = message;
        errorEl.style.cssText = `
            color: #e53e3e;
            font-size: 0.8rem;
            margin-top: 5px;
            display: block;
        `;
        
        input.parentNode.appendChild(errorEl);
    }

    removeFieldError(input) {
        const errorEl = input.parentNode.querySelector('.field-error');
        if (errorEl) {
            errorEl.remove();
        }
    }

    updatePDFInfo() {
        if (!window.pdfGenerator) return;
        
        try {
            const info = window.pdfGenerator.getPDFInfo();
            this.showPDFPreview(info);
        } catch (error) {
            // 配置无效时不显示预览
            this.hidePDFPreview();
        }
    }

    showPDFPreview(info) {
        let previewEl = document.querySelector('.pdf-preview');
        
        if (!previewEl) {
            previewEl = document.createElement('div');
            previewEl.className = 'pdf-preview';
            previewEl.style.cssText = `
                background: rgba(102, 126, 234, 0.1);
                border: 1px solid rgba(102, 126, 234, 0.2);
                border-radius: 12px;
                padding: 20px;
                margin-top: 20px;
            `;
            
            const controlsSection = document.getElementById('controlsSection');
            const actionButtons = controlsSection.querySelector('.action-buttons');
            controlsSection.insertBefore(previewEl, actionButtons);
        }
        
        previewEl.innerHTML = `
            <h4 style="color: #667eea; margin-bottom: 15px; font-size: 1rem;">📄 PDF预览</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; font-size: 0.9rem;">
                <div>
                    <strong>页面数:</strong><br>
                    <span style="color: #667eea;">${info.pageCount} 页</span>
                </div>
                <div>
                    <strong>页面尺寸:</strong><br>
                    <span style="color: #667eea;">${info.pageSize}</span>
                </div>
                <div>
                    <strong>图片数量:</strong><br>
                    <span style="color: #667eea;">${info.totalImages} 张</span>
                </div>
                <div>
                    <strong>预估大小:</strong><br>
                    <span style="color: #667eea;">${info.estimatedSize}</span>
                </div>
            </div>
        `;
        
        previewEl.classList.add('fade-in');
    }

    hidePDFPreview() {
        const previewEl = document.querySelector('.pdf-preview');
        if (previewEl) {
            previewEl.style.display = 'none';
        }
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + Enter: 生成PDF
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            const generateBtn = document.getElementById('generateBtn');
            if (generateBtn && !generateBtn.disabled) {
                generateBtn.click();
            }
        }
        
        // ESC: 关闭模态框
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal[style*="flex"], .image-modal');
            modals.forEach(modal => {
                if (modal.style.display !== 'none') {
                    modal.style.display = 'none';
                }
            });
        }
        
        // Ctrl/Cmd + A: 全选图片
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            const previewSection = document.getElementById('previewSection');
            if (previewSection && previewSection.style.display !== 'none') {
                e.preventDefault();
                if (window.imageProcessor) {
                    window.imageProcessor.selectAll();
                }
            }
        }
        
        // Delete: 删除选中的图片
        if (e.key === 'Delete') {
            const selectedItems = document.querySelectorAll('.preview-item.selected');
            if (selectedItems.length > 0) {
                if (window.imageProcessor) {
                    window.imageProcessor.deleteSelected();
                }
            }
        }
    }

    handleResize() {
        // 响应式处理
        const isMobile = window.innerWidth <= 768;
        
        // 调整预览网格
        const previewGrid = document.getElementById('previewGrid');
        if (previewGrid) {
            if (isMobile) {
                previewGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(120px, 1fr))';
            } else {
                previewGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
            }
        }
        
        // 调整控制面板
        const controlsGrid = document.querySelector('.controls-grid');
        if (controlsGrid) {
            if (isMobile) {
                controlsGrid.style.gridTemplateColumns = '1fr';
            } else {
                controlsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
            }
        }
    }

    showMessage(message, type = 'info') {
        if (window.fileHandler) {
            window.fileHandler.showMessage(message, type);
        }
    }

    // 步骤管理
    setStep(step) {
        this.currentStep = step;
        this.updateStepIndicator();
    }

    updateStepIndicator() {
        // 如果需要可以在HTML中添加步骤指示器
        const steps = {
            upload: '上传图片',
            configure: '配置设置',
            preview: '预览排序',
            generate: '生成PDF'
        };
        
        // 更新页面标题
        document.title = `${steps[this.currentStep]} - 图片转PDF工具`;
    }

    // 加载状态管理
    setLoading(element, loading) {
        if (loading) {
            element.classList.add('loading');
            element.disabled = true;
        } else {
            element.classList.remove('loading');
            element.disabled = false;
        }
    }

    // 批量操作UI
    showBatchOperations(show) {
        const batchOps = document.querySelector('.batch-operations');
        if (batchOps) {
            if (show) {
                batchOps.classList.add('active');
            } else {
                batchOps.classList.remove('active');
            }
        }
    }

    // 工具提示
    showTooltip(element, message, duration = 3000) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = message;
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.8rem;
            z-index: 10003;
            pointer-events: none;
            white-space: nowrap;
        `;
        
        document.body.appendChild(tooltip);
        
        // 定位
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width - tooltip.offsetWidth) / 2 + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
        
        // 自动移除
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, duration);
    }

    // 确认对话框
    showConfirmDialog(message, onConfirm, onCancel) {
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.style.display = 'flex';
        
        dialog.innerHTML = `
            <div class="modal-content">
                <h3>确认操作</h3>
                <div class="modal-message">${message}</div>
                <div class="modal-buttons">
                    <button class="btn btn-secondary" id="confirmCancel">取消</button>
                    <button class="btn btn-primary" id="confirmOk">确认</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        const cancelBtn = dialog.querySelector('#confirmCancel');
        const okBtn = dialog.querySelector('#confirmOk');
        
        const cleanup = () => {
            document.body.removeChild(dialog);
        };
        
        cancelBtn.onclick = () => {
            cleanup();
            if (onCancel) onCancel();
        };
        
        okBtn.onclick = () => {
            cleanup();
            if (onConfirm) onConfirm();
        };
        
        // ESC键取消
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleEsc);
                if (onCancel) onCancel();
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    // 状态持久化
    saveState() {
        const state = {
            currentStep: this.currentStep,
            isAdvancedMode: this.isAdvancedMode,
            settings: this.getCurrentSettings()
        };
        
        try {
            localStorage.setItem('imageToPdfState', JSON.stringify(state));
        } catch (error) {
            console.warn('无法保存状态:', error);
        }
    }

    loadState() {
        try {
            const saved = localStorage.getItem('imageToPdfState');
            if (saved) {
                const state = JSON.parse(saved);
                this.currentStep = state.currentStep;
                this.isAdvancedMode = state.isAdvancedMode;
                // 可以恢复设置
                return state;
            }
        } catch (error) {
            console.warn('无法加载状态:', error);
        }
        return null;
    }

    getCurrentSettings() {
        return {
            pageSize: document.getElementById('pageSize')?.value,
            pageMargin: document.getElementById('pageMargin')?.value,
            imageQuality: document.getElementById('imageQuality')?.value,
            orientation: document.getElementById('orientation')?.value
        };
    }
}

// 全局实例
window.uiController = new UIController();
