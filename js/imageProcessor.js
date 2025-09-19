/* 图片处理模块 - 负责预览、排序和图片操作 */

class ImageProcessor {
    constructor() {
        this.currentSort = 'detected'; // detected, name, date, custom
        this.draggedItem = null;
        this.initEventListeners();
    }

    initEventListeners() {
        // 排序按钮
        const sortByName = document.getElementById('sortByName');
        const sortByDate = document.getElementById('sortByDate');
        const reverseOrder = document.getElementById('reverseOrder');

        if (sortByName) {
            sortByName.addEventListener('click', () => this.sortByName());
        }
        
        if (sortByDate) {
            sortByDate.addEventListener('click', () => this.sortByDate());
        }
        
        if (reverseOrder) {
            reverseOrder.addEventListener('click', () => this.reverseOrder());
        }
    }

    updatePreview() {
        const previewGrid = document.getElementById('previewGrid');
        if (!previewGrid) return;

        const files = window.fileHandler ? window.fileHandler.getFiles() : [];
        
        if (files.length === 0) {
            this.showEmptyState(previewGrid);
            return;
        }

        // 清空现有内容
        previewGrid.innerHTML = '';

        // 生成预览项
        files.forEach((file, index) => {
            const previewItem = this.createPreviewItem(file, index);
            previewGrid.appendChild(previewItem);
        });

        // 添加拖拽功能
        this.initDragAndDrop(previewGrid);
    }

    createPreviewItem(file, index) {
        const item = document.createElement('div');
        item.className = 'preview-item';
        item.draggable = true;
        item.dataset.fileId = file.id;
        item.dataset.index = index;

        // 检测是否为封面
        const isCover = this.isCoverFile(file.name);
        if (isCover) {
            item.classList.add('cover');
        }

        item.innerHTML = `
            <div class="preview-order">${index + 1}</div>
            <img src="${file.imageData}" alt="${file.name}" class="preview-image" loading="lazy">
            <div class="preview-info">
                <div class="preview-filename" title="${file.name}">${file.name}</div>
                <div class="preview-details">
                    <span class="preview-size">${this.formatFileSize(file.size)}</span>
                    <span>${file.dimensions.width}×${file.dimensions.height}</span>
                </div>
            </div>
            <button class="preview-delete" title="删除此图片">×</button>
        `;

        // 删除按钮事件
        const deleteBtn = item.querySelector('.preview-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeFile(file.id);
        });

        // 点击预览
        item.addEventListener('click', () => {
            this.showImageModal(file);
        });

