# Overview
This addon packages up my [Transport for Ireland GTFS REST API](https://github.com/seanblanchfield/tfi-gtfs) project, which proxies *Transport for Ireland's* GTFS-R feed into an easy-to-use REST API. This REST API can then be consumed from Home Assistant to display real-time transport info (e.g., buses that will be arriving shortly) in a Lovelace card.

See the [README](https://github.com/seanblanchfield/tfi-gtfs) file at the main project for details info on using this. 

# Configuration
To use this addon you must register a free account at https://developer.nationaltransport.ie/ to obtain API keys (you just need the "primary" key). You must set these in the configuration screen after you have this addon installed.

In addition, you can optionally specify up to four "filter stops". You specify these using the regular stop number that is normally printed on the bus stop. You can also see the stop numbers on the official interactive [Journey Planner Map](https://www.transportforireland.ie/plan-a-journey/).  If you specify these stops, memory consumption will be significantly reduced, but you will only be able to make queries about those stops.

# Consuming the REST API from Home Assistant

A custom card to display upcoming arrivals at a given stop is provided in the repository in `tfi-gtfs-card.js`.

To use it, place it in your `/config/www/` directory. The contents of this directory are served under the `/local` path by your Home Assistant instance (i.e., at `http://homeassistant.local/local/`).  To register the card, include it as a resource in one of the usual ways, as described by the [resource docs](https://developers.home-assistant.io/docs/frontend/custom-ui/registering-resources/).

```yaml
- url: /local/tfi-gtfs/tfi-gtfs-card.js
  type: module
```

Do a hard reload on your web browser (I find it useful to reload with "disable cache" checked in the dev tool Network panel). You should now see a custom "*Transport for Ireland GTFS Card*" in the *Add Card* dialog. It allows you to specify a stop number, API URL, refresh interval, and maximum number of upcoming arrivals to display.

# Disk Space Requirements

This addon requires a few hundred megabytes of disk space to run. It downloads the static GTFS zip file, which is quite large, and extracts it to the data dir. Then it processes it and stores the results in *redis*, which persists its data into a `dump.rdb` file in the data dir. The size of the *redis* file is small if you are using "filter stops", but can be over 100 megabytes if you are not filtering stops.

All this data is stored in the addon's `/data` directory, which persists across restarts. This allows restarts of this addon to be pretty quick, since *tfi-gtfs* will just reload its state from the `dump.rdb` file.

> Note: On Home Assistant OS, the `/data` dirs in addons can be found on the host at `/mnt/data/supervisor/addons/data/`.
