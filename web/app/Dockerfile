# Build context: web/ (npm workspaces root)
#   docker build -f app/Dockerfile -t wardseal-appui .
FROM node:22.14-alpine3.21 AS builder
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY ui/package.json ./ui/
COPY admin/package.json ./admin/
COPY app/package.json ./app/
COPY developer/package.json ./developer/
COPY id/package.json ./id/
COPY landing/package.json ./landing/
COPY status/package.json ./status/
RUN npm ci --legacy-peer-deps

COPY shared ./shared
COPY ui ./ui
COPY app ./app

WORKDIR /workspace/app
ARG VITE_API_URL
ARG VITE_AUTHSVC_URL
ARG VITE_DIRSVC_URL
ARG VITE_GOVSVC_URL
ARG VITE_ID_URL
ARG VITE_AUTH_URL
ARG VITE_ALLOWED_REDIRECT_ORIGINS
ARG VITE_APP_MODE=selfhost
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AUTHSVC_URL=$VITE_AUTHSVC_URL
ENV VITE_DIRSVC_URL=$VITE_DIRSVC_URL
ENV VITE_GOVSVC_URL=$VITE_GOVSVC_URL
ENV VITE_ID_URL=$VITE_ID_URL
ENV VITE_AUTH_URL=$VITE_AUTH_URL
ENV VITE_ALLOWED_REDIRECT_ORIGINS=$VITE_ALLOWED_REDIRECT_ORIGINS
ENV VITE_APP_MODE=$VITE_APP_MODE
RUN npm run build --workspace=wardseal-app

FROM nginx:1.27.4-alpine3.21
LABEL org.opencontainers.image.source="https://github.com/dhawalhost/wardseal"
LABEL org.opencontainers.image.description="WardSeal User App Portal"
LABEL org.opencontainers.image.licenses="Apache-2.0"
COPY app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/app/dist /usr/share/nginx/html
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:80/ || exit 1
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
