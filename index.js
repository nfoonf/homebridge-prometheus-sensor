const axios = require('axios');

module.exports = (api) => {
  api.registerAccessory('PrometheusSensorPlugin', PrometheusSensorAccessory);
};

class PrometheusSensorAccessory {

  constructor(log, config, api) {
      this.log = log;
      this.config = config;
      this.api = api;

      this.services = [];
      this.Characteristic = this.api.hap.Characteristic;

      // extract configuration
      this.name = config.name;
      this.manufacturer = config.manufacturer;
      this.model = config.model;
      this.serial = config.serial;
      this.url = config.url;
      this.query = config.query;
      this.type = config.type || 'temperature';
      this.batteryTempQuery = config.batteryTemperatureQuery;

      this.informationService = new this.api.hap.Service.AccessoryInformation()
        .setCharacteristic(this.Characteristic.Manufacturer, this.manufacturer)
        .setCharacteristic(this.Characteristic.Model, this.model)
        .setCharacteristic(this.Characteristic.SerialNumber, this.serial);
      this.services.push(this.informationService);

      this.log.warn(this.type)
      switch(this.type) {
        case 'temperature':
          // create a new Temperature Sensor service
          this.service = new this.api.hap.Service.TemperatureSensor(this.name);
          this.service.getCharacteristic(this.Characteristic.CurrentTemperature)
            .onGet(this.handleCurrentTemperatureGet.bind(this));
          this.services.push(this.service);
          break;
        case 'humidity':
            // create a new humidity Sensor service
            this.service = new this.api.hap.ServiceHumiditySensor(this.name);
            this.service.getCharacteristic(this.Characteristic.CurrentRelativeHumidity)
              .onGet(this.handleCurrentHumidityGet.bind(this));
            this.services.push(this.service);
            break;  
        case 'occupancy':
          // create a new Occupancy Sensor service
          this.service = new this.api.hap.Service.OccupancySensor(this.name);
          this.service.getCharacteristic(this.Characteristic.OccupancyDetected)
            .onGet(this.handleOccupancyDetectedGet.bind(this));
          this.services.push(this.service);
          break;
        case 'light':
          // create a new Light Bulb service
          this.service = new this.api.hap.Service.Lightbulb(this.name);
          this.service.getCharacteristic(this.Characteristic.On)
            .onGet(this.handleLightSwitchGet.bind(this));

          // create a new Light Sensor service
          this.lightSensorService = new this.api.hap.Service.LightSensor("LightSensor");
          this.lightSensorService.getCharacteristic(this.Characteristic.CurrentAmbientLightLevel)
            .onGet(this.handleCurrentAmbientLightLevelGet.bind(this));

          // Add services
          this.services.push(this.service);
          this.services.push(this.lightSensorService);
          break;
        case 'battery':
          // create a new Battery Sensor service
          this.service = new this.api.hap.Service.Fan(this.name);
          this.service.getCharacteristic(this.Characteristic.On)
            .onGet(this.handleBatterySwitchGet.bind(this));
          this.service.getCharacteristic(this.Characteristic.RotationSpeed)
            .onGet(this.handleBatteryRotationSpeedGet.bind(this));  
            
          this.batteryService = new this.api.hap.Service.BatteryService("Battery");
          this.batteryService.getCharacteristic(this.Characteristic.StatusLowBattery)
            .onGet(this.handleStatusLowBatteryGet.bind(this));
          this.batteryService.getCharacteristic(this.Characteristic.ChargingState)
            .onGet(this.handleChargingStateGet.bind(this));
          this.batteryService.getCharacteristic(this.Characteristic.BatteryLevel)
            .onGet(this.handleBatteryLevelGet.bind(this));
          
          this.temperatureService = new this.api.hap.Service.TemperatureSensor("BatteryTemperature");
          this.temperatureService.getCharacteristic(this.Characteristic.CurrentTemperature)
            .onGet(this.handleBatteryTemperatureGet.bind(this));

          // Add services
          this.services.push(this.service);
          this.services.push(this.batteryService);
          this.services.push(this.temperatureService);
          break;
        case 'switch':
          // create a new Switch service
          this.service = new this.api.hap.Service.Switch(this.name);
          this.service.getCharacteristic(this.Characteristic.On)
            .onGet(this.handleCurrentSwitchGet.bind(this));
          this.services.push(this.service);
          break;
      }
  }

