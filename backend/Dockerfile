FROM node:16-slim

RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package*.json ./
RUN npm install --only=production

COPY . ./

EXPOSE 8080

CMD ["npm", "start"]
