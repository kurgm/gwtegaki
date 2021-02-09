FROM golang:1.15-buster AS builder

ARG NGT_TAG=v1.12.3

WORKDIR /home

RUN apt-get update && \
  apt-get install -y build-essential wget unzip cmake && \
  wget -q -O - https://deb.nodesource.com/setup_lts.x | bash - && \
  apt-get install -y nodejs && \
  wget -q -O ngt.zip https://github.com/yahoojapan/NGT/archive/$NGT_TAG.zip && \
  unzip ./ngt.zip && rm ./ngt.zip && \
  cd NGT-* && mkdir build && cd build && \
  cmake -DNGT_SHARED_MEMORY_ALLOCATOR=ON .. && \
  make && make install && ldconfig /usr/local/lib

WORKDIR /app/backend
COPY ./backend/go.mod /app/backend/go.mod
RUN go mod download
COPY ./backend /app/backend
RUN go build -mod=readonly -v -ldflags='-s -w' -o server

WORKDIR /app/model
COPY ./model /app/model
RUN npm ci && make

FROM gcr.io/distroless/cc-debian10
COPY --from=builder /app/backend/server /app/server
COPY --from=builder /usr/local/lib/libngt.so* /usr/local/lib/
COPY --from=builder /app/model/names.txt /app/names.txt
COPY --from=builder /app/model/anng /app/anng

ENV LD_LIBRARY_PATH="/usr/local/lib"
ENV HWR_INDEX_PATH="/app"
CMD ["/app/server"]
