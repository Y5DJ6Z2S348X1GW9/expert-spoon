@echo off
echo ========================================
echo 图片转PDF工具 - GitHub部署脚本
echo ========================================
echo.

echo 1. 初始化Git仓库...
git init

echo 2. 添加所有文件...
git add .

echo 3. 创建初始提交...
git commit -m "Initial commit: 图片转PDF工具完整版本"

echo 4. 设置主分支...
git branch -M main

echo.
echo 请输入你的GitHub用户名:
set /p username=

echo.
echo 5. 添加远程仓库...
git remote add origin https://github.com/%username%/image-to-pdf-converter.git

echo 6. 推送到GitHub...
git push -u origin main

echo.
echo ========================================
echo 部署完成！
echo.
echo 接下来请按以下步骤启用GitHub Pages:
echo 1. 访问: https://github.com/%username%/image-to-pdf-converter
echo 2. 点击 Settings 选项卡
echo 3. 滚动到 Pages 部分
echo 4. Source 选择 "Deploy from a branch"
echo 5. Branch 选择 "main" 和 "/ (root)"
echo 6. 点击 Save
echo.
echo 几分钟后你的网站将在以下地址可用:
echo https://%username%.github.io/image-to-pdf-converter
echo ========================================

pause