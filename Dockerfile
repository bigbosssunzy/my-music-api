FROM node:20-slim

# Install system dependencies (Python3, pip, ffmpeg)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install latest yt-dlp globally
RUN pip3 install --break-system-packages yt-dlp

# Set app directory
WORKDIR /usr/src/app

# Copy dependency configs
COPY package*.json ./

# Install npm packages
RUN npm install --production

# Copy application source
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]