
FROM node:20-alpine as build

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci

# Copy rest of the application code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine as production

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
