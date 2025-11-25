# Dockerfile for dirsvc
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . .

RUN go build -o /dirsvc ./cmd/dirsvc

FROM alpine:latest

WORKDIR /

COPY --from=builder /dirsvc /dirsvc

EXPOSE 8081

ENTRYPOINT ["/dirsvc"]