var Test = require("../config/testConfig.js");
var BigNumber = require("bignumber.js");
require("web3");

contract("Flight Surety Tests", async (accounts) => {
  var config;

  const TEST_ORACLES_COUNT = 20;
  const STATUS_CODE_UNKNOWN = 0;
  const STATUS_CODE_ON_TIME = 10;
  const STATUS_CODE_LATE_AIRLINE = 20;
  const STATUS_CODE_LATE_WEATHER = 30;
  const STATUS_CODE_LATE_TECHNICAL = 40;
  const STATUS_CODE_LATE_OTHER = 50;
  before("setup contract", async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(
      config.flightSuretyApp.address
    );

    try {
      //Fund the first airline
      await config.flightSuretyData.fundAirline(config.firstAirline, {
        from: config.firstAirline,
        value: web3.utils.toWei("2", "ether"),
      });
    } catch (error) {}
    //Register the first airline
    try {
      await config.flightSuretyData.registerAirline(
        config.firstAirline,
        "FIRST",
        "FIRST AIRLINE",
        config.firstAirline
      );
    } catch (e) {}

    try {
      //Authorize the first airline
      await config.flightSuretyData.authorizeAirline(config.firstAirline);
    } catch (error) {}

    //Register first airline
    //await config.flightSuretyApp.registerAirline(config.firstAirline);

    // //Authorize first airline

    // await config.flightSuretyApp.authorizeAirline(config.firstAirline);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {
    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false, {
        from: config.testAddresses[2],
      });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false);
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(
      accessDenied,
      false,
      "Access not restricted to Contract Owner"
    );
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
    await config.flightSuretyData.setOperatingStatus(false);

    let reverted = false;
    try {
      await config.flightSurety.setTestingMode(true);
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it(`(multiparty) check if airline has paid registration fees`, async () => {
    let funded = false;
    try {
      funded = await config.flightSuretyData.isAirlineFunded(
        config.firstAirline
      );
    } catch (error) {}
    assert.equal(funded, true, "Airline is funded");
  });

  it(`(owner) cannot change the registration fees amount if it is not the owner`, async () => {
    let result = 6;
    try {
      //web3.utils.toWei("15", "ether")
      let r = await config.flightSuretyData.changeAirlineFundingAmount(
        web3.utils.toWei("15", "ether"),
        { from: config.firstAirline }
      );
    } catch (error) {}
    result = web3.utils.fromWei(
      await config.flightSuretyData.getAirlineFundingAmount.call(),
      "ether"
    );
    assert.equal(
      result,
      2,
      "Registration fees cannot be changed by someone who is not the owner of the contract"
    );
  });

  it(`(owner) can change the registration fees amount if it is the owner`, async () => {
    let result = 0;
    try {
      await config.flightSuretyData.changeAirlineFundingAmount(
        web3.utils.toWei("15", "ether"),
        { from: config.owner }
      );
    } catch (error) {}
    result = web3.utils.fromWei(
      await config.flightSuretyData.getAirlineFundingAmount.call(),
      "ether"
    );
    assert.equal(
      result,
      15,
      "Registration fees cannot be changed by someone who is not the owner of the contract"
    );
    try {
      await config.flightSuretyData.changeAirlineFundingAmount(
        web3.utils.toWei("2", "ether"),
        { from: config.owner }
      );
    } catch (error) {}
  });

  it("(airline) get the airline funding amount", async () => {
    let result = 0;
    try {
      result = web3.utils.fromWei(
        await config.flightSuretyData.getAirlineFundingAmount.call(),
        "ether"
      );
    } catch (error) {}
    assert.equal(result, 2, "Airline can query the registration fees amount");
  });

  it("(airline) cannot fund the airline with an amount less than required", async () => {
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
      await config.flightSuretyApp.fundAirline(newAirline, {
        from: newAirline,
        value: 4,
      });
    } catch (e) {}
    let result = await config.flightSuretyData.isAirlineFunded.call(newAirline);
    // ASSERT
    assert.equal(
      result,
      false,
      "Airline funding should should be equal to the required funding amount"
    );
  });

  it("(airline) can fund the airline with the amount required", async () => {
    // ARRANGE
    let newAirline = accounts[2];
    // ACT
    try {
      await config.flightSuretyData.fundAirline(newAirline, {
        from: newAirline,
        value: web3.utils.toWei("2", "ether"),
      });
    } catch (e) {}
    let result = await config.flightSuretyData.isAirlineFunded.call(newAirline);
    // ASSERT
    assert.equal(
      result,
      true,
      "Airline funding should should be equal to the required funding amount"
    );
  });

  it("(airline) can register an Airline using registerAirline()", async () => {
    // ARRANGE
    let newAirline = accounts[2];
    let result;
    try {
      await config.flightSuretyData.fundAirline(newAirline, {
        from: newAirline,
        value: web3.utils.toWei("2", "ether"),
      });
    } catch (e) {}

    // ACT
    try {
      await config.flightSuretyData.registerAirline(
        newAirline,
        "COST",
        "COSTAIR",
        config.firstAirline
      );
    } catch (e) {
      console.log(e);
    }

    try {
      result = await config.flightSuretyData.isAirlineRegistered.call(
        newAirline
      );
    } catch (error) {
      console.log(error);
    }

    // ASSERT
    assert.equal(
      result,
      true,
      "Airline should be able to register another airline if it has provided funding"
    );
  });

  it("(airline) can get details of a registered airlines", async () => {
    // ARRANGE
    let newAirline = accounts[2];
    let result;
    try {
      result = await config.flightSuretyData.getAirlineDetails(newAirline);
    } catch (error) {}

    // ASSERT
    assert.equal(
      result.name,
      "COSTAIR",
      "Should be able to get the airline name"
    );
    assert.equal(result.code, "COST", "Should be able to get the airline code");
  });

  it("(airline) cannot vote if it is not an authorized airline", async () => {
    // ARRANGE
    let votingAirline = accounts[3];
    let candidateAirline = accounts[2];
    //ACT
    try {
      await config.flightSuretyData.voteAirline(
        votingAirline,
        candidateAirline
      );
    } catch (e) {}
    let votes;
    try {
      votes = (
        await config.flightSuretyData.getAirlineVoteCount(candidateAirline)
      ).toNumber();
    } catch (error) {}
    assert.equal(votes, 0, "Cannot vote if not authorized");
  });

  it("(airline) can vote if it is an authorized airline", async () => {
    // ARRANGE
    let votingAirline = config.firstAirline;
    let candidateAirline = accounts[2];
    //ACT
    try {
      await config.flightSuretyData.voteAirline(
        votingAirline,
        candidateAirline
      );
    } catch (e) {}

    let votes;
    try {
      votes = (
        await config.flightSuretyData.getAirlineVoteCount(candidateAirline)
      ).toNumber();
    } catch (error) {}
    assert.equal(votes, 1, "Can vote if authorized");
  });

  it("(airline) is authorized if is funded and count of airlines is less than required for voting", async () => {
    let newAirline = accounts[2];
    let result;
    try {
      result = await config.flightSuretyData.isAirlineAuthorized(newAirline);
    } catch (error) {}
    assert.equal(result, true, "airline is authorized");
  });

  it("(airline) is not authorized if is funded and count of airlines is greater than required for voting", async () => {
    let registeringAccount1 = accounts[2];
    let newAirline1 = accounts[3];
    let newAirline2 = accounts[4];
    let newAirline3 = accounts[5];
    let result1, result2, result3;

    // ACT
    try {
      await config.flightSuretyData.registerAirline(
        newAirline1,
        "COST1",
        "COSTAIR1",
        registeringAccount1
      );
    } catch (e) {
      console.log(e);
    }

    try {
      await config.flightSuretyData.registerAirline(
        newAirline2,
        "COST2",
        "COSTAIR2",
        registeringAccount1
      );
    } catch (e) {
      console.log(e);
    }

    try {
      await config.flightSuretyData.registerAirline(
        newAirline3,
        "COST3",
        "COSTAIR3"
      );
    } catch (e) {}

    try {
      await config.flightSuretyData.fundAirline(newAirline1, {
        from: newAirline1,
        value: web3.utils.toWei("2", "ether"),
      });
    } catch (error) {}
    try {
      await config.flightSuretyData.fundAirline(newAirline2, {
        from: newAirline2,
        value: web3.utils.toWei("2", "ether"),
      });
    } catch (error) {}

    try {
      await config.flightSuretyData.fundAirline(newAirline3, {
        from: newAirline3,
        value: web3.utils.toWei("2", "ether"),
      });
    } catch (error) {}

    try {
      result1 = await config.flightSuretyData.isAirlineAuthorized(newAirline1);
    } catch (error) {}

    try {
      result2 = await config.flightSuretyData.isAirlineAuthorized(newAirline2);
    } catch (error) {}

    try {
      result3 = await config.flightSuretyData.isAirlineAuthorized(newAirline3);
    } catch (error) {}

    assert.equal(result1, true, "airline1 is authorized");
    assert.equal(result2, true, "airline2 is authorized");
    assert.equal(result3, false, "airline3 is not authorized");
  });

  it("(airline) is authorized if is funded and has collected enough votes", async () => {
    let votingAirline1 = accounts[2];
    let votingAirline2 = accounts[3];

    let newAirline = accounts[5];
    let result;
    try {
      await config.flightSuretyData.registerAirline(
        newAirline,
        "COST3",
        "COSTAIR3"
      );
    } catch (e) {}
    try {
      result = await config.flightSuretyData.isAirlineAuthorized(newAirline);
    } catch (error) {}
    assert.equal(result, false, "airline is not authorized");

    try {
      await config.flightSuretyData.voteAirline(votingAirline1, newAirline);
    } catch (e) {}

    try {
      await config.flightSuretyData.voteAirline(votingAirline2, newAirline);
    } catch (e) {}
    try {
      result = await config.flightSuretyData.isAirlineAuthorized(newAirline);
    } catch (error) {}
    assert.equal(result, true, "airline is authorized");
  });

  it("(airline) cannot register flight if airline is not authorized", async () => {
    // ARRANGE
    let airline = accounts[6];
    let flight = "COST003";
    let timestamp = 10;
    //ACT
    try {
      await config.flightSuretyApp.registerFlight(flight, timestamp, {
        from: airline,
      });
    } catch (e) {}

    let status;
    try {
      status = await config.flightSuretyApp.isFlightRegistered(
        airline,
        flight,
        timestamp
      );
    } catch (error) {}
    assert.equal(
      status,
      false,
      "Cannot register flight if the airline is not authorized"
    );
  });

  it("(airline) can register flight if airline is authorized", async () => {
    // ARRANGE
    let airline = config.firstAirline;
    let flight = "COST003";
    let timestamp = 10;
    //ACT
    try {
      await config.flightSuretyApp.registerFlight(flight, timestamp, {
        from: airline,
      });
    } catch (e) {}

    let status;
    try {
      status = await config.flightSuretyApp.isFlightRegistered(
        airline,
        flight,
        timestamp
      );
    } catch (error) {}
    assert.equal(
      status,
      true,
      "Can register flight if the airline is authorized"
    );
  });

  it("(airline) can update flight status code", async () => {
    // ARRANGE
    let airline = config.firstAirline;
    let flight = "COST003";
    let timestamp = 10;
    let statusCode = 100;
    //ACT
    try {
      await config.flightSuretyData.updateFlightStatus(
        flight,
        timestamp,
        statusCode,
        airline
      );
    } catch (e) {}

    let status;
    try {
      status = (
        await config.flightSuretyData.fetchFlightStatus(
          flight,
          timestamp,
          airline
        )
      ).toNumber();
    } catch (error) {}
    assert.equal(status, 100, "Cannot update flight status code");
  });

  it("(passenger) cannot buy insurance for a non registered flight", async () => {
    // ARRANGE
    let passenger = accounts[6];
    let airline = config.firstAirline;
    let flight = "COST002";
    let timestamp = 1;
    //ACT
    try {
      await config.flightSuretyApp.buy(airline, flight, timestamp, {
        from: passenger,
        value: web3.utils.toWei("1", "ether"),
      });
    } catch (e) {}

    let status;
    try {
      status = await config.flightSuretyData.isPassengerInsured(
        passenger,
        airline,
        flight,
        timestamp
      );
    } catch (error) {}
    assert.equal(
      status,
      false,
      "Cannot buy insurance from an authorized airline"
    );
  });

  it("(passenger) cannot buy insurance with amount greater than 1 Ether", async () => {
    // ARRANGE
    let passenger = accounts[6];
    let airline = config.firstAirline;
    let flight = "COST003";
    let timestamp = 10;
    //ACT
    try {
      await config.flightSuretyApp.buy(airline, flight, timestamp, {
        from: passenger,
        value: web3.utils.toWei("2", "ether"),
      });
    } catch (e) {}

    let status;
    try {
      status = await config.flightSuretyData.isPassengerInsured(
        passenger,
        airline,
        flight,
        timestamp
      );
    } catch (error) {}
    assert.equal(
      status,
      false,
      "Cannot buy insurance with amount greater than 1 Ether"
    );
  });

  it("(passenger) cannot buy insurance with amount less or equal to 0 Ether", async () => {
    // ARRANGE
    let passenger = accounts[6];
    let airline = config.firstAirline;
    let flight = "COST003";
    let timestamp = 10;
    //ACT
    try {
      await config.flightSuretyApp.buy(airline, flight, timestamp, {
        from: passenger,
        value: web3.utils.toWei("0", "ether"),
      });
    } catch (e) {}

    let status;
    try {
      status = await config.flightSuretyData.isPassengerInsured(
        passenger,
        airline,
        flight,
        timestamp
      );
    } catch (error) {}
    assert.equal(
      status,
      false,
      "Cannot buy insurance with amount less or equal to 0 Ether"
    );
  });

  it("(passenger) can buy insurance", async () => {
    // ARRANGE
    let passenger = accounts[6];
    let airline = config.firstAirline;
    let flight = "COST003";
    let timestamp = 10;
    //ACT
    try {
      await config.flightSuretyApp.buy(airline, flight, timestamp, {
        from: passenger,
        value: web3.utils.toWei("0.5", "ether"),
      });
    } catch (e) {}

    let status;
    try {
      status = await config.flightSuretyData.isPassengerInsured(
        passenger,
        airline,
        flight,
        timestamp
      );
    } catch (error) {}
    assert.equal(status, true, "Can buy insurance");
  });

  it("(passenger) can get the passenger paid insurance amount", async () => {
    // ARRANGE
    let passenger = accounts[6];
    let airline = config.firstAirline;
    let flight = "COST003";
    let timestamp = 10;
    //ACT
    let amount;
    try {
      amount = web3.utils.fromWei(
        await config.flightSuretyApp.getPassengerInsuranceAmount(
          passenger,
          airline,
          flight,
          timestamp
        )
      );
    } catch (e) {}
    assert.equal(amount, 0.5, "Can get the passenger insurance amount");
  });

  it("can register oracles", async () => {
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

    // ACT
    for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
      await config.flightSuretyApp.registerOracle({
        from: accounts[a],
        value: fee,
      });
      let result = await config.flightSuretyApp.getMyIndexes.call({
        from: accounts[a],
      });
      console.log(
        `Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`
      );
    }
  });

  it("can fetch flight status from registered oracles and process insurance for affected customers", async () => {
    //ARRANGE
    let airline = config.firstAirline;
    let flight = "COST003";
    let timestamp = 10;

    await config.flightSuretyApp.fetchFlightStatus.sendTransaction(
      airline,
      flight,
      timestamp
    );

    //ACT
    for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({
        from: accounts[a],
      });
      for (let idx = 0; idx < 3; idx++) {
        try {
          response = await config.flightSuretyApp.submitOracleResponse(
            oracleIndexes[idx],
            airline,
            flight,
            timestamp,
            STATUS_CODE_LATE_AIRLINE,
            { from: accounts[a] }
          );
        } catch (e) {}
      }
    }
    let status = -1;
    try {
      status = (
        await config.flightSuretyData.fetchFlightStatus(
          flight,
          timestamp,
          airline
        )
      ).toNumber();
    } catch (error) {}
    assert.equal(
      status,
      STATUS_CODE_LATE_AIRLINE,
      "Cannot fetch flight status from registered oracles."
    );

    let amount;
    try {
      let passenger = accounts[6];
      amount = web3.utils.fromWei(
        await config.flightSuretyData.getPassengerReimbursement(
          airline,
          flight,
          timestamp,
          passenger
        )
      );
    } catch (error) {}
    assert.equal(amount, 1.5, "Can process insurance for affected customers.");
  });

  // it("Process insurance for affected customers", async() => {

  // })
});
