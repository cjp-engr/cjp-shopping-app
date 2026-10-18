#!/usr/bin/env bash
# Ephemeral, loopback-only replica set for transaction integration tests. No volumes or credentials.
set -euo pipefail

container="${TEST_MONGO_CONTAINER:-tokomart-integration-mongo}"
port="${TEST_MONGO_PORT:-27017}"
if [[ ! "$port" =~ ^[0-9]+$ ]] || (( port < 1024 || port > 65535 )); then
  echo 'TEST_MONGO_PORT must be a port between 1024 and 65535' >&2
  exit 1
fi

docker run --detach --name "$container" \
  --publish "127.0.0.1:${port}:${port}" \
  mongo:8.0 --replSet rs0 --bind_ip_all --port "$port"

mongo() {
  docker exec "$container" mongosh "mongodb://127.0.0.1:${port}/?directConnection=true&serverSelectionTimeoutMS=1000&connectTimeoutMS=1000" --quiet --eval "$1"
}
ready=false
for attempt in {1..30}; do
  if mongo 'quit(db.adminCommand({ping:1}).ok ? 0 : 1)' >/dev/null 2>&1; then ready=true; break; fi
  sleep 2
done
if [[ "$ready" != true ]]; then
  docker logs "$container"
  echo 'MongoDB did not start after 30 readiness checks' >&2
  exit 1
fi

mongo "rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:${port}'}]})"
for attempt in {1..30}; do
  if mongo 'quit(db.hello().isWritablePrimary ? 0 : 1)' >/dev/null 2>&1; then
    echo "Replica set ready at mongodb://127.0.0.1:${port}/tokomart_payment_test?replicaSet=rs0"
    exit 0
  fi
  sleep 2
done
docker logs "$container"
echo 'MongoDB did not elect a primary after 30 readiness checks' >&2
exit 1
