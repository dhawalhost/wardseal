# Dockerfile for govsvc
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
COPY internal/ internal/
COPY pkg/ pkg/
COPY cmd/govsvc cmd/govsvc/

RUN go mod download

RUN go build -o /govsvc ./cmd/govsvc

FROM alpine:latest

WORKDIR /

COPY --from=builder /govsvc /govsvc

EXPOSE 8082

ENTRYPOINT ["/govsvc"]