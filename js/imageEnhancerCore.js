/* 图片增强核心算法 - 内存安全的图片处理算法 */

class ImageEnhancerCore {
    constructor() {
        this.enhancementLevels = {
            0: { name: '关闭', strength: 0, description: '保持原始图片' },
            1: { name: '轻度增强', strength: 0.3, description: '轻微提升清晰度，适合一般图片' },
            2: { name: '中度增强', strength: 0.6, description: '明显提升清晰度，适合模糊图片' },
            3: { name: '强度增强', strength: 1.0, description: '最大程度增强，适合严重模糊图片' }
        };
    }

    async enhanceImageSafely(imageDataUrl, level) {
        if (level === 0) return imageDataUrl;
        
        return await window.memoryManager.processImageSafely(imageDataUrl, async (processImageData, optimalSize) => {
            return await this.performEnhancement(processImageData, level, optimalSize);
        });
    }

    async performEnhancement(imageDataUrl, level, sizeInfo) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const { canvas, ctx } = window.memoryManager.createOptimizedCanvas(img.naturalWidth, img.naturalHeight);
                    
                    // 绘制原始图片
                    ctx.drawImage(img, 0, 0);
                    
                    // 应用增强算法
                    this.applyOptimizedEnhancement(ctx, canvas.width, canvas.height, level);
                    
