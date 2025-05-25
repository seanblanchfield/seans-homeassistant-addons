
import {LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';

const DEFAULT_STOP_NUMBER = "";
const DEFAULT_API_URL = "";
const DEFAULT_REFRESH_INTERVAL = 30;
const DEFAULT_MAX_ARRIVALS = 10;
const DEFAULT_ICON = "mdi:bus";

class TfiGtfsCardEditor extends LitElement {
    static properties = {
        hass: {},
        _config: {},
    };

    setConfig(config) {
        this._config = config;
    }

    valueChanged(ev) {
        const event = new Event('config-changed', {
            bubbles: true,
            cancelable: false,
            composed: true,
        });
        event.detail = { config: ev.detail.value };
        this.dispatchEvent(event);
        return event;
    }
    render() {
        if (!this.hass || !this._config) {
          return html``;
        }
        const availableStops = Object.keys(this.hass.states).filter(key => key.startsWith("sensor.tfi_gtfs"));
        return html`
          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${[
                {
                    name: "stopEntity", 
                    label: "Stop Entities", 
                    selector: { 
                        entity: {
                            include_entities: availableStops
                        } 
                    },
                    disabled: !! this._config.apiUrl,
                    required: false
                },
                {name: "apiUrl", label: "API URL", selector: { text: {type: 'url'} }, required: false},
                {name: "stopNumber", label: "Stop Number", selector: { text: {} }, required: false},
                {name: "overwriteStopName", label: "Overwrite stop name in the UI", selector: { text: {} }, required: false},
                {name: "filterRoutes", label: "Filter by route names (comma separeted)", selector: { text: {type: 'string'} }, required: false },
                {name: "refreshInterval", label: "Refresh Interval (seconds)", selector: { text: {type: 'number'} } },
                {name: "maxArrivals", label: "Maximum number of arrivals to show", selector: { text: {type: 'number'} } },
                {name: "hideServiceProvider", label: "Hide service provider", selector: { boolean: {type: 'boolean'} }, required: false },
                {name: "hideStopName", label: "Hide stop name", selector: { boolean: {type: 'boolean'} }, required: false },
                {name: "iconTransport", label: "Pick your icon", selector: {icon: {placeholder: "mdi:bus"}}, required: false},
            ]}
            .computeLabel=${(schema => schema.label || schema.name)}
            @value-changed=${this.valueChanged}
            }
          />
        `;
      }
}
customElements.define("tfi-gtfs-card-editor", TfiGtfsCardEditor);


class TfiGtfsCard extends LitElement {

    static get properties() {
        return {
            hass: {},
            config: {},
        };
    }

    connectedCallback() {
        super.connectedCallback();
        if(! this.config.stopEntity) {
            // Set up a timer to call refresh every 60 seconds
            const refreshInterval = (this.config.refreshInterval || DEFAULT_REFRESH_INTERVAL) * 1000;
            if(self.interval) {
                clearInterval(self.interval);
            }
            self.interval = setInterval(() => this.refresh(), refreshInterval);
            this.refresh();
        }
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if(self.interval) {
            clearInterval(self.interval);
        }
    }

    async refresh() {
        // Call the API
        const apiUrl = this.config.apiUrl || DEFAULT_API_URL;
        const stopNumber = this.config.stopNumber || DEFAULT_STOP_NUMBER;
        const url = `${apiUrl}?stop=${stopNumber}`;
        const response = await fetch(url);
        if(response.ok){
            this.data = await response.json();
        }
        else {
            console.warn(`Error fetching ${url}: ${response.status} ${response.statusText}`)
        }
    }
    getArrivals() {
        if(this.config.stopEntity) {
            if(this.config.filterRoutes) {
                return this.filterArrivals(this.hass.states[this.config.stopEntity].attributes.arrivals, this.config.filterRoutes);
            }
            return this.hass.states[this.config.stopEntity].attributes.arrivals;
        }
        else if(this.data) {
            if(this.config.filterRoutes) {
                return this.filterArrivals(this.data[this.config.stopNumber].arrivals, this.config.filterRoutes);
            }
            return this.data[this.config.stopNumber].arrivals;
        }
        else {
            return [];
        }
    }
    filterArrivals(arrivals, routeNumbers) {
        // Convert the comma-separated routeNumbers string into an array
        const routeNumberArray = routeNumbers.split(',').map(route => route.trim());
        // Filter the arrivals array based on the routeNumberArray
        return arrivals.filter(arrival => routeNumberArray.includes(arrival.route));
    }

    getStopName() { 
        if(this.config.stopEntity) {
            if(this.config.overwriteStopName) {
                return this.config.overwriteStopName;
            }
            return this.hass.states[this.config.stopEntity].attributes.stop_name;
        }
        else if(this.data) {
            return this.data[this.config.stopNumber].stop_name;
        }
        else {
            return "";
        }
    }

    render() {
        const arrivals = this.getArrivals();
        const stop_name = this.getStopName();
        return html`
    <ha-card>
    ${(!this.config.hideStopName ? html`<h2>${ stop_name }</h2>` : '')}
      <table>
        <tbody>
            ${
                arrivals.slice(0, this.config.maxArrivals || DEFAULT_MAX_ARRIVALS ).map(arrival => {
                    let due = arrival.real_time_arrival ?? arrival.scheduled_arrival;
                    // parse due
                    const dueDate = new Date(due);
                    // if due is in the next 20 minutes, show minutes remaining
                    const now = new Date();
                    const minutesRemaining = Math.round((dueDate - now) / 1000 / 60);
                    if( minutesRemaining < -1 ) {
                        return html``;
                    }
                    else if (minutesRemaining < 1) {
                        due = "Due";
                    }
                    else if (minutesRemaining < 20) {
                        due = `${minutesRemaining} minutes`;
                    } 
                    else {
                        // due = dueDate.toLocaleTimeString();
                        // format due time as HH:MM
                        due = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                    return html`

                    <tr>
                    ${this.config.iconTransport ? html`<td><ha-icon icon='${this.config.iconTransport}'/></td>` : ''}
                        <td class="route-display">
                            <span class="route-summary">
                                <span class="route">${arrival.route}</span> to <span class="headsign">${arrival.headsign}</span>
                            </span>
                            ${!this.config.hideServiceProvider ? html`<span class="agency">${arrival.agency}</span>` : ''}
                        </td>
                        <td class="arrival-time" ?real-time=${arrival.real_time_arrival}>${due}</td>
                    </tr>
                `;
                }
            )}
            </tbody>
        </table>
    </ha-card>
    `;
    }

    setConfig(config) {
        if (! config.stopEntity && !(config.apiUrl && config.stopNumber)) {
            throw new Error("You must provide either a stop entity, or an API URL and a stop number.");
        }
        this.config = config;
    }

    // The height of your card. Home Assistant uses this to automatically
    // distribute all cards over the available columns.
    getCardSize() {
        return 1;
    }

    static get styles() {
        return css`
      :host {
      }
      ha-card {
        padding: 16px;
      }
      /* Collapse table borders */
      table {
        border-collapse: collapse;
        width: 100%;
      }
      table tr:nth-child(even) {
        background-color: rgba(130, 130, 130, 0.1);
      }   
      td[real-time] {
        color: green;
      }
      td.route-display {width: 75%;}
      td.arrival-time {
        text-align: right;
        text-wrap: nowrap;
      }
      td {
        padding: 0.2em;
      }
      span.route-summary,
      span.agency {
        margin: 0;
      }
      span.route {
        font-weight: bold;

      }
      span.headsign {
      }
      span.agency {
        margin-left: 1em;
        text-transform: uppercase;
        font-size: 0.6em;
        opacity: 0.7;
        text-wrap: nowrap;
      }
    

        `;
    }

    static getConfigElement() {
        return document.createElement("tfi-gtfs-card-editor");
    }

    static getStubConfig() {
        return { 
            stopNumber: DEFAULT_STOP_NUMBER, 
            apiUrl: DEFAULT_API_URL,
            refreshInterval: DEFAULT_REFRESH_INTERVAL,
            maxArrivals: DEFAULT_MAX_ARRIVALS,
            iconTransport: DEFAULT_ICON,
        };
    }
}
customElements.define("tfi-gtfs-card", TfiGtfsCard);


window.customCards = window.customCards || [];
window.customCards.push({
    type: "tfi-gtfs-card",
    name: "Transport for Ireland GTFS Card",
    preview: false, // Optional - defaults to false
    description: "Real-time arrival information for transport stops in Ireland",
});
