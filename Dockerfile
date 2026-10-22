# 1. Use the official lightweight Node.js 22 Alpine image (only ~50MB!)
FROM node:22-alpine

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy package files first to cache dependencies efficiently
COPY package*.json ./

# 4. Install ONLY production dependencies (No nodemon, no dev tools!)
RUN npm ci --only=production

# 5. Copy the rest of your backend source code
COPY . .

# 6. Expose the port your server listens on
EXPOSE 5000

# 7. Start the server using pure Node.js (Production Standard)
CMD ["node", "src/server.js"]