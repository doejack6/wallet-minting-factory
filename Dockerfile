
FROM node:20-alpine as build

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci

# Copy rest of the application code
COPY . .

# Build the application with environment variables
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# 添加环境变量，用于传递服务器配置
ARG SERVER_CPU_CORES
ARG SERVER_MEMORY_MB
ENV SERVER_CPU_CORES=${SERVER_CPU_CORES:-16}
ENV SERVER_MEMORY_MB=${SERVER_MEMORY_MB:-32768}

# 运行环境检查脚本 - 使用node执行而不是直接执行
RUN chmod +x ./prebuild.js
RUN node ./prebuild.js

# 注入服务器信息到前端
RUN echo "// 服务器配置信息 - 构建于 $(date)" > ./public/server-config.js
RUN echo "window.SERVER_CPU_CORES = '${SERVER_CPU_CORES:-16}';" >> ./public/server-config.js
RUN echo "window.SERVER_MEMORY_MB = '${SERVER_MEMORY_MB:-32768}';" >> ./public/server-config.js
RUN echo "console.log('服务器配置加载完成 - CPU核心:', window.SERVER_CPU_CORES, '内存:', window.SERVER_MEMORY_MB + 'MB');" >> ./public/server-config.js

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine as production

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create a volume for persistent data
VOLUME /data

# Expose port
EXPOSE 80

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
