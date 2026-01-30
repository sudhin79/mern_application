FROM node:18-alpine
RUN apk update && apk upgrade
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY server.js .
EXPOSE 5003
ENTRYPOINT ["node"]
CMD ["server.js"]
