# Dockerfile for provsvc
FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY internal/ internal/
COPY pkg/ pkg/
COPY cmd/ cmd/

RUN go build -o /provsvc ./cmd/provsvc

FROM alpine:latest

WORKDIR /

COPY --from=builder /provsvc /provsvc

EXPOSE 8084

ENTRYPOINT ["/provsvc"]
