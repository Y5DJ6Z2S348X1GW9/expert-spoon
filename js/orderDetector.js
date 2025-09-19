/* 顺序检测模块 - 检测文件名顺序，特别处理封面文件 */

class OrderDetector {
    constructor() {
        this.coverNames = [
            'cover', 'Cover', 'COVER',
            'cover.jpg', 'cover.png', 'cover.jpeg', 'cover.gif', 'cover.webp',
            'Cover.jpg', 'Cover.png', 'Cover.jpeg', 'Cover.gif', 'Cover.webp',
            'COVER.JPG', 'COVER.PNG', 'COVER.JPEG', 'COVER.GIF', 'COVER.WEBP',
            '封面', '封面.jpg', '封面.png', '封面.jpeg', '封面.gif', '封面.webp'
        ];
        
        this.numberPatterns = [
            /^(\d+)/, // 开头数字
            /(\d+)/, // 任意位置数字
            /[\D]*(\d+)[\D]*$/, // 末尾数字
            /.*?(\d+).*/, // 包含数字
        ];
    }

    async detectOrder(files) {
        if (!files || files.length === 0) {
            this.updateOrderStatus('error', '没有文件需要检测');
            return false;
        }

        try {
            // 分析文件名
            const analysis = this.analyzeFileNames(files);
            
            // 检测结果
            if (analysis.hasValidOrder) {
                this.updateOrderStatus('success', '检测到有序文件名');
                this.applyDetectedOrder(files, analysis);
                this.showControlsAndPreview();
                return true;
            } else {
                this.updateOrderStatus('error', '未检测到文件顺序');
                this.showOrderModal(files, analysis);
                return false;
            }
        } catch (error) {
            console.error('顺序检测错误:', error);
            this.updateOrderStatus('error', '检测失败');
            return false;
        }
    }

    analyzeFileNames(files) {
        const analysis = {
            hasValidOrder: false,
            hasCover: false,
            coverFiles: [],
            numberedFiles: [],
            orderingMethod: 'none',
            suggestions: []
        };

        // 查找封面文件
        files.forEach((file, index) => {
            const fileName = file.name;
            const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
            
            if (this.isCoverFile(fileName) || this.isCoverFile(nameWithoutExt)) {
                analysis.hasCover = true;
                analysis.coverFiles.push({ file, index });
            }
        });

        // 分析数字编号
        const numberAnalysis = this.analyzeNumbering(files);
        
        if (numberAnalysis.hasConsistentNumbering) {
            analysis.hasValidOrder = true;
            analysis.orderingMethod = numberAnalysis.method;
            analysis.numberedFiles = numberAnalysis.orderedFiles;
        }

        // 生成建议
        analysis.suggestions = this.generateSuggestions(analysis, files);

        return analysis;
    }

    analyzeNumbering(files) {
        const results = {
            hasConsistentNumbering: false,
            method: 'none',
            orderedFiles: [],
            confidence: 0
        };

        // 尝试不同的数字提取模式
        for (const pattern of this.numberPatterns) {
            const extracted = this.extractNumbers(files, pattern);
            if (extracted.isValid) {
                results.hasConsistentNumbering = true;
                results.method = extracted.method;
                results.orderedFiles = extracted.orderedFiles;
                results.confidence = extracted.confidence;
                break;
            }
        }

        return results;
    }

    extractNumbers(files, pattern) {
        const extracted = files.map((file, index) => {
            const fileName = file.name.replace(/\.[^/.]+$/, ''); // 移除扩展名
            const match = fileName.match(pattern);
            const number = match ? parseInt(match[1], 10) : null;
            
            return {
                file,
                originalIndex: index,
                number,
                fileName
            };
        }).filter(item => item.number !== null);

        // 检查是否有足够的数字文件
        if (extracted.length < files.length * 0.7) { // 至少70%的文件有数字
            return { isValid: false };
        }

        // 检查数字连续性
        const numbers = extracted.map(item => item.number).sort((a, b) => a - b);
        const isConsecutive = this.isConsecutiveSequence(numbers);
        const hasReasonableRange = numbers[numbers.length - 1] - numbers[0] < files.length * 2;

        if (isConsecutive || hasReasonableRange) {
            // 按数字排序
            extracted.sort((a, b) => a.number - b.number);
            
            return {
                isValid: true,
                method: 'numeric',
                orderedFiles: extracted.map(item => item.file),
                confidence: isConsecutive ? 1.0 : 0.8
            };
        }

        return { isValid: false };
    }

    isConsecutiveSequence(numbers) {
        if (numbers.length < 2) return true;
        
        for (let i = 1; i < numbers.length; i++) {
            if (numbers[i] - numbers[i-1] > 2) { // 允许跳过1-2个数字
                return false;
            }
        }
        return true;
    }

    isCoverFile(fileName) {
        const lowerName = fileName.toLowerCase();
        return this.coverNames.some(coverName => 
            lowerName === coverName.toLowerCase() || 
            lowerName.startsWith(coverName.toLowerCase())
        );
    }

    generateSuggestions(analysis, files) {
        const suggestions = [];

        if (analysis.hasCover) {
            suggestions.push('检测到封面文件，将自动放置在首位');
        }

        if (!analysis.hasValidOrder) {
            suggestions.push('建议使用数字编号的文件名，如：001.jpg, 002.jpg');
            suggestions.push('或者重新整理文件名后再上传');
        }

        if (files.length > 50) {
            suggestions.push('文件数量较多，建议确认排序正确');
        }

        return suggestions;
    }

