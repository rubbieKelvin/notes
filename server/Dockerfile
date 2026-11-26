FROM rust:1-bookworm AS build
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src src
COPY migrations migrations
RUN cargo build --release --locked

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/target/release/server /usr/local/bin/opennotes-server
COPY --from=build /app/target/release/opennotes /usr/local/bin/opennotes
USER nobody
ENV BIND=0.0.0.0:8080
EXPOSE 8080
CMD ["opennotes-server"]
