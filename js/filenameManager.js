/* 文件名管理模块 - 负责PDF文件名输入、验证和生成 */

class FilenameManager {
    constructor() {
        this.defaultPrefix = 'images-to-pdf';
        this.invalidChars = /[<>:"/\\|?*\x00-\x1f]/g;
        this.reservedNames = [
            'CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        ];
        
        this.initEventListeners();
        this.initDefaultFilename();
    }

    initEventListeners() {
        const filenameInput = document.getElementById('outputFilename');
        if (filenameInput) {
            // 实时验证和预览
            filenameInput.addEventListener('input', (e) => {
                this.validateAndPreview(e.target.value);
            });
            
            // 失去焦点时清理文件名
            filenameInput.addEventListener('blur', (e) => {
                const cleanedName = this.cleanFilename(e.target.value);
                if (cleanedName !== e.target.value) {
                    e.target.value = cleanedName;
                    this.validateAndPreview(cleanedName);
                }
            });
            
            // 键盘事件处理
            filenameInput.addEventListener('keydown', (e) => {
                this.handleKeydown(e);
            });
            
            // 粘贴事件处理
            filenameInput.addEventListener('paste', (e) => {
                setTimeout(() => {
                    const value = e.target.value;
                    const cleaned = this.cleanFilename(value);
                    if (cleaned !== value) {
                        e.target.value = cleaned;
                    }
                    this.validateAndPreview(cleaned);
                }, 10);
            });
        }
    }

    initDefaultFilename() {
        const filenameInput = document.getElementById('outputFilename');
        if (filenameInput && !filenameInput.value) {
            const defaultName = this.generateDefaultFilename();
            filenameInput.value = defaultName;
            this.validateAndPreview(defaultName);
        }
    }

    generateDefaultFilename() {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const timeStr = now.toTimeString().slice(0, 5).replace(':', ''); // HHMM
        
        // 检查是否有图片可以用来生成更智能的文件名
        const files = window.imageProcessor ? window.imageProcessor.getOrderedFiles() : [];
        
        if (files.length > 0) {
            // 尝试从第一个文件名中提取有意义的部分
            const firstFile = files[0];
            const baseName = this.extractMeaningfulName(firstFile.name);
            
            if (baseName) {
                return `${baseName}-pdf-${dateStr}`;
            }
        }
        
        return `${this.defaultPrefix}-${dateStr}-${timeStr}`;
    }

    extractMeaningfulName(filename) {
        // 移除扩展名
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
        
        // 移除常见的数字编号模式
        let baseName = nameWithoutExt
            .replace(/^\d+[-_\s]*/, '') // 开头的数字
            .replace(/[-_\s]*\d+$/, '') // 结尾的数字
            .replace(/^(cover|封面)[-_\s]*/i, '') // 移除cover前缀
            .replace(/[-_\s]*(cover|封面)$/i, '') // 移除cover后缀
            .trim();
        
        // 如果清理后还有有意义的内容，返回它
        if (baseName && baseName.length >= 2) {
            return this.cleanFilename(baseName);
        }
        
        return null;
    }

    validateAndPreview(filename) {
        const validation = this.validateFilename(filename);
        this.updateValidationUI(validation);
        this.updateFilenamePreview(filename, validation.isValid);
        return validation;
    }

    validateFilename(filename) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            cleaned: filename
        };
        
        // 检查是否为空
        if (!filename || filename.trim() === '') {
            result.isValid = false;
            result.errors.push('文件名不能为空');
            return result;
        }
        
        // 检查长度
        if (filename.length > 100) {
            result.isValid = false;
            result.errors.push('文件名过长（最多100个字符）');
        }
        
        if (filename.length < 2) {
            result.isValid = false;
            result.errors.push('文件名过短（至少2个字符）');
        }
        
        // 检查非法字符
        const hasInvalidChars = this.invalidChars.test(filename);
        if (hasInvalidChars) {
            result.isValid = false;
            result.errors.push('包含非法字符: < > : " / \\ | ? *');
        }
        
        // 检查保留名称
        const upperName = filename.toUpperCase();
        if (this.reservedNames.includes(upperName)) {
            result.isValid = false;
            result.errors.push('不能使用系统保留名称');
        }
        
        // 检查是否以点开头或结尾
        if (filename.startsWith('.') || filename.endsWith('.')) {
            result.warnings.push('建议不要以点开头或结尾');
        }
        
        // 检查是否包含连续空格
        if (/\s{2,}/.test(filename)) {
            result.warnings.push('包含连续空格，建议清理');
        }
        
        // 清理建议
        result.cleaned = this.cleanFilename(filename);
        if (result.cleaned !== filename) {
            result.warnings.push('建议使用清理后的文件名');
        }
        
        return result;
    }

    cleanFilename(filename) {
        if (!filename) return '';
        
        return filename
            .replace(this.invalidChars, '') // 移除非法字符
            .replace(/\s+/g, ' ') // 替换多个空格为单个空格
            .replace(/^\.+|\.+$/g, '') // 移除开头和结尾的点
            .trim() // 移除首尾空格
            .substring(0, 100); // 限制长度
    }

    updateValidationUI(validation) {
        const filenameInput = document.getElementById('outputFilename');
        const controlGroup = filenameInput.closest('.control-group');
        
        // 移除之前的提示
        const existingHint = controlGroup.querySelector('.filename-hint');
        if (existingHint) {
            existingHint.remove();
        }
        
        // 创建新的提示
        const hint = document.createElement('div');
        hint.className = `filename-hint ${validation.isValid ? 'valid' : 'invalid'}`;
        
        let hintContent = '';
        
        if (validation.isValid) {
            hintContent = '<span class="icon">✓</span> 文件名有效';
        } else {
            hintContent = '<span class="icon">✗</span> ' + validation.errors.join(', ');
        }
        
        if (validation.warnings.length > 0) {
            hintContent += '<br><span class="icon">⚠</span> ' + validation.warnings.join(', ');
        }
        
        hint.innerHTML = hintContent;
        controlGroup.appendChild(hint);
        
        // 更新输入框样式
        if (validation.isValid) {
            filenameInput.style.borderColor = '#38a169';
            filenameInput.style.backgroundColor = 'rgba(72, 187, 120, 0.05)';
        } else {
            filenameInput.style.borderColor = '#e53e3e';
            filenameInput.style.backgroundColor = 'rgba(245, 101, 101, 0.05)';
        }
    }

    updateFilenamePreview(filename, isValid) {
        const controlGroup = document.getElementById('outputFilename').closest('.control-group');
        
        // 移除之前的预览
        const existingPreview = controlGroup.querySelector('.filename-preview');
        if (existingPreview) {
            existingPreview.remove();
        }
        
        if (filename && isValid) {
            const preview = document.createElement('div');
            preview.className = 'filename-preview';
            
            const finalFilename = this.getFinalFilename(filename);
            preview.innerHTML = `
                <div class="label">最终文件名:</div>
                <div>${finalFilename}</div>
            `;
            
            controlGroup.appendChild(preview);
        }
    }

    handleKeydown(e) {
        // 阻止某些非法字符的输入
        const forbiddenKeys = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
        if (forbiddenKeys.includes(e.key)) {
            e.preventDefault();
            this.showQuickMessage('该字符不被允许');
            return;
        }
        
        // Ctrl+A 全选
        if (e.ctrlKey && e.key === 'a') {
            // 允许默认行为
            return;
        }
        
        // 回车键生成PDF
        if (e.key === 'Enter') {
            e.preventDefault();
            const generateBtn = document.getElementById('generateBtn');
            if (generateBtn && !generateBtn.disabled) {
                generateBtn.click();
            }
        }
    }

