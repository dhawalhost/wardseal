# Dockerfile for govsvc
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

RUN go build -o /govsvc ./cmd/govsvc

FROM alpine:latest

WORKDIR /

COPY --from=builder /govsvc /govsvc

EXPOSE 8082

ENTRYPOINT ["/govsvc"]
