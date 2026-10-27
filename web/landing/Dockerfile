# Build context: web/ (npm workspaces root)
#   docker build -f landing/Dockerfile -t wardseal-landingui .
FROM node:22.14-alpine3.21 AS builder
WORKDIR /workspace

# Stub all workspace package.json files so npm ci can resolve the lockfile
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
COPY landing ./landing

WORKDIR /workspace/landing
ARG VITE_ENVIRONMENT=production
ARG VITE_SITE_BASE_URL=https://wardseal.com
ARG VITE_CONSOLE_BASE_URL=https://manage.wardseal.com
ARG VITE_SUPPORT_EMAIL=support@wardseal.com

ENV VITE_ENVIRONMENT=$VITE_ENVIRONMENT
ENV VITE_SITE_BASE_URL=$VITE_SITE_BASE_URL
ENV VITE_CONSOLE_BASE_URL=$VITE_CONSOLE_BASE_URL
ENV VITE_SUPPORT_EMAIL=$VITE_SUPPORT_EMAIL

RUN npm run build --workspace=wardseal-landing

FROM nginx:1.27.4-alpine3.21
LABEL org.opencontainers.image.source="https://github.com/dhawalhost/wardseal"
LABEL org.opencontainers.image.description="WardSeal Marketing Landing Page"
LABEL org.opencontainers.image.licenses="Apache-2.0"

COPY landing/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/landing/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
