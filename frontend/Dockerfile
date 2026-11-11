# ── ScholarSetu AI – Frontend Production Dockerfile (multi-stage) ─────────────

# Stage 1: Build the React app
FROM node:20-alpine AS builder

LABEL maintainer="nireekshithkumar"
LABEL project="ScholarSetu AI"

WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .

# Accept the backend URL at build time (override with --build-arg)
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Serve via nginx
FROM nginx:1.27-alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing: all unknown paths → index.html
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
