# 静态部署说明 / Static Deployment Guide

## 📦 生成的文件 / Generated Files

静态文件已生成在 `out` 目录中：
Static files have been generated in the `out` directory:

```
private-voting-dao-frontend/out/
├── _next/              # Next.js 构建产物
├── index.html          # 主页面
├── _headers            # 服务器请求头配置（用于 FHEVM）
└── ...                 # 其他静态资源
```

## 🚀 部署方式 / Deployment Methods

### 1. Netlify（推荐 / Recommended）

```bash
# 安装 Netlify CLI
npm install -g netlify-cli

# 部署
netlify deploy --dir=out --prod

# 或者拖拽 out 文件夹到 netlify.com
```

### 2. Vercel

```bash
# 安装 Vercel CLI
npm install -g vercel

# 部署
vercel --prod

# Vercel 会自动检测 output: 'export'
```

### 3. GitHub Pages

```bash
git add out
git commit -m "Add static export"
git subtree push --prefix private-voting-dao-frontend/out origin gh-pages
```

### 4. 传统服务器 / Traditional Server

使用 Nginx/Apache 提供静态文件服务：

```nginx
server {
    listen 80;
    server_name example.com;
    root /path/to/out;
    
    # FHEVM 必需的请求头
    add_header Cross-Origin-Opener-Policy "same-origin";
    add_header Cross-Origin-Embedder-Policy "require-corp";
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## ⚙️ 重要配置 / Important Configuration

### FHEVM 请求头配置

由于 Next.js 的静态导出不支持 `headers()` 配置，已在 `out/_headers` 文件中添加了必要的请求头。

如果使用 Netlify，该文件会自动生效。对于其他平台，请在服务器配置中添加：

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## 📝 注意事项 / Notes

1. ✅ 所有文件都已打包为静态文件
2. ✅ FHEVM SDK 将通过 CDN 加载
3. ✅ 支持连接到 Sepolia 测试网
4. ✅ 使用 MetaMask 钱包连接

## 🔗 合约地址 / Contract Address

- **Sepolia**: `0x39365615dBF518746Ae9e0e470707AF9CD813beF`
- **Localhost**: `0x673B3b40fc67b78ef9CB5d95b902Ea6c4531212A`

## 📦 文件大小 / File Size

- 总大小: **1.6 MB**
- 文件数: **34 个**
- 已优化: ✅

