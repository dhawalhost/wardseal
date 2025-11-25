# Dockerfile for policysvc
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . .

RUN go build -o /policysvc ./cmd/policysvc

FROM alpine:latest

WORKDIR /

COPY --from=builder /policysvc /policysvc

EXPOSE 8083

ENTRYPOINT ["/policysvc"]
