# Dockerfile for govsvc
FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY internal/ internal/
COPY pkg/ pkg/
COPY cmd/ cmd/

RUN go build -o /govsvc ./cmd/govsvc

FROM alpine:latest

WORKDIR /

COPY --from=builder /govsvc /govsvc

EXPOSE 8082

ENTRYPOINT ["/govsvc"]