        return item;
    }

    showEmptyState(container) {
        container.innerHTML = `
            <div class="preview-empty">
                <div class="preview-empty-icon">📷</div>
                <p>暂无图片预览</p>
            </div>
        `;
    }

    initDragAndDrop(container) {
        const items = container.querySelectorAll('.preview-item');
        
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                this.draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', item.outerHTML);
            });

            item.addEventListener('dragend', () => {
                if (this.draggedItem) {
                    this.draggedItem.classList.remove('dragging');
                    this.draggedItem = null;
                }
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                if (this.draggedItem && this.draggedItem !== item) {
                    item.classList.add('drag-over');
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                
                if (this.draggedItem && this.draggedItem !== item) {
                    this.handleDrop(this.draggedItem, item);
                }
            });
        });
    }

    handleDrop(draggedItem, targetItem) {
        const draggedIndex = parseInt(draggedItem.dataset.index);
        const targetIndex = parseInt(targetItem.dataset.index);
        
        if (draggedIndex === targetIndex) return;

        // 重新排序文件
        const files = window.fileHandler ? window.fileHandler.getFiles() : [];
        const newFiles = [...files];
        
        // 移动元素
        const [movedFile] = newFiles.splice(draggedIndex, 1);
        newFiles.splice(targetIndex, 0, movedFile);

        // 更新文件顺序
        if (window.fileHandler) {
            window.fileHandler.updateFilesOrder(newFiles);
        }

        // 更新预览
        this.currentSort = 'custom';
        this.updatePreview();
        
        // 显示成功消息
        if (window.fileHandler) {
            window.fileHandler.showSuccess('顺序已更新');
        }
    }

    sortByName() {
        const files = window.fileHandler ? window.fileHandler.getFiles() : [];
        const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));
        
        this.updateFilesAndPreview(sortedFiles, 'name');
        this.animateSorting();
    }

    sortByDate() {
        const files = window.fileHandler ? window.fileHandler.getFiles() : [];
        const sortedFiles = [...files].sort((a, b) => a.lastModified - b.lastModified);
        
        this.updateFilesAndPreview(sortedFiles, 'date');
        this.animateSorting();
    }

    reverseOrder() {
        const files = window.fileHandler ? window.fileHandler.getFiles() : [];
        const reversedFiles = [...files].reverse();
        
        this.updateFilesAndPreview(reversedFiles, 'reversed');
        this.animateSorting();
    }

    updateFilesAndPreview(newFiles, sortType) {
        if (window.fileHandler) {
            window.fileHandler.updateFilesOrder(newFiles);
        }
        
        this.currentSort = sortType;
        this.updatePreview();
        
        if (window.fileHandler) {
            window.fileHandler.showSuccess(`已按${this.getSortDisplayName(sortType)}排序`);
        }
    }

    getSortDisplayName(sortType) {
        const names = {
            name: '文件名',
            date: '修改日期',
            reversed: '反向',
            custom: '自定义'
        };
        return names[sortType] || '检测到的顺序';
    }

    animateSorting() {
        const items = document.querySelectorAll('.preview-item');
        items.forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('sorting');
                setTimeout(() => {
                    item.classList.remove('sorting');
                }, 500);
            }, index * 50);
        });
    }

    removeFile(fileId) {
        const files = window.fileHandler ? window.fileHandler.getFiles() : [];
        const newFiles = files.filter(file => file.id !== fileId);
        
        if (window.fileHandler) {
            window.fileHandler.updateFilesOrder(newFiles);
            window.fileHandler.showSuccess('图片已删除');
        }
        
        this.updatePreview();
        
        // 如果没有文件了，隐藏预览区域
        if (newFiles.length === 0) {
            const previewSection = document.getElementById('previewSection');
            const controlsSection = document.getElementById('controlsSection');
            
            if (previewSection) previewSection.style.display = 'none';
            if (controlsSection) controlsSection.style.display = 'none';
        }
    }

    showImageModal(file) {
        // 创建图片模态框
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10002;
            cursor: pointer;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            position: relative;
        `;

        const img = document.createElement('img');
        img.src = file.imageData;
        img.alt = file.name;
        img.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 10px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        `;

        const info = document.createElement('div');
        info.style.cssText = `
            position: absolute;
            bottom: -60px;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.95);
            padding: 15px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
            text-align: center;
        `;
        
        info.innerHTML = `
            <div style="font-weight: 600; color: #4a5568; margin-bottom: 5px;">${file.name}</div>
            <div style="color: #718096; font-size: 0.9rem;">
                ${file.dimensions.width}×${file.dimensions.height} • ${this.formatFileSize(file.size)}
            </div>
        `;

        modalContent.appendChild(img);
        modalContent.appendChild(info);
        modal.appendChild(modalContent);

        // 点击关闭
        modal.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // 阻止内容区域点击事件冒泡
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // ESC键关闭
        const closeOnEsc = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(modal);
                document.removeEventListener('keydown', closeOnEsc);
            }
        };
        document.addEventListener('keydown', closeOnEsc);

        document.body.appendChild(modal);
    }

    isCoverFile(fileName) {
        const coverNames = [
            'cover', 'Cover', 'COVER',
            '封面'
        ];
        
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        return coverNames.some(coverName => 
            nameWithoutExt.toLowerCase().includes(coverName.toLowerCase())
        );
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 获取当前文件列表（用于PDF生成）
    getOrderedFiles() {
        return window.fileHandler ? window.fileHandler.getFiles() : [];
    }

    // 批量选择功能
    toggleSelection(fileId) {
        const item = document.querySelector(`[data-file-id="${fileId}"]`);
        if (item) {
            item.classList.toggle('selected');
            this.updateBatchOperations();
        }
    }

    selectAll() {
        const items = document.querySelectorAll('.preview-item');
        items.forEach(item => item.classList.add('selected'));
        this.updateBatchOperations();
    }

    deselectAll() {
        const items = document.querySelectorAll('.preview-item');
        items.forEach(item => item.classList.remove('selected'));
        this.updateBatchOperations();
    }

    updateBatchOperations() {
        const selectedItems = document.querySelectorAll('.preview-item.selected');
        const batchOperations = document.querySelector('.batch-operations');
        const selectedCount = document.querySelector('.selected-count');
        
        if (selectedItems.length > 0) {
            if (batchOperations) {
                batchOperations.classList.add('active');
            }
            if (selectedCount) {
                selectedCount.textContent = `已选择 ${selectedItems.length} 项`;
            }
        } else {
            if (batchOperations) {
                batchOperations.classList.remove('active');
            }
        }
    }

    deleteSelected() {
        const selectedItems = document.querySelectorAll('.preview-item.selected');
        const fileIds = Array.from(selectedItems).map(item => item.dataset.fileId);
        
        fileIds.forEach(fileId => this.removeFile(fileId));
        this.deselectAll();
    }
}

// 全局实例
window.imageProcessor = new ImageProcessor();
