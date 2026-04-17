# Dockerfile for dirsvc
FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY internal/ internal/
COPY pkg/ pkg/
COPY cmd/ cmd/

RUN go build -o /dirsvc ./cmd/dirsvc

FROM alpine:latest

WORKDIR /

COPY --from=builder /dirsvc /dirsvc

EXPOSE 8081

ENTRYPOINT ["/dirsvc"]