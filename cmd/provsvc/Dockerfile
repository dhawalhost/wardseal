# Dockerfile for provsvc
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . .

RUN go build -o /provsvc ./cmd/provsvc

FROM alpine:latest

WORKDIR /

COPY --from=builder /provsvc /provsvc

EXPOSE 8084

ENTRYPOINT ["/provsvc"]
