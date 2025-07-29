FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --production=false
RUN cd frontend && npm ci --production=false

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose ports
EXPOSE 7130 7131

# Start the application
CMD ["npm", "start"]