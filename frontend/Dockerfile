# Stage 1: Build the app
FROM node:22-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./

RUN npm ci 

COPY . .

RUN npm run build

#----------------------------------
# Stage 2: Serve the app with nginx

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]