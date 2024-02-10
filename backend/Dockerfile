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

FROM node:16-bullseye-slim AS release

RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  ca-certificates \
  gnupg \
  tini \
  && echo "deb https://packages.cloud.google.com/apt gcsfuse-bullseye main" | \
  tee /etc/apt/sources.list.d/gcsfuse.list \
  && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | \
  apt-key add - \
  && apt-get update && apt-get install -y --no-install-recommends \
  gcsfuse \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

ENV GCS_MNT_DIR /mnt/gcs

WORKDIR /app
COPY . ./
COPY --from=build /app/node_modules ./node_modules

EXPOSE 8080

ENTRYPOINT ["/usr/bin/tini", "--"]

CMD ["/app/bin/run.sh"]
