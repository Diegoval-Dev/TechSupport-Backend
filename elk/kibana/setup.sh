#!/bin/sh
set -e

wait_for() {
  until curl -sf "$1" > /dev/null; do
    echo "waiting for $1"
    sleep 3
  done
}

wait_for "$ELASTICSEARCH_URL/_cluster/health"
echo "Installing index template"
curl -sf -X PUT "$ELASTICSEARCH_URL/_index_template/techsupport-logs" \
  -H 'Content-Type: application/json' \
  --data-binary @/setup/index-template.json

wait_for "$KIBANA_URL/api/status"
echo "Importing dashboard"
curl -sf -X POST "$KIBANA_URL/api/saved_objects/_import?overwrite=true" \
  -H 'kbn-xsrf: true' \
  --form file=@/setup/dashboard.ndjson
echo "Setup done"
