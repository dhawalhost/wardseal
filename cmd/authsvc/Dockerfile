# Dockerfile for authsvc
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
COPY internal/ internal/
COPY pkg/ pkg/
COPY cmd/authsvc cmd/authsvc/

RUN go mod download

RUN go build -o /authsvc ./cmd/authsvc

FROM alpine:latest

WORKDIR /

COPY --from=builder /authsvc /authsvc

EXPOSE 8080

ENTRYPOINT ["/authsvc"]
