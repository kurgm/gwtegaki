FROM node:16-bullseye-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  make \
  g++ \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package*.json ./
RUN npm install --omit=dev \
  && npm cache clean --force

FROM gcr.io/distroless/nodejs16-debian11 AS release

WORKDIR /app
COPY . ./
COPY --from=build /app/node_modules ./node_modules

EXPOSE 8080

CMD ["node_modules/.bin/functions-framework", "--target=hwrSearch"]