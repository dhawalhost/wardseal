# Dockerfile for dirsvc
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install git for go mod tidy
RUN apk add --no-cache git

COPY go.mod go.sum ./
COPY internal/ internal/
COPY pkg/ pkg/
COPY cmd/ cmd/

RUN go mod tidy
RUN go mod download

RUN go build -o /dirsvc ./cmd/dirsvc

FROM alpine:latest

WORKDIR /

COPY --from=builder /dirsvc /dirsvc

EXPOSE 8081

ENTRYPOINT ["/dirsvc"]