  handleCurrentTemperatureGet() {
    this.log.debug('Triggered GET CurrentTemperature');

    return this.queryPrometheus(this.query).then((result) => {
      this.log('CurrentTemperature is ' + result)
      return Number.parseFloat(result).toFixed(1);
    });
  }

  handleCurrentHumidityGet() {
    this.log.debug('Triggered GET CurrentHumidity');

    return this.queryPrometheus(this.query).then((result) => {
      this.log('CurrentHumidity is ' + result)
      return Number.parseFloat(result).toFixed(1);
    });
  }

  handleOccupancyDetectedGet() {
    this.log.debug('Triggered GET OccupancyDetected');

    return this.queryPrometheus(this.query).then((result) => {
      this.log('OccupancyDetected is ' + result)
      return parseInt(result);
    });
  }

  handleLightSwitchGet() {
    this.log.debug('Triggered GET Ambient Light Level');

    return this.queryPrometheus(this.query).then((result) => {
      this.log('AmbientLightLevel is ' + result)
      if (parseInt(result) > 0){
        return 1;
      } else {
        return 0;
      };
    });
  }

  handleCurrentAmbientLightLevelGet() {
    this.log.debug('Triggered GET Ambient Light Level');

    return this.queryPrometheus(this.query).then((result) => {
      this.log('Ambient Light Level is ' + result)
      return Number.parseFloat(result).toFixed(1);
    });
  }

  handleBatterySwitchGet() {
    this.log.debug('Triggered GET Battery Switch Status');

    return this.queryPrometheus(this.query).then((result) => {
      this.log('Battery Switch Status is ' + result)
      if (parseInt(result) > 0){
        return 1;
      } else {
        return 0;
      };
    });
  }

  handleBatteryRotationSpeedGet() {
    this.log.debug('Triggered GET Battery %');

    return this.queryPrometheus(this.query).then((result) => {
      this.log('Battery % is ' + result)
      return parseInt(result);
    });
  }

  handleStatusLowBatteryGet() {
    this.log.debug('Triggered GET Battery Status');

    return this.queryPrometheus(this.query).then((result) => {
      this.log('Battery Status is ' + result)
      if (parseInt(result) >= 40){
        return this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
      } else {
        return this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
      };
    });
  }

  handleChargingStateGet() {
    this.log.debug('Triggered GET Battery Charging State');

    return this.queryPrometheus(this.query).then((result) => {
      this.log('Battery Charging State is ' + result)
      if (parseInt(result) >= 95){
        return this.Characteristic.ChargingState.NOT_CHARGING;
      } else {
        return this.Characteristic.ChargingState.CHARGING;
      };
    });
  }

  handleBatteryLevelGet() {
    this.log.debug('Triggered GET Battery Level');

    return this.queryPrometheus(this.query).then((result) => {
      this.log('BatteryLevel is ' + result)
      return parseInt(result);
    });
  }

  handleBatteryTemperatureGet() {
    this.log.debug('Triggered GET Battery CurrentTemperature');

    return this.queryPrometheus(this.batteryTempQuery).then((result) => {
      this.log('Battery Temperature is ' + result)
      return Number.parseFloat(result).toFixed(1);
    });
  }

  handleCurrentSwitchGet() {
    this.log.debug('Triggered GET Switch Status');

    return this.queryPrometheus(this.query).then((result) => {
      this.log('Switch Status is ' + result)
      return parseInt(result);
    });
  }

  queryPrometheus(query) {
    let url = this.url + "/api/v1/query?query=" + query;
    const response = axios.get(url)
    return response.then((response) => {
      return response.data["data"]["result"][0]["value"][1];
    })
  }

  getServices() {
    //return [
    //  this.service
    //];

    //const informationService = new this.api.hap.Service.AccessoryInformation()
		//	.setCharacteristic(this.Characteristic.Manufacturer, this.manufacturer)
		//	.setCharacteristic(this.Characteristic.Model, this.model)
		//	.setCharacteristic(this.Characteristic.SerialNumber, this.serial);

		//const services = [informationService];
    //services.push(this.service);

		//if(this.batteryService) {
		//	services.push(this.batteryService);
		//}

		return this.services;
  }
}
