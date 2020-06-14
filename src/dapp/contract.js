import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import FlightSuretyData from "../../build/contracts/FlightSuretyData.json";
import Config from "./config.json";
import Web3 from "web3";
//const TruffleContract = require("truffle-contract");

export default class Contract {
  constructor(network, callback) {
    let config = Config[network];
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    this.flightSuretyApp = new this.web3.eth.Contract(
      FlightSuretyApp.abi,
      config.appAddress
    );
    this.flightSuretyData = new this.web3.eth.Contract(
      FlightSuretyData.abi,
      config.dataAddress
    );
    this.initialize(callback);
    this.owner = null;
    this.firstAirline = null;
    this.airlines = [];
    this.passengers = [];
  }

  async initialize(callback) {
    this.web3.eth.getAccounts((error, accts) => {
      this.owner = accts[0];
      this.firstAirline = accts[1];

      let counter = 1;

      while (this.airlines.length < 5) {
        this.airlines.push(accts[counter++]);
      }

      while (this.passengers.length < 5) {
        this.passengers.push(accts[counter++]);
      }

      callback();
    });
  }

  async isOperational(callback) {
    let self = this;
    return await self.flightSuretyData.methods
      .isOperational()
      .call({ from: self.owner }, callback);
  }
  async isFlightRegistered(address, flight, timestamp, callback) {
    let self = this;
    return await self.flightSuretyData.methods
      .isFlightRegistered(address, flight, timestamp)
      .call({ from: self.owner }, callback);
  }

  async isAirlineAuthorized(airline, callback) {
    let self = this;
    let payload = {
      airline: airline,
    };
    return await self.flightSuretyData.methods
      .isAirlineAuthorized(payload.airline)
      .call(callback);
  }

  async fundAirline(airline, amount, callback) {
    let self = this;
    let payload = {
      airline: airline,
      amount: amount,
    };
    return await self.flightSuretyData.methods
      .fundAirline(payload.airline)
      .send(
        {
          from: payload.airline,
          value: this.web3.utils.toWei(payload.amount, "ether"),
          gas: 1000000,
        },
        (error, result) => {
          callback(error, result);
        }
      );
  }

  async registerAirline(address, regAddress, name, code, callback) {
    let self = this;
    let payload = {
      address: address,
      regAddress: regAddress,
      code: code,
      name: name,
      registering: self.owner,
    };
    return await self.flightSuretyData.methods
      .registerAirline(payload.address, payload.code, payload.name)
      .send({ from: payload.regAddress, gas: 1000000 }, callback);
  }
  async getAirlineDetails(address, callback) {
    let self = this;
    let payload = {
      address: address,
    };
    return await self.flightSuretyData.methods
      .getAirlineDetails(payload.address)
      .call((error, result) => {
        callback(error, result);
      });
  }

  async registerFLight(airline, flight, timestamp, callback) {
    let self = this;
    let payload = {
      airline: airline,
      flight: flight,
      timestamp: timestamp,
    };
    return await self.flightSuretyData.methods
      .registerFlight(payload.airline, payload.flight, payload.timestamp)
      .send({ from: payload.airline, gas: 1000000 }, (error, result) => {
        callback(error, result);
      });
  }

  async getAuthorizedAirlineCount(callback) {
    let self = this;
    return await self.flightSuretyData.methods
      .getAuthorizedAirlineCount()
      .call((error, result) => {
        callback(error, result);
      });
  }

  async buy(
    passengerAddress,
    airlineAddress,
    flight,
    timestamp,
    amount,
    callback
  ) {
    let self = this;
    let payload = {
      passenger: passengerAddress,
      airline: airlineAddress,
      flight: flight,
      timestamp: timestamp,
      amount: amount,
    };
    return await self.flightSuretyApp.methods
      .buy(payload.airline, payload.flight, payload.timestamp)
      .send(
        {
          from: payload.passenger,
          value: this.web3.utils.toWei(payload.amount, "ether"),
          gas: 1000000,
        },
        (error, result) => {
          callback(error, result);
        }
      );
  }

  async getPassengerReimbursement(airlineAddress,flight, timestamp, passengerAddress, callback) {
    let self = this;
    let payload = {
      airline: airlineAddress,
      flight: flight,
      timestamp: timestamp,
      passenger:passengerAddress
    };
    let amount  = this.web3.utils.fromWei(await self.flightSuretyData.methods
      .getPassengerReimbursement(payload.airline, payload.flight, payload.timestamp, payload.passenger)
      .call((error, result) => {
        callback(error, result);
      }), "ether");
    return amount;
  }

  async pay(airlineAddress,flight, timestamp, passengerAddress, callback) {
    let self = this;
    let payload = {
      airline: airlineAddress,
      flight: flight,
      timestamp: timestamp,
      passenger:passengerAddress
    };
    await self.flightSuretyData.methods
      .pay(payload.airline, payload.flight, payload.timestamp)
      .send({from: payload.passenger},(error, result) => {
        callback(error, result);
      });
  }

  async fetchFlightStatus(airline, flight, timestamp, callback) {
    let self = this;
    let payload = {
      airline: airline,
      flight: flight,
      timestamp: timestamp,
    };
    await self.flightSuretyApp.methods
      .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
      .send({ from: self.owner }, (error, result) => {
        callback(error, payload);
      });
  }
}
