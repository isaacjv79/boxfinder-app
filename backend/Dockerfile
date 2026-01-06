FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (including dev for build)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built files and prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Copy start script
COPY start.sh ./
RUN chmod +x start.sh

# Generate Prisma client in production
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Start with migrations
CMD ["./start.sh"]
