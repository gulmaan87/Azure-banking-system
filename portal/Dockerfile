# ── Stage 1: Build React/Vite application ────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Declare ARGs for build-time environment variables
ARG VITE_AZURE_TENANT_ID
ARG VITE_AZURE_CLIENT_ID
ARG VITE_AZURE_API_CLIENT_ID
ARG VITE_GROUP_BANK_ADMINS
ARG VITE_GROUP_SECURITY_AUDITORS
ARG VITE_GROUP_APP_DEVELOPERS
ARG VITE_GROUP_DATA_ENGINEERS
ARG VITE_API_URL

# Expose ARGs as ENVs so Vite picks them up during build
ENV VITE_AZURE_TENANT_ID=$VITE_AZURE_TENANT_ID
ENV VITE_AZURE_CLIENT_ID=$VITE_AZURE_CLIENT_ID
ENV VITE_AZURE_API_CLIENT_ID=$VITE_AZURE_API_CLIENT_ID
ENV VITE_GROUP_BANK_ADMINS=$VITE_GROUP_BANK_ADMINS
ENV VITE_GROUP_SECURITY_AUDITORS=$VITE_GROUP_SECURITY_AUDITORS
ENV VITE_GROUP_APP_DEVELOPERS=$VITE_GROUP_APP_DEVELOPERS
ENV VITE_GROUP_DATA_ENGINEERS=$VITE_GROUP_DATA_ENGINEERS
ENV VITE_API_URL=$VITE_API_URL

# Copy package definitions and install all dependencies
COPY package*.json ./
RUN npm ci

# Copy application source and build
COPY . .
RUN npm run build

# ── Stage 2: Serve the compiled static files with Nginx ──────
FROM nginx:alpine

# Copy built assets from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration for client-side routing support
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose standard HTTP port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