    showQuickMessage(message) {
        // 创建临时提示
        const msg = document.createElement('div');
        msg.textContent = message;
        msg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(245, 101, 101, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 0.9rem;
            z-index: 10005;
            pointer-events: none;
        `;
        
        document.body.appendChild(msg);
        
        setTimeout(() => {
            if (msg.parentNode) {
                msg.parentNode.removeChild(msg);
            }
        }, 2000);
    }

    getFinalFilename(customName = null) {
        const filenameInput = document.getElementById('outputFilename');
        let filename = customName || (filenameInput ? filenameInput.value : '');
        
        // 如果没有输入或输入无效，使用默认名称
        if (!filename || !this.validateFilename(filename).isValid) {
            filename = this.generateDefaultFilename();
        }
        
        // 清理文件名
        filename = this.cleanFilename(filename);
        
        // 确保文件名不为空
        if (!filename) {
            filename = this.defaultPrefix;
        }
        
        // 添加.pdf扩展名
        return filename + '.pdf';
    }

    // 生成智能文件名建议
    generateSmartSuggestions() {
        const files = window.imageProcessor ? window.imageProcessor.getOrderedFiles() : [];
        const suggestions = [];
        
        if (files.length > 0) {
            // 基于第一个文件的建议
            const firstFile = files[0];
            const baseName = this.extractMeaningfulName(firstFile.name);
            if (baseName) {
                suggestions.push(baseName);
                suggestions.push(baseName + '-合集');
                suggestions.push(baseName + '-图册');
            }
            
            // 基于文件数量的建议
            if (files.length > 1) {
                suggestions.push(`图片合集-${files.length}张`);
                suggestions.push(`PDF文档-${files.length}页`);
            }
            
            // 基于日期的建议
            const today = new Date().toISOString().slice(0, 10);
            suggestions.push(`图片转换-${today}`);
        }
        
        // 添加通用建议
        suggestions.push('我的PDF文档');
        suggestions.push('图片集合');
        suggestions.push('扫描文档');
        
        return [...new Set(suggestions)]; // 去重
    }

    // 显示文件名建议
    showFilenameSuggestions() {
        const suggestions = this.generateSmartSuggestions();
        const filenameInput = document.getElementById('outputFilename');
        const controlGroup = filenameInput.closest('.control-group');
        
        // 移除现有建议
        const existingSuggestions = controlGroup.querySelector('.filename-suggestions');
        if (existingSuggestions) {
            existingSuggestions.remove();
        }
        
        if (suggestions.length === 0) return;
        
        const suggestionsEl = document.createElement('div');
        suggestionsEl.className = 'filename-suggestions';
        suggestionsEl.style.cssText = `
            margin-top: 10px;
            padding: 15px;
            background: rgba(102, 126, 234, 0.05);
            border-radius: 8px;
            border: 1px solid rgba(102, 126, 234, 0.2);
        `;
        
        suggestionsEl.innerHTML = `
            <div style="font-weight: 600; color: #667eea; margin-bottom: 10px; font-size: 0.9rem;">
                💡 智能建议:
            </div>
            <div class="suggestion-buttons" style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${suggestions.slice(0, 6).map(suggestion => `
                    <button type="button" class="suggestion-btn" style="
                        padding: 6px 12px;
                        background: white;
                        border: 1px solid #e2e8f0;
                        border-radius: 6px;
                        font-size: 0.85rem;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        color: #4a5568;
                    " onmouseover="this.style.background='#667eea'; this.style.color='white';" 
                       onmouseout="this.style.background='white'; this.style.color='#4a5568';">
                        ${suggestion}
                    </button>
                `).join('')}
            </div>
        `;
        
        controlGroup.appendChild(suggestionsEl);
        
        // 绑定建议按钮事件
        const suggestionBtns = suggestionsEl.querySelectorAll('.suggestion-btn');
        suggestionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filenameInput.value = btn.textContent.trim();
                this.validateAndPreview(filenameInput.value);
                suggestionsEl.remove();
            });
        });
    }

    // 公共API
    getCurrentFilename() {
        return this.getFinalFilename();
    }

    setFilename(filename) {
        const filenameInput = document.getElementById('outputFilename');
        if (filenameInput) {
            filenameInput.value = this.cleanFilename(filename);
            this.validateAndPreview(filenameInput.value);
        }
    }

    isFilenameValid() {
        const filenameInput = document.getElementById('outputFilename');
        const filename = filenameInput ? filenameInput.value : '';
        return this.validateFilename(filename).isValid;
    }
}

// 全局实例
window.filenameManager = new FilenameManager();
