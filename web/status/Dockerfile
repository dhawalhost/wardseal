# Build context: web/ (npm workspaces root)
#   docker build -f status/Dockerfile -t wardseal-statusui .
FROM node:20-alpine AS build
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
COPY status ./status

WORKDIR /workspace/status
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
RUN npm run build --workspace=wardseal-status

FROM nginx:alpine
COPY status/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/status/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
