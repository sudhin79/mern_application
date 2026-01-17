#stage 1 build
FROM node:18-alpine AS builder

WORKDIR /app

COPY app/package*.json ./
RUN npm install

COPY app/ .
RUN npm run build


#stage 2 run
FROM nginx:alpine

#remove default nginx config
RUN  rm /etc/nginx/conf.d/default.conf

#copy our custom nginx config
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

#copy built react files from builder stage 
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
 
CMD ["nginx", "-g", "daemon off;"]

