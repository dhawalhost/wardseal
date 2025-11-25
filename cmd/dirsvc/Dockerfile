# Dockerfile for dirsvc
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
COPY internal/ internal/
COPY pkg/ pkg/
COPY cmd/dirsvc cmd/dirsvc/

RUN go mod download

RUN go build -o /dirsvc ./cmd/dirsvc

FROM alpine:latest

WORKDIR /

COPY --from=builder /dirsvc /dirsvc

EXPOSE 8081

ENTRYPOINT ["/dirsvc"]
