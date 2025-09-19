@echo off
chcp 65001 >nul
echo ========================================
echo 🌐 自定义域名配置工具
echo ========================================
echo.

echo 请选择你要使用的域名类型:
echo 1. 我已经有域名了
echo 2. 我要申请 Freenom 免费域名 (.tk/.ml/.ga/.cf)
echo 3. 我要申请 is-a.dev 免费子域名
echo 4. 查看域名配置指南
echo.

set /p choice=请输入选择 (1-4): 

if "%choice%"=="1" goto existing_domain
if "%choice%"=="2" goto freenom_guide  
if "%choice%"=="3" goto isadev_guide
if "%choice%"=="4" goto show_guide
goto invalid_choice

:existing_domain
echo.
echo 请输入你的域名 (例如: mysite.com):
set /p domain=

echo 正在创建 CNAME 文件...
echo %domain% > CNAME

echo 正在提交更改到 GitHub...
git add CNAME
git commit -m "添加自定义域名: %domain%"
git push origin main

echo.
echo ✅ CNAME 文件已创建并推送到 GitHub!
echo.
echo 📋 接下来请完成以下步骤:
echo 1. 在域名管理面板配置 DNS 记录
echo 2. 进入 GitHub 仓库 Settings → Pages
echo 3. 在 Custom domain 输入: %domain%
echo 4. 勾选 Enforce HTTPS
echo 5. 等待 DNS 生效 (最多24小时)
echo.
echo 🌐 配置完成后访问: https://%domain%
goto end

:freenom_guide
echo.
echo 🆓 Freenom 免费域名申请指南:
echo.
echo 1. 访问: https://www.freenom.com
echo 2. 搜索你想要的域名前缀
echo 3. 选择 .tk/.ml/.ga/.cf 后缀 (显示 FREE)
echo 4. 注册账号并完成申请
echo 5. 在域名管理中配置 DNS 记录
echo.
echo 📖 详细步骤请查看: 域名配置指南.md
echo.
start https://www.freenom.com
goto end

:isadev_guide  
echo.
echo 🔧 is-a.dev 免费子域名申请:
echo.
echo 1. 访问: https://github.com/is-a-dev/register
echo 2. Fork 该仓库
echo 3. 创建域名申请文件
echo 4. 提交 Pull Request
echo 5. 等待审核通过
echo.
echo 📖 详细步骤请查看: 域名配置指南.md
echo.
start https://github.com/is-a-dev/register
goto end

:show_guide
echo.
echo 📖 正在打开域名配置指南...
start 域名配置指南.md
goto end

:invalid_choice
echo.
echo ❌ 无效选择，请重新运行脚本
goto end

:end
echo.
echo ========================================
pause