                    // 转换为DataURL
                    const enhancedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
                    resolve(enhancedDataUrl);
                    
                } catch (error) {
                    reject(new Error(`图片增强失败: ${error.message}`));
                }
            };
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = imageDataUrl;
        });
    }

    applyOptimizedEnhancement(ctx, width, height, level) {
        const enhancement = this.enhancementLevels[level];
        const strength = enhancement.strength;
        
        if (strength === 0) return;
        
        // 选择合适的算法
        if (width * height < 1024 * 1024) {
            // 小图片使用高质量算法
            this.applyHighQualitySharpening(ctx, width, height, strength);
        } else {
            // 大图片使用优化算法
            this.applyOptimizedSharpening(ctx, width, height, strength);
        }
        
        // 可选：应用额外的增强
        if (strength > 0.6) {
            this.applyContrastEnhancement(ctx, width, height, (strength - 0.6) * 0.5);
        }
    }

    applyHighQualitySharpening(ctx, width, height, strength) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const newData = new Uint8ClampedArray(data);
        
        // 3x3锐化卷积核
        const kernel = [
            0, -1 * strength, 0,
            -1 * strength, 1 + 4 * strength, -1 * strength,
            0, -1 * strength, 0
        ];
        
        // 应用卷积
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) { // RGB channels only
                    let sum = 0;
                    
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const pos = ((y + ky) * width + (x + kx)) * 4 + c;
                            const kernelPos = (ky + 1) * 3 + (kx + 1);
                            sum += data[pos] * kernel[kernelPos];
                        }
                    }
                    
                    const pos = (y * width + x) * 4 + c;
                    newData[pos] = Math.max(0, Math.min(255, sum));
                }
            }
        }
        
        // 应用增强后的数据
        const newImageData = new ImageData(newData, width, height);
        ctx.putImageData(newImageData, 0, 0);
    }

    applyOptimizedSharpening(ctx, width, height, strength) {
        // 对大图片使用分块处理，避免内存溢出
        const blockSize = 512; // 512x512 块
        
        for (let startY = 0; startY < height; startY += blockSize) {
            for (let startX = 0; startX < width; startX += blockSize) {
                const blockWidth = Math.min(blockSize, width - startX);
                const blockHeight = Math.min(blockSize, height - startY);
                
                this.processImageBlock(ctx, startX, startY, blockWidth, blockHeight, strength);
            }
        }
    }

    processImageBlock(ctx, startX, startY, blockWidth, blockHeight, strength) {
        // 处理图片块，包含边界处理
        const padding = 1;
        const x = Math.max(0, startX - padding);
        const y = Math.max(0, startY - padding);
        const w = Math.min(ctx.canvas.width - x, blockWidth + 2 * padding);
        const h = Math.min(ctx.canvas.height - y, blockHeight + 2 * padding);
        
        const imageData = ctx.getImageData(x, y, w, h);
        const data = imageData.data;
        const newData = new Uint8ClampedArray(data);
        
        // 应用锐化到块中心区域
        const kernel = [
            0, -1 * strength, 0,
            -1 * strength, 1 + 4 * strength, -1 * strength,
            0, -1 * strength, 0
        ];
        
        for (let blockY = padding; blockY < h - padding; blockY++) {
            for (let blockX = padding; blockX < w - padding; blockX++) {
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const pos = ((blockY + ky) * w + (blockX + kx)) * 4 + c;
                            const kernelPos = (ky + 1) * 3 + (kx + 1);
                            sum += data[pos] * kernel[kernelPos];
                        }
                    }
                    
                    const pos = (blockY * w + blockX) * 4 + c;
                    newData[pos] = Math.max(0, Math.min(255, sum));
                }
            }
        }
        
        // 只更新中心区域，避免边界artifact
        const centerData = ctx.createImageData(blockWidth, blockHeight);
        const centerArray = centerData.data;
        
        for (let py = 0; py < blockHeight; py++) {
            for (let px = 0; px < blockWidth; px++) {
                const srcPos = ((py + padding) * w + (px + padding)) * 4;
                const dstPos = (py * blockWidth + px) * 4;
                
                centerArray[dstPos] = newData[srcPos];         // R
                centerArray[dstPos + 1] = newData[srcPos + 1]; // G
                centerArray[dstPos + 2] = newData[srcPos + 2]; // B
                centerArray[dstPos + 3] = data[srcPos + 3];    // A (保持原始alpha)
            }
        }
        
        ctx.putImageData(centerData, startX, startY);
    }

    applyContrastEnhancement(ctx, width, height, factor) {
        // 分块处理对比度增强
        const blockSize = 1024;
        
        for (let startY = 0; startY < height; startY += blockSize) {
            for (let startX = 0; startX < width; startX += blockSize) {
                const blockWidth = Math.min(blockSize, width - startX);
                const blockHeight = Math.min(blockSize, height - startY);
                
                this.enhanceBlockContrast(ctx, startX, startY, blockWidth, blockHeight, factor);
            }
        }
    }

    enhanceBlockContrast(ctx, startX, startY, blockWidth, blockHeight, factor) {
        const imageData = ctx.getImageData(startX, startY, blockWidth, blockHeight);
        const data = imageData.data;
        
        const contrast = (factor + 1) * (factor + 1) / (factor * (factor + 1) + 1);
        
        for (let i = 0; i < data.length; i += 4) {
            // 处理RGB通道
            for (let c = 0; c < 3; c++) {
                let value = data[i + c] / 255;
                value = (value - 0.5) * contrast + 0.5;
                data[i + c] = Math.max(0, Math.min(255, value * 255));
            }
            // Alpha通道保持不变
        }
        
        ctx.putImageData(imageData, startX, startY);
    }

    // 简化版增强算法（用于预览）
    async createPreviewEnhancement(imageDataUrl, level) {
        if (level === 0) return imageDataUrl;
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    // 创建小尺寸预览
                    const maxPreviewSize = 300;
                    const scale = Math.min(maxPreviewSize / img.naturalWidth, maxPreviewSize / img.naturalHeight, 1);
                    const previewWidth = Math.floor(img.naturalWidth * scale);
                    const previewHeight = Math.floor(img.naturalHeight * scale);
                    
                    const { canvas, ctx } = window.memoryManager.createOptimizedCanvas(previewWidth, previewHeight);
                    
                    // 绘制缩放图片
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, previewWidth, previewHeight);
                    
                    // 应用轻量级增强
                    this.applyPreviewEnhancement(ctx, previewWidth, previewHeight, level);
                    
                    const previewDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(previewDataUrl);
                    
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = reject;
            img.src = imageDataUrl;
        });
    }

    applyPreviewEnhancement(ctx, width, height, level) {
        const strength = this.enhancementLevels[level].strength * 0.7; // 减弱预览强度
        
        if (strength === 0) return;
        
        // 使用简化的USM (Unsharp Mask) 算法
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const newData = new Uint8ClampedArray(data);
        
        // 简化的3x3锐化核
        const kernel = [
            -0.1 * strength, -0.3 * strength, -0.1 * strength,
            -0.3 * strength, 1 + 1.6 * strength, -0.3 * strength,
            -0.1 * strength, -0.3 * strength, -0.1 * strength
        ];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    
                    for (let ky = 0; ky < 3; ky++) {
                        for (let kx = 0; kx < 3; kx++) {
                            const pos = ((y + ky - 1) * width + (x + kx - 1)) * 4 + c;
                            sum += data[pos] * kernel[ky * 3 + kx];
                        }
                    }
                    
                    const pos = (y * width + x) * 4 + c;
                    newData[pos] = Math.max(0, Math.min(255, sum));
                }
            }
        }
        
        const newImageData = new ImageData(newData, width, height);
        ctx.putImageData(newImageData, 0, 0);
    }

    // 批量处理优化
    async enhanceImagesBatch(files, level, progressCallback) {
        if (level === 0) return files;
        
        const enhancedFiles = [];
        const batchSize = window.performanceMonitor.optimizeForDevice().batchSize;
        
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const batchPromises = batch.map(async (file, index) => {
                try {
                    const globalIndex = i + index;
                    
                    if (progressCallback) {
                        progressCallback(globalIndex, files.length, file.name);
                    }
                    
                    const enhancedImageData = await this.enhanceImageSafely(file.imageData, level);
                    
                    return {
                        ...file,
                        imageData: enhancedImageData,
                        enhanced: true,
                        enhancementLevel: level
                    };
                    
                } catch (error) {
                    console.error(`增强图片失败: ${file.name}`, error);
                    return file; // 返回原图
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            enhancedFiles.push(...batchResults);
            
            // 检查是否需要暂停
            const shouldPause = window.performanceMonitor.shouldPauseProcessing();
            if (shouldPause.should) {
                throw new Error(`处理暂停: ${shouldPause.reason}`);
            }
            
            // 批次间休息，让浏览器处理其他任务
            if (i + batchSize < files.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return enhancedFiles;
    }
}

// 全局实例
window.imageEnhancerCore = new ImageEnhancerCore();
