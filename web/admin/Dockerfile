# Build context: web/ (npm workspaces root)
#   docker build -f admin/Dockerfile -t wardseal-adminui .
FROM node:22.14-alpine3.21 AS builder
WORKDIR /workspace

# Stub all workspace package.json files so npm ci can resolve the lockfile,
# then copy only the sources we need to build.
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
COPY admin ./admin

WORKDIR /workspace/admin
ARG VITE_AUTHSVC_URL=http://manage.wardseal.local
ARG VITE_DIRSVC_URL=http://manage.wardseal.local
ARG VITE_GOVSVC_URL=http://manage.wardseal.local
ARG VITE_API_URL=http://manage.wardseal.local
ARG VITE_ID_URL=http://id.wardseal.local
ARG VITE_ALLOWED_REDIRECT_ORIGINS=http://manage.wardseal.local,http://id.wardseal.local,http://auth.wardseal.local,http://wardseal.local
ARG VITE_APP_MODE=saas
ENV VITE_AUTHSVC_URL=$VITE_AUTHSVC_URL
ENV VITE_DIRSVC_URL=$VITE_DIRSVC_URL
ENV VITE_GOVSVC_URL=$VITE_GOVSVC_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ID_URL=$VITE_ID_URL
ENV VITE_ALLOWED_REDIRECT_ORIGINS=$VITE_ALLOWED_REDIRECT_ORIGINS
ENV VITE_APP_MODE=$VITE_APP_MODE
RUN npm run build --workspace=wardseal-admin

FROM nginx:1.27.4-alpine3.21
LABEL org.opencontainers.image.source="https://github.com/dhawalhost/wardseal"
LABEL org.opencontainers.image.description="WardSeal Admin Management Console"
LABEL org.opencontainers.image.licenses="Apache-2.0"
COPY admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/admin/dist /usr/share/nginx/html
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:80/ || exit 1
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
