# Stage 1: Build the app
FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:8000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

#----------------------------------
# Stage 2: Serve the app with nginx

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
