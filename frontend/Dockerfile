#stage 1 build
FROM node:18-alpine AS builder

WORKDIR /app

COPY app/package*.json ./
RUN npm install

COPY app/ .
RUN npm run build


#stage 2 run
FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy template to the official templates directory
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
 
CMD ["nginx", "-g", "daemon off;"]

