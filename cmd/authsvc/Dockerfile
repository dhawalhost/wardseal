# Dockerfile for authsvc
FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY internal/ internal/
COPY pkg/ pkg/
COPY cmd/ cmd/

RUN go build -o /authsvc ./cmd/authsvc

FROM alpine:latest

WORKDIR /

COPY --from=builder /authsvc /authsvc

EXPOSE 8080

ENTRYPOINT ["/authsvc"]