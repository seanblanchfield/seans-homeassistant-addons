# Overview
This addon packages up  [@seanrees](https://github.com/seanrees)'s [GTFS Upcoming](https://github.com/seanrees/gtfs-upcoming) project, which proxies *Transport for Ireland's* new GTFS-R feed into an easy-to-use REST API. This REST API can then be consumed from Home Assistant to display real-time transport info (e.g., buses that will be arriving shortly) in a Lovelace card.

# GTFS-R background
*Transport for Ireland's* previously provided a REST API that was widely used by app developers, but it was deprecated in favour of a new GTFS feed. GTFS is a feed format developed by Google for transit operators to use to make schedules and real-time updates available to Google Maps and related services. One part of it involves a zip file containing various metadata files that describe operators, routes, stops, and the schedule. The other part is a real-time feed of schedule updates, which returns a list of all vehicles that currently operating (i.e., literally on the road/tracks). The real-time feed needs to be interpreted with the metadata from the contents of the zip file.  This architecture seeems convenient for Google, who are interested in syncing all available information. However, the rest of us are usually interested just in specific transit lines, stops or stations. [GTFS Upcoming](https://github.com/seanrees/gtfs-upcoming) bridges that gap.

# Rate Limits
Transport for Ireland's [fair usage policy](https://developer.nationaltransport.ie/usagepolicy) lists a rate limit of 5000 requests per day (or one request every 17 seconds). I have hit this limit earlier than this.

*GTFS Upcoming* will issue a request to *Transport for Ireland* every time a request is made to it. It is therefore important to throttle the rate that you re-query the data to at least one request per minute.

Under the hood, *Transport for Ireland* is returning a large dataset describing every form of public transport in Ireland that is currently in motion (from what I can see, it typically returns a response of about 500Kb to each request). It would be nice if *Transport in Ireland* would host an instance of *GTFS Upcoming*, so that it wasn't necessary for everyone to poll the large dataset, and instead ask just for the data that we are interested in.

# Configuration
To use this addon you must register a free account at [https://developer.nationaltransport.ie/] to obtain API keys (a "primary" key and a "secondary" key). You must set these in the configuration screen after you have this addon installed.

In addition, you can specify up to four "interesting stops". You specify these just using the shorter regular stop name (e.g., the one that is printed on the physical bus stops). 

# Consuming the REST API from Home Assistant

Add a [REST sensor](https://www.home-assistant.io/integrations/sensor.rest/) to `configuration.yaml` that reads the real-time data from the Add-on:

``` yaml
rest:
  - resource: http://homeassistant.local:6824/upcoming.json
    sensor:
      name: "TFI Realtime Upcoming"
      unique_id: tfi_realtime
      value_template: "OK"
      json_attributes:
        - current_timestamp
        - upcoming

```

To show real time information in the UI, add a Markdown card like the following:

```yaml
type: markdown
entity_id: sensor.tfi_realtime_upcoming
content: >-
  {% set stop_ids = {'8220DB001409': "Loretto", '8220DB002189':"Shopping

  Centre"} %}


  {% set upcoming = state_attr('sensor.tfi_realtime_upcoming','upcoming')%}


  {% for stop_id, upcoming in upcoming|groupby("stop_id") %} **{{

  stop_ids[stop_id] }}**:  

  {% for i in range(0, min(upcoming | count, 10) ) %}{% if

  upcoming[i]['source'] == 'LIVE' %}<font
  color=green>{%endif%}{{upcoming[i]['route']}} ({{

  int(float(upcoming[i]['dueInSeconds'])/60)}} mins){% if

  upcoming[i]['source'] == 'LIVE' %}</font>{%endif%}, {% endfor %}


  {% endfor %}  
title: Public Transport

```

This card iterates the REST sensor to display real-time information, with updates that are based on live tracking info shown in green (unfortunately, many buses seem to only have schedule information available). The data is grouped by stop, and the stops are referred to by a human name defined in the `{% set ... %}` directive at the top.