    applyDetectedOrder(files, analysis) {
        let orderedFiles = [];

        // 先添加封面文件
        if (analysis.hasCover && analysis.coverFiles.length > 0) {
            analysis.coverFiles.forEach(coverInfo => {
                orderedFiles.push(coverInfo.file);
            });
        }

        // 添加其他文件
        if (analysis.hasValidOrder && analysis.numberedFiles.length > 0) {
            // 过滤掉已经添加的封面文件
            const nonCoverFiles = analysis.numberedFiles.filter(file => 
                !analysis.coverFiles.some(coverInfo => coverInfo.file.id === file.id)
            );
            orderedFiles = orderedFiles.concat(nonCoverFiles);
        } else {
            // 如果没有有效顺序，按文件名排序（排除封面）
            const nonCoverFiles = files.filter(file => 
                !analysis.coverFiles.some(coverInfo => coverInfo.file.id === file.id)
            );
            nonCoverFiles.sort((a, b) => a.name.localeCompare(b.name));
            orderedFiles = orderedFiles.concat(nonCoverFiles);
        }

        // 更新文件顺序
        if (window.fileHandler) {
            window.fileHandler.updateFilesOrder(orderedFiles);
        }
    }

    updateOrderStatus(status, message) {
        const orderStatus = document.getElementById('orderStatus');
        
        if (orderStatus) {
            orderStatus.textContent = message;
            orderStatus.className = `status-indicator status-${status}`;
            
            // 添加图标
            const icon = document.createElement('span');
            icon.className = 'status-icon';
            orderStatus.insertBefore(icon, orderStatus.firstChild);
        }
    }

    showOrderModal(files, analysis) {
        const modal = document.getElementById('orderModal');
        const modalMessage = document.getElementById('modalMessage');
        const modalContinue = document.getElementById('modalContinue');
        const modalCancel = document.getElementById('modalCancel');
        const modalClose = document.getElementById('modalClose');

        // 生成消息内容
        let messageHTML = '<div class="order-detection-result">';
        messageHTML += '<h4>顺序检测结果</h4>';
        
        if (analysis.hasCover) {
            messageHTML += '<p class="status-success">✓ 检测到封面文件</p>';
        }
        
        messageHTML += '<p class="status-error">✗ 未检测到有效的数字顺序</p>';
        
        if (analysis.suggestions.length > 0) {
            messageHTML += '<div class="suggestions">';
            messageHTML += '<h5>建议：</h5>';
            messageHTML += '<ul>';
            analysis.suggestions.forEach(suggestion => {
                messageHTML += `<li>${suggestion}</li>`;
            });
            messageHTML += '</ul>';
            messageHTML += '</div>';
        }
        
        messageHTML += '<p><strong>您可以选择：</strong></p>';
        messageHTML += '<ul>';
        messageHTML += '<li>重新选择具有数字顺序的文件</li>';
        messageHTML += '<li>或者继续处理（将按文件名字母顺序排序）</li>';
        messageHTML += '</ul>';
        messageHTML += '</div>';

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .order-detection-result h4 { color: #4a5568; margin-bottom: 15px; }
            .order-detection-result h5 { color: #667eea; margin: 15px 0 8px 0; }
            .order-detection-result ul { margin: 10px 0; padding-left: 20px; }
            .order-detection-result li { margin: 5px 0; }
            .status-success { color: #38a169; font-weight: 600; }
            .status-error { color: #e53e3e; font-weight: 600; }
            .suggestions { background: rgba(102, 126, 234, 0.1); padding: 15px; border-radius: 8px; margin: 15px 0; }
        `;
        document.head.appendChild(style);

        modalMessage.innerHTML = messageHTML;

        // 显示继续按钮
        modalContinue.style.display = 'inline-block';

        // 绑定事件
        const closeModal = () => {
            modal.style.display = 'none';
        };

        const continueProcessing = () => {
            closeModal();
            // 按文件名排序继续处理
            const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));
            
            // 如果有封面，放在前面
            if (analysis.hasCover && analysis.coverFiles.length > 0) {
                const coverFiles = analysis.coverFiles.map(info => info.file);
                const nonCoverFiles = sortedFiles.filter(file => 
                    !coverFiles.some(cover => cover.id === file.id)
                );
                const finalOrder = [...coverFiles, ...nonCoverFiles];
                
                if (window.fileHandler) {
                    window.fileHandler.updateFilesOrder(finalOrder);
                }
            } else {
                if (window.fileHandler) {
                    window.fileHandler.updateFilesOrder(sortedFiles);
                }
            }
            
            this.updateOrderStatus('warning', '使用字母顺序排序');
            this.showControlsAndPreview();
        };

        const resetFiles = () => {
            closeModal();
            if (window.fileHandler) {
                window.fileHandler.clearFiles();
            }
        };

        // 移除之前的事件监听器
        modalClose.onclick = null;
        modalContinue.onclick = null;
        modalCancel.onclick = null;

        // 添加新的事件监听器
        modalClose.onclick = closeModal;
        modalContinue.onclick = continueProcessing;
        modalCancel.onclick = resetFiles;

        // 显示模态框
        modal.style.display = 'flex';
    }

    showControlsAndPreview() {
        // 显示控制面板和预览区域
        const controlsSection = document.getElementById('controlsSection');
        const previewSection = document.getElementById('previewSection');
        
        if (controlsSection) {
            controlsSection.style.display = 'block';
            controlsSection.classList.add('fade-in');
        }
        
        if (previewSection && window.imageProcessor) {
            previewSection.style.display = 'block';
            previewSection.classList.add('fade-in');
            window.imageProcessor.updatePreview();
        }
    }
}

// 全局实例
window.orderDetector = new OrderDetector();
