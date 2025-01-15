<p align="center">
  <a href="https://github.com/homebridge/homebridge"><img src="https://raw.githubusercontent.com/homebridge/branding/master/logos/homebridge-color-round-stylized.png" height="140"></a>
</p>

<span align="center">

# homebridge-tesla-wall-connector

[![npm](https://img.shields.io/npm/v/homebridge-tesla-wall-connector.svg)](https://www.npmjs.com/package/homebridge-tesla-wall-connector) [![npm](https://img.shields.io/npm/dt/homebridge-tesla-wall-connector.svg)](https://www.npmjs.com/package/homebridge-tesla-wall-connector) [![Donate](https://img.shields.io/badge/donate-PayPal-blue.svg)](https://www.paypal.com/donate?hosted_button_id=LU7BSTQF3DEZQ)

</span>

## Description
A simple Homebridge plugin for Tesla Wall Connectors to provide power usage data to Elgato Eve app using Fakegato-History.
Appears as a regular outlet with _"in use"_ state in Home app.


## Installation
```shell
npm install -g homebridge-tesla-wall-connector
```
## Configuration

This plugin needs the ip address of the wall connector.
The following parameters are supported:

```
{
   "accessory": "eedomusOutlet",       // mandatory
   "name": "TV power",                 // name in HomeKit
   "ip_address": "1.2.3.4",            // wall connector ip address
   "refreshSeconds": 60,                // (Optional) Default: 60
}
```

## Credits
[https://github.com/LeJeko/homebridge-eedomus-outlet-meter](https://github.com/LeJeko/homebridge-eedomus-outlet-meter)  
[https://github.com/t-j-n/homebridge-mystromoutlet](https://github.com/t-j-n/homebridge-mystromoutlet)  
[https://github.com/simont77/homebridge-myhome](https://github.com/simont77/homebridge-myhome)
