import {
    LitElement,
    html,
    css,
} from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";

const DEFAULT_STOP_NUMBER = "1358";
const DEFAULT_API_URL = "http://homeassistant.local:7341/api/v1/arrivals";
const DEFAULT_REFRESH_INTERVAL = 60;
const DEFAULT_MAX_ARRIVALS = 10;

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
    
        return html`
          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${[
                {name: "stopNumber", label: "Stop Number", selector: { text: {} } },
                {name: "apiUrl", label: "API URL", selector: { text: {type: 'url'} } },
                {name: "refreshInterval", label: "Refresh Interval (seconds)", selector: { text: {type: 'number'} } },
                {name: "maxArrivals", label: "Maximum number of arrivals to show", selector: { text: {type: 'number'} } },
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
        // Set up a timer to call refresh every 60 seconds
        const refreshInterval = (this.config.refreshInterval || DEFAULT_REFRESH_INTERVAL) * 1000;
        if(self.interval) {
            clearInterval(self.interval);
        }
        self.interval = setInterval(() => this.refresh(), refreshInterval);
        this.refresh();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        console.info("disconnectedCallback");
        clearInterval(self.interval);
    }

    async refresh() {
        // Call the API
        const apiUrl = this.config.apiUrl || DEFAULT_API_URL;
        const stopNumber = this.config.stopNumber || DEFAULT_STOP_NUMBER;
        const url = `${apiUrl}?stop=${stopNumber}`;
        const response = await fetch(url);
        this.data = await response.json();
    }

    render() {
        if(!this.data) {
            return html``;
        }
        const {arrivals, stop_name} = this.data[this.config.stopNumber]
        return html`
    <ha-card>
      <h2>
        ${ stop_name }
      </h2>
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
                if (minutesRemaining < 20) {
                    due = `${minutesRemaining} minutes`;
                } else {
                    // due = dueDate.toLocaleTimeString();
                    // format due time as HH:MM
                    due = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
                return html`

                <tr>
                    <td>
                        <span class="route-summary">
                            <span class="route">${arrival.route}</span> to <span class="headsign">${arrival.headsign}</span>
                        </span>
                        <span class="agency">${arrival.agency}</span>
                    </td>
                    <td ?real-time=${arrival.real_time_arrival}>${due}</td>
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
        if (!config.stopNumber) {
            throw new Error("You need to provide a stop number.");
        }
        if (!config.apiUrl) {
            throw new Error("You need to provide an API URL.");
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
