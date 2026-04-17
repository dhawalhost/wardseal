# Dockerfile for policysvc
FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY internal/ internal/
COPY pkg/ pkg/
COPY cmd/ cmd/

RUN go build -o /policysvc ./cmd/policysvc

FROM alpine:latest

WORKDIR /

COPY --from=builder /policysvc /policysvc

EXPOSE 8083

ENTRYPOINT ["/policysvc"]
