FROM node:alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY src/backend/package*.json ./
RUN npm install

# Copy backend source code
COPY src/backend/server.js ./
# Copy service account if it exists (Optional, Docker will ignore if missing due to .dockerignore or we can just try to copy it if we ensure it exists, but COPY fails if file doesn't exist. So we can use a wildcard)
COPY src/backend/serviceAccountKey.jso[n] ./

EXPOSE 3000

CMD ["npm", "start"]
