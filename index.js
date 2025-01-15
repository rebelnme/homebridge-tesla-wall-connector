var Service, Characteristic, UUIDGen, FakeGatoHistoryService;
var sprintf = require("sprintf-js").sprintf;
var inherits = require('util').inherits;
var correctingInterval = require('correcting-interval');

//Initialize
module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	UUIDGen = homebridge.hap.uuid;
	FakeGatoHistoryService = require('fakegato-history')(homebridge);

	CurrentPowerConsumption = function () {
		Characteristic.call(this, 'Consumption', 'E863F10D-079E-48FF-8F27-9C2605A29F52');
		this.setProps({
			format: Characteristic.Formats.UINT16,
			unit: "Watt",
			maxValue: 100000,
			minValue: 0,
			minStep: 1,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
	};
	CurrentPowerConsumption.UUID = 'E863F10D-079E-48FF-8F27-9C2605A29F52';
	inherits(CurrentPowerConsumption, Characteristic);

	TotalConsumption = function () {
		Characteristic.call(this, 'Energy', 'E863F10C-079E-48FF-8F27-9C2605A29F52');
		this.setProps({
			format: Characteristic.Formats.FLOAT,
			unit: "kWh",
			maxValue: 100000000000,
			minValue: 0,
			minStep: 0.001,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
	};
	TotalConsumption.UUID = 'E863F10C-079E-48FF-8F27-9C2605A29F52';
	inherits(TotalConsumption, Characteristic);

	ResetTotal = function () {
		Characteristic.call(this, 'Reset', 'E863F112-079E-48FF-8F27-9C2605A29F52');
		this.setProps({
			format: Characteristic.Formats.UINT32,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY, Characteristic.Perms.WRITE]
		});
		this.value = this.getDefaultValue();
	};
	ResetTotal.UUID = 'E863F112-079E-48FF-8F27-9C2605A29F52';
	inherits(ResetTotal, Characteristic);

	PowerMeterService = function (displayName, subtype) {
		Service.call(this, displayName, '00000001-0000-1777-8000-775D67EC4377', subtype);
		this.addCharacteristic(CurrentPowerConsumption);
		this.addCharacteristic(TotalConsumption);
		this.addCharacteristic(ResetTotal);
	};
	inherits(PowerMeterService, Service);

	FakeGatoHistoryService = FakeGatoHistoryService;
	inherits(FakeGatoHistoryService, Service);

	homebridge.registerAccessory("homebridge-tesla-wall-connector", "wallConnector", wallConnector)
}

// function wallConnector
function wallConnector(log, config) {

	// Don't load the plugin if these aren't accessible for any reason
	if (!log || !config) {
		return
	  }

	this.log = log  
	this.log("Initialising...")

	this.config = config;
	this.name = config.name;
	this.displayName = config.name;
	this.url = config.url;
	this.refresh = config.refreshSeconds || 60;
	this.ip_address = config.ip_address;
	this.get_url = "http://" + this.ip_address + "/api/1/vitals";
	this.UUID = UUIDGen.generate(sprintf("powermeter-%s", config.periph_id));
	var package = require('./package.json');
	this.intPower = 0;
	this.acquiredSamples = 0;
	this.lastReset = 0;
	this.value = 0;
	this.inUse = false;
	this.totalenergy = 0;
	this.totalenergytemp = 0;
	this.ExtraPersistedData = {};

	correctingInterval.setCorrectingInterval(function () {
		if (this.powerLoggingService.isHistoryLoaded()) {
			this.ExtraPersistedData = this.powerLoggingService.getExtraPersistedData();
			if (this.ExtraPersistedData != undefined) {
				this.totalenergy = this.ExtraPersistedData.totalenergy + this.totalenergytemp + this.value * this.refresh / 3600 / 1000;
				this.powerLoggingService.setExtraPersistedData({ totalenergy: this.totalenergy, lastReset: this.ExtraPersistedData.lastReset });
			}
			else {
				this.totalenergy = this.totalenergytemp + this.value * this.refresh / 3600 / 1000;
				this.powerLoggingService.setExtraPersistedData({ totalenergy: this.totalenergy, lastReset: 0 });
			}
			this.totalenergytemp = 0;

		}
		else {
			this.totalenergytemp = this.totalenergytemp + this.value * this.refresh / 3600 / 1000;
			this.totalenergy = this.totalenergytemp;
		}
		this.outlet.getCharacteristic(CurrentPowerConsumption).getValue(null);
		this.outlet.getCharacteristic(TotalConsumption).getValue(null);
		this.powerLoggingService.addEntry({ time: Date.now(), power: this.value });
	}.bind(this), this.refresh * 1000);

	this.informationService = new Service.AccessoryInformation();

	this.informationService
		.setCharacteristic(Characteristic.Name, this.name)
		.setCharacteristic(Characteristic.Manufacturer, "Homebridge")
		.setCharacteristic(Characteristic.Model, "wall connector")
		.setCharacteristic(Characteristic.FirmwareRevision, package.version)
		.setCharacteristic(Characteristic.SerialNumber, this.periph_id);

	this.outlet = new Service.Outlet(this.name);
	this.outlet.getCharacteristic(Characteristic.On)
		.on('get', this.getState.bind(this))
		.on('set', this.setState.bind(this));

	this.outlet.getCharacteristic(Characteristic.OutletInUse)
		.on('get', (callback) => {
			callback(null, this.inUse);
		});

	this.outlet.getCharacteristic(CurrentPowerConsumption)
		.on('get', this.getpowerConsumption.bind(this));

	this.outlet.getCharacteristic(TotalConsumption)
		.on('get', (callback) => {
			this.ExtraPersistedData = this.powerLoggingService.getExtraPersistedData();
			if (this.ExtraPersistedData != undefined) {
				this.totalenergy = this.ExtraPersistedData.totalenergy;
				this.log.debug("getConsumption = %f", this.totalenergy);
			}
			callback(null, this.totalenergy);
		});

	this.outlet.getCharacteristic(ResetTotal)
		.on('set', (value, callback) => {
			this.totalenergy = 0;
			this.lastReset = value;
			this.powerLoggingService.setExtraPersistedData({ totalenergy: this.totalenergy, lastReset: this.lastReset });
			callback(null);
		})
		.on('get', (callback) => {
			this.ExtraPersistedData = this.powerLoggingService.getExtraPersistedData();
			if (this.ExtraPersistedData != undefined)
				this.lastReset = this.ExtraPersistedData.lastReset;
			callback(null, this.lastReset);
		});

	this.powerLoggingService = new FakeGatoHistoryService("energy", this, { storage: 'fs' });
}

// getState
wallConnector.prototype.getState = function (callback) {

	if (this.lock_on) {
		callback(null, "1");
	} else {
		let url = new URL(this.get_url)
		var protocol = (url.protocol == "http:") ? require('http') : require('https')

		const options = {
			hostname: url.hostname,
			port: url.port,
			path: url.pathname + url.search,
			method: 'GET'
		}

		var req = protocol.request(options, (resp) => {

			this.log.debug("GET response received (%s)", resp.statusCode)

			let data = ''
			// A chunk of data has been received.
			resp.on('data', (chunk) => {
				data += chunk
			})

			// The whole response has been received. Print out the result.
			resp.on('end', () => {

				if (resp.statusCode == 200) {

					try {
						JSON.parse(data)
					  } catch (e) {
						this.log("Error: not JSON!");
						callback(null, 0)
						return
					  }
			  
					var json = JSON.parse(data)
					this.log.debug("JSON: (%s)", json)
					var state = json.contactor_closed == true ? "1" : "0";
					callback(null, state)
				} else {
					this.log("Error getting State: %s : %s",resp.statusCode, resp.statusMessage)
					callback(null, 0)
				}
			})
		})

		req.on("error", (err) => {
			this.log("Error getting State: %s - %s : %s",err.code, err.status, err.message)
    		callback(null, 0 )
		})

		req.end()

	}
}

wallConnector.prototype.getpowerConsumption = function (callback) {

	let url = new URL(this.get_url)
	var protocol = (url.protocol == "http:") ? require('http') : require('https')
	// this.log.debug(url)
	const options = {
		hostname: url.hostname,
		port: url.port,
		path: url.pathname + url.search,
		method: 'GET'
	}

	var req = protocol.request(options, (resp) => {

		this.log.debug("GET response received (%s)", resp.statusCode)

		let data = ''
		// A chunk of data has been received.
		resp.on('data', (chunk) => {
			data += chunk
		})

		// The whole response has been received. Print out the result.
		resp.on('end', () => {

			if (resp.statusCode == 200) {

				try {
					JSON.parse(data)
				  } catch (e) {
					this.log("Error: not JSON!");
					callback(null, 0)
					return
				  }
		  
				var json = JSON.parse(data)
				this.log.debug("JSON: (%s)", json)
				var power = Math.round(json.grid_v * json.vehicle_current_a)
				this.value = power
				this.inUse = power == "0" ? false : true
				callback(null, power)
				this.log.debug("Power: (%s)", power)
			} else {
				this.log("Error getting Comsumption: %s : %s",resp.statusCode, resp.statusMessage)
				callback(null, 0)
			}
		})
	})

	req.on("error", (err) => {
		this.log("Error getting Comsumption: %s - %s : %s",err.code, err.status, err.message)
    	callback(null, 0 )
	})

	req.end()

}


// set State
wallConnector.prototype.setState = function (state, callback) {
	if (this.lock_on && !state) {
		callback();
		this.lockOn();
	} else {
		let requestUrl = this.set_url + (state ? 100 : 0);
		let url = new URL(requestUrl)
		var protocol = (url.protocol == "http:") ? require('http') : require('https')

		const options = {
			hostname: url.hostname,
			port: url.port,
			path: url.pathname + url.search,
			method: 'GET'
		}

		var req = protocol.request(options, (resp) => {

			this.log.debug("GET response received (%s)", resp.statusCode)

			let data = ''
			// A chunk of data has been received.
			resp.on('data', (chunk) => {
				data += chunk
			})

			// The whole response has been received. Print out the result.
			resp.on('end', () => {

				if (resp.statusCode == 200) {
					callback()
				} else {
					this.log("Error setting State: %s : %s",resp.statusCode, resp.statusMessage)
					callback()
				}
			})
		})

		req.on("error", (err) => {
			this.log("Error setting State: %s - %s : %s",err.code, err.status, err.message)
    		callback()
		})

		req.end()


	}
}

// Lock ON
wallConnector.prototype.lockOn = function () {
	setTimeout(() => {
		this.outlet.getCharacteristic(Characteristic.On).updateValue("1");
	}, 250);
}

wallConnector.prototype.getServices = function () {
	return [this.informationService, this.powerLoggingService, this.outlet];
}
