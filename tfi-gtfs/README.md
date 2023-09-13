# Overview
This addon packages up my [Transport for Ireland GTFS REST API](https://github.com/seanblanchfield/tfi-gtfs) project, which proxies *Transport for Ireland's* GTFS-R feed into an easy-to-use REST API. This REST API can then be consumed from Home Assistant to display real-time transport info (e.g., buses that will be arriving shortly) in a Lovelace card.

See the [README](https://github.com/seanblanchfield/tfi-gtfs) file at the main project for details info on using this. 

# Configuration
To use this addon you must register a free account at https://developer.nationaltransport.ie/ to obtain API keys (you just need the "primary" key). You must set these in the configuration screen after you have this addon installed.

In addition, you can optionally specify up to four "filter stops". You specify these using the regular stop number that is normally printed on the bus stop. You can also see the stop numbers on the official interactive [Journey Planner Map](https://www.transportforireland.ie/plan-a-journey/).  If you specify these stops, memory consumption will be significantly reduced, but you will only be able to make queries about those stops.

# Consuming the REST API from Home Assistant

There isn't currently a custom card to display the info from the API, but you can create a Markdown card that does the job.

Add a [REST sensor](https://www.home-assistant.io/integrations/sensor.rest/) to `configuration.yaml` that reads the real-time data from the Add-on (replace the stop number `1358` in the URL with a stop that you're interested in):

``` yaml
rest:
  - resource: http://localhost:7341/api/v1/arrivals?stop=1358
    scan_interval: 60
    sensor:
      name: "TFI Realtime 1358"
      unique_id: tfi_realtime_1358
      value_template: "OK"
      json_attributes:
        - "1358"
```

To show real time information in the UI for that stop, add a Markdown card like the following:

```yaml
type: markdown
title: Stop 1358 Arrivals
entity_id: sensor.tfi_realtime_1358
content: >-
  {% set stop_number="1358" %}
  {% set arrivals = state_attr('sensor.tfi_realtime_1358', stop_number)%}
  
  {% for i in range(0, min(arrivals | count, 10) ) %}
    {%- set live=False -%}
    {%- set arrival_time = arrivals[i]['scheduled_arrival'] | as_datetime | as_local -%}
    {%- if arrivals[i]['real_time_arrival'] -%}
      {%- set live=True -%}
      {%- set arrival_time = arrivals[i]['real_time_arrival'] | as_datetime | as_local -%}
    {%- endif -%}
  
    {%- set current_time=as_timestamp(now()) -%}
    {%- set secs_to_arrival=as_timestamp(arrival_time) - current_time -%}
    {%- set soon=False -%}
    {%- if  secs_to_arrival < 60*20 -%}
      {%- set soon=True -%}
      {%- set arrival_time = (secs_to_arrival // 60)|int|string + " mins" -%}
    {%- else -%}
      {%- set arrival_time = arrival_time.strftime("%H:%M") -%}
    {%- endif -%}
    
    {%- if live -%}
      {% set arrival_time = "<font color=green>" + arrival_time + "</font>" %}
    {%- endif -%}
    {{ arrivals[i]['route'] }} {% if soon %}in{% else %}at{% endif %} {{ arrival_time }}
  {% endfor %}  

```

This card highlights real-time arrivals in green. Itshows the next 10 arrivals at the stop, with those arriving in the next 20 minutes in relative time (e.g., "in 3 mins"), and later arrivals in absolute time (e.g., "at 13:42").

# Disk Space Requirements

This addon requires a few hundred megabytes of disk space to run. It downloads the static GTFS zip file, which is quite large, and extracts it to the data dir. Then it processes it and stores the results in *redis*, which persists its data into a `dump.rdb` file in the data dir. The size of the *redis* file is small if you are using "filter stops", but can be over 100 megabytes if you are not filtering stops.

All this data is stored in the addon's `/data` directory, which persists across restarts. This allows restarts of this addon to be pretty quick, since *tfi-gtfs* will just reload its state from the `dump.rdb` file.

> Note: On Home Assistant OS, the `/data` dirs in addons can be found on the host at `/mnt/data/supervisor/addons/data/`.
