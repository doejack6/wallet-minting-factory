
# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/42500577-b37a-482d-9d9c-730f309906e1

## Docker 完整部署指南

### 先决条件
- 安装 Docker
- 安装 Docker Compose

### 快速部署步骤

1. 克隆仓库
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. 构建并启动容器
```bash
docker-compose up -d --build
```

### 数据持久化

系统自动配置了数据持久化：
- 钱包数据存储在 Docker 卷 `wallet-data` 中
- 日志文件保存在 `./logs` 目录

### 环境变量配置

可以通过 `.env` 文件或在 `docker-compose` 命令中设置以下环境变量：
```
VITE_API_URL=/api           # API 服务器地址
SERVER_CPU_CORES=16         # 服务器CPU核心数
SERVER_MEMORY_MB=32768      # 服务器内存 (MB)
```

#### 高性能服务器配置
如果您在高性能服务器上运行，可以使用以下命令指定服务器资源：

```bash
SERVER_CPU_CORES=16 SERVER_MEMORY_MB=32768 docker-compose up -d --build
```

或创建 `.env` 文件：
```
SERVER_CPU_CORES=16
SERVER_MEMORY_MB=32768
```

### Docker 命令

- 启动容器: `docker-compose up -d`
- 停止容器: `docker-compose down`
- 查看运行中的容器: `docker-compose ps`
- 查看容器日志: `docker-compose logs wallet-factory`
- 进入容器: `docker-compose exec wallet-factory sh`

### 配置说明

- 默认端口: 80
- 服务名称: wallet-factory
- 数据卷: wallet-data
- 容器重启策略: always

### 性能优化

- Nginx 配置已优化静态资源缓存
- IndexedDB 数据自动持久化到 Docker 卷
- 多阶段构建减小镜像体积
- 使用轻量级 Alpine Linux 镜像
- 支持手动配置服务器资源以优化性能

### 扩展配置

如需连接额外的后端 API 服务，请取消注释 nginx.conf 文件中的 API 代理配置部分，并确保在同一 Docker 网络中运行 API 服务。

### 故障排查

如遇到问题，请检查:
- Docker 版本是否兼容
- 端口 80 是否被占用
- 数据卷权限是否正确
- 网络连接是否正常

## 其他部署方式

- Use Lovable

Simply visit the [Lovable Project](https://lovable.dev/projects/42500577-b37a-482d-9d9c-730f309906e1) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

- Use your preferred IDE

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

- Edit a file directly in GitHub

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

- Use GitHub Codespaces

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/42500577-b37a-482d-9d9c-730f309906e1) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
