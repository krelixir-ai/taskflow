FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 8080
ENV BACKEND_URL=https://taskflow-backend-nhuil2a55q-uc.a.run.app
# Only substitute BACKEND_URL — preserve nginx's $uri, $host, etc.
ENV NGINX_ENVSUBST_FILTER=^BACKEND_URL$
CMD ["nginx", "-g", "daemon off;"]
