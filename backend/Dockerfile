FROM node:18-alpine

# 🔐 Force security updates (THIS IS THE KEY LINE)
RUN apk update && apk upgrade --no-cache

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5003

CMD ["node", "wrong.js"]
