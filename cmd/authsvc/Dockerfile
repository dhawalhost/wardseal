# Dockerfile for authsvc
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . .

RUN go build -o /authsvc ./cmd/authsvc

FROM alpine:latest

WORKDIR /

COPY --from=builder /authsvc /authsvc

EXPOSE 8080

ENTRYPOINT ["/authsvc"]