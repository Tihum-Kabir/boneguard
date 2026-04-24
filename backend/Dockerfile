# =============================================================================
# BoneGuard Backend Dockerfile
# =============================================================================

FROM node:20-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy bonne-chatbot backend and its dependencies
COPY ../bonne-chatbot/backend/chat.js ./bonne-chat.js
COPY ../bonne-chatbot/backend/package.json ./bonne-package.json

# Install bonne-chatbot deps into same node_modules
RUN node -e "
const p = require('./bonne-package.json');
const deps = Object.keys(p.dependencies || {}).join(' ');
require('child_process').execSync('npm install ' + deps, {stdio:'inherit'});
"

# Copy vectorstore (baked into image so no volume needed)
COPY ../bonne-chatbot/data/vectorstore.json ./vectorstore.json

# Copy application code
COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
