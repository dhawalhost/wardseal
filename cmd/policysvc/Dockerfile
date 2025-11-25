# Dockerfile for policysvc
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
COPY internal/ internal/
COPY pkg/ pkg/
COPY cmd/policysvc cmd/policysvc/

RUN go mod download

RUN go build -o /policysvc ./cmd/policysvc

FROM alpine:latest

WORKDIR /

COPY --from=builder /policysvc /policysvc

EXPOSE 8083

ENTRYPOINT ["/policysvc"]