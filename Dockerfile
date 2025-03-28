
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
ENV SERVER_CPU_CORES=${SERVER_CPU_CORES}
ENV SERVER_MEMORY_MB=${SERVER_MEMORY_MB}

# 注入服务器信息到前端
RUN echo "window.SERVER_CPU_CORES = '${SERVER_CPU_CORES}';" > ./public/server-config.js
RUN echo "window.SERVER_MEMORY_MB = '${SERVER_MEMORY_MB}';" >> ./public/server-config.js

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

CMD ["nginx", "-g", "daemon off;"]
