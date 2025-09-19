# 图片转PDF工具

一个纯前端的图片转PDF转换工具，支持无限数量图片，智能顺序检测，专业PDF生成。

## 🌟 功能特点

- **无限图片支持**: 支持同时处理任意数量的图片文件
- **智能顺序检测**: 自动检测图片的合理排序
- **多格式支持**: 支持 JPG, PNG, GIF, WEBP 格式
- **专业PDF生成**: 高质量PDF输出，支持多种页面尺寸
- **拖拽上传**: 支持拖拽文件上传，操作简便
- **实时预览**: 图片预览和排序功能
- **纯前端实现**: 无需服务器，数据不上传，保护隐私
- **响应式设计**: 完美适配桌面和移动设备

## 🚀 在线体验

访问: [https://你的用户名.github.io/image-to-pdf-converter](https://你的用户名.github.io/image-to-pdf-converter)

## 📱 使用方法

1. **选择图片**: 点击上传区域或拖拽图片文件
2. **调整设置**: 选择PDF页面大小、质量等参数
3. **预览排序**: 查看图片预览，调整顺序
4. **生成PDF**: 点击生成按钮，下载PDF文件

## ⚙️ 技术栈

- **前端**: 纯HTML5 + CSS3 + JavaScript (ES6+)
- **PDF生成**: jsPDF
- **图片处理**: html2canvas
- **样式**: 现代CSS Grid/Flexbox布局
- **兼容性**: 支持现代浏览器

## 🛠️ 本地开发

1. 克隆仓库:
```bash
git clone https://github.com/你的用户名/image-to-pdf-converter.git
cd image-to-pdf-converter
```

2. 启动本地服务器:
```bash
# 使用Python
python -m http.server 8000

# 或使用Node.js
npx serve .

# 或使用Live Server (VS Code扩展)
```

3. 访问 `http://localhost:8000`

## 📁 项目结构

```
image-to-pdf-converter/
├── index.html              # 主页面
├── js/                     # JavaScript模块
│   ├── main.js            # 主应用逻辑
│   ├── fileHandler.js     # 文件处理
│   ├── orderDetector.js   # 顺序检测
│   ├── imageProcessor.js  # 图片处理
│   ├── pdfGenerator.js    # PDF生成
│   └── ...               # 其他模块
├── styles/                # CSS样式
│   ├── main.css          # 主样式
│   ├── upload.css        # 上传区域样式
│   └── ...              # 其他样式
└── README.md             # 项目说明
```

## 🎨 特色功能

### 智能顺序检测
- 自动分析文件名中的数字序号
- 支持多种命名规则识别
- 提供手动排序功能

### 高级PDF设置
- 多种页面尺寸 (A4, A3, A5, Letter, Legal, 自定义)
- 可调节页边距和图片质量
- 自动/手动页面方向选择
- 图片清晰度增强

### 性能优化
- 内存管理优化，支持大量图片处理
- 渐进式加载，避免浏览器卡顿
- 智能压缩，平衡质量与文件大小

## 🔧 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系方式

如有问题或建议，请通过以下方式联系:
- 提交 [Issue](https://github.com/你的用户名/image-to-pdf-converter/issues)
- 发送邮件至: your-email@example.com

---

⭐ 如果这个项目对你有帮助，请给个星标支持一下！