#!/usr/bin/with-contenv bashio

CONFIG_PATH=/data/options.json

PRIMARY_API_KEY="$(bashio::config 'primary_api_key')"
SECONDARY_API_KEY="$(bashio::config 'secondary_api_key')"
STOP_1_ID="$(bashio::config 'stop_1_id')"
STOP_2_ID="$(bashio::config 'stop_2_id')"
STOP_3_ID="$(bashio::config 'stop_3_id')"
STOP_4_ID="$(bashio::config 'stop_4_id')"

longstopid() {
  cat GTFS_Realtime/stops.txt | cut -f1-2 -d, | grep ,$1$ | cut -f1 -d,
}

STOP_IDS=$(echo $(longstopid $STOP_1_ID),$(longstopid $STOP_2_ID),$(longstopid $STOP_3_ID),$(longstopid $STOP_4_ID) | sed s/,,//g | sed s/^,//)

cat << EOF > config.ini
[NTA]
  PrimaryApiKey = $PRIMARY_API_KEY
  SecondaryApiKey = $SECONDARY_API_KEY

[Upcoming]
  InterestingStopIds = $STOP_IDS
EOF

cat config.ini

python3 main.py --config=config.ini --env=prod --port=6824 --gtfs=GTFS_Realtime
