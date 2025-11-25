# Dockerfile for govsvc
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . .

RUN go build -o /govsvc ./cmd/govsvc

FROM alpine:latest

WORKDIR /

COPY --from=builder /govsvc /govsvc

EXPOSE 8082

ENTRYPOINT ["/govsvc"]
