# Use the official Node.js image as the base
FROM node:22

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the project
RUN npm run build

# Expose the Vite default port (5173) and ngrok (4040)
EXPOSE 3000 

# Run the ngrok-server-start script
CMD ["npm", "run", "dev"]
