FROM node:18-alpine

WORKDIR /app

# Copy package files dulu biar cache layer optimal
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy sisa source code
COPY . .

# Expose port default Vite
EXPOSE 5173

# Jalankan server development dengan host 0.0.0.0 agar bisa diakses dari luar container
CMD ["npm", "run", "dev", "--", "--host"]