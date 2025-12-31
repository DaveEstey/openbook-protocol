FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY src ./src

# Build TypeScript
RUN npm run build

# Expose API port
EXPOSE 3001

# Start server
CMD ["npm", "start"]
