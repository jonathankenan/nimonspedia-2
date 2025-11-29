FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Expose ports
EXPOSE 3000 3001

# Start the application
CMD ["npm", "start"]
