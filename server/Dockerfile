# Use a Node base image
FROM node:18.20.1-slim

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the backend files
COPY . .

# Expose port (adjust if your server uses a different port)
EXPOSE 5000

# Start the server
CMD ["npm", "start"]