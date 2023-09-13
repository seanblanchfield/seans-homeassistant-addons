#!/usr/bin/with-contenv bashio

CONFIG_PATH=/data/options.json

export API_KEY="$(bashio::config 'api_key')"
export LOG_LEVEL="$(bashio::config 'log_level')"
export FILTER_STOPS="$(bashio::config 'filter_stops')"

/app/entrypoint.sh
