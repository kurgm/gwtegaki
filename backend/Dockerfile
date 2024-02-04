FROM node:lts-slim

WORKDIR /app

COPY package.json package*.json ./
RUN npm install --only=production

COPY . ./

EXPOSE 8080

CMD ["npm", "start"]
