#!/bin/sh
set -e

wait_for() {
  until curl -sf "$1" > /dev/null; do
    echo "waiting for $1"
    sleep 3
  done
}

import_ndjson() {
  echo "Importing $1"
  RESP=$(curl -sS -X POST "$KIBANA_URL/api/saved_objects/_import?overwrite=true" \
    -H 'kbn-xsrf: true' \
    --form file=@"$1")
  echo "$RESP"
  case "$RESP" in
    *'"success":true'*) ;;
    *) echo "ERROR: Kibana import of $1 failed"; exit 1 ;;
  esac
}

wait_for "$ELASTICSEARCH_URL/_cluster/health"
echo "Installing index template"
curl -sf -X PUT "$ELASTICSEARCH_URL/_index_template/techsupport-logs" \
  -H 'Content-Type: application/json' \
  --data-binary @/setup/index-template.json
echo
# Create today's daily index (UTC) so the data view sees the template fields
# before Filebeat ships the first line. 400 means it already exists.
TODAY_INDEX="logs-techsupport-api-$(date -u +%Y.%m.%d)"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$ELASTICSEARCH_URL/$TODAY_INDEX")
echo "Index $TODAY_INDEX: HTTP $CODE"
case "$CODE" in 200|400) ;; *) echo "ERROR: could not create $TODAY_INDEX"; exit 1 ;; esac

wait_for "$KIBANA_URL/api/status"
import_ndjson /setup/dashboard.ndjson

echo "Applying Kibana advanced settings"
curl -sf -X POST "$KIBANA_URL/api/kibana/settings" \
  -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  --data '{"changes":{"dateFormat:tz":"America/Guatemala","defaultIndex":"techsupport-logs","courier:ignoreFilterIfFieldNotInIndex":true,"dateFormat":"DD/MM/YYYY HH:mm:ss"}}'
echo
echo "Setup done"
