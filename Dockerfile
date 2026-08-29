# =============================================================================
# 8888 Augusta — operator console image
#
# Build:
#   docker build -t 8888augusta/dashboard:1.0.0\
#     --build-arg APP_VERSION=1.0.1 \
#     --build-arg GIT_SHA=$(git rev-parse --short HEAD) .
#
# =============================================================================

# --- Build stage -------------------------------------------------------------
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --os=linux --cpu=x64

COPY . .

ARG VITE_API_BASE_URL=""
ARG APP_VERSION=0.0.0-dev
ARG GIT_SHA=unknown
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_APP_VERSION=${APP_VERSION} \
    VITE_GIT_SHA=${GIT_SHA}

RUN npm run build

# --- Runtime stage -----------------------------------------------------------
FROM nginx:1.27-alpine

RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf.template /etc/nginx/templates/app.conf.template

ENV API_ORIGIN=http://api:8000
ENV API_HOST=api

COPY --from=builder /app/dist /usr/share/nginx/html

ARG APP_VERSION=0.0.0-dev
ARG GIT_SHA=unknown
RUN printf '{"version":"%s","commit":"%s"}\n' "$APP_VERSION" "$GIT_SHA" \
    > /usr/share/nginx/html/version.json

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=4s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/version.json >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]