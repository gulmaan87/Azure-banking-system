FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy application source
COPY src ./src

# Expose port
EXPOSE 3001

# Start the application
CMD [ "npm", "start" ]
