#!/usr/bin/with-contenv bashio

CONFIG_PATH=/data/options.json

export API_KEY="$(bashio::config 'api_key')"
export LOG_LEVEL="$(bashio::config 'log_level')"
export FILTER_STOPS="$(bashio::config 'stops')"

# Create a function to periodically poll the API and update the sensor
update_sensors() {
    while ! nc -z localhost 7341 ; do
        bashio::log.info "Waiting 10 seconds for GTFS server to start up..."
        sleep 10
    done
    bashio::log.info "Server has started, starting sensor update loop..."
    while true; do
        # loop through the comma-delimited list of SENSOR_STOPS
        bashio::log.info "Info stops ${FILTER_STOPS}"
        for stop in ${FILTER_STOPS//,/ }; do 
            bashio::log.info "Querying $stop"
            py_cmd="import sys, json; attrs = json.load(sys.stdin).get('$stop', {}); print(json.dumps(dict(state='OK', attributes=attrs)))"
            json=$(curl -s http://localhost:7341/api/v1/arrivals?stop=$stop | python3 -c "$py_cmd")
            curl -s -H "Authorization: Bearer $SUPERVISOR_TOKEN" -H "Content-Type: application/json" -d "$json" http://supervisor/core/api/states/sensor.tfi_gtfs_stop_$stop > /dev/null
            bashio::log.info "Updated sensor.tfi_gtfs_stop_$stop"
        done 
        sleep 30
    done
}

update_sensors &

source /app/venv/bin/activate
bashio::log.info Starting GTFS server...
/app/entrypoint.sh
