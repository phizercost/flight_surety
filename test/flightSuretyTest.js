var Test = require("../config/testConfig.js");
var BigNumber = require("bignumber.js");
require("web3");

contract("Flight Surety Tests", async (accounts) => {
  var config;
  before("setup contract", async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(
      config.flightSuretyApp.address
    );
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

  it("(airline) cannot register an Airline using registerAirline() if it is not funded", async () => {
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, {
        from: config.firstAirline,
      });
    } catch (e) {}
    let result = await config.flightSuretyData.isAirline.call(newAirline);

    // ASSERT
    assert.equal(
      result,
      false,
      "Airline should not be able to register another airline if it hasn't provided funding"
    );
  });

  it("(airline cannot fund the airline with an amount less than required", async () => {
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
      await config.flightSuretyApp.payAirlineFunding(newAirline, {
        from: config.firstAirline, value: 4
      });
    } catch (e) {}
    let result = await config.flightSuretyData.isFunded.call(newAirline);
    // ASSERT
    assert.equal(
      result,
      false,
      "Airline funding should should be equal to the required funding amount"
    );
  });

  it("(airline can fund the airline with an amount equal to the required", async () => {
    // ARRANGE
    let newAirline = accounts[2];
    let ether = await config.flightSuretyData.getAirlineFundingAmount();
    // ACT
    try {
      await config.flightSuretyData.payAirlineFunding(newAirline, {
        from: config.firstAirline, value: web3.utils.toWei("10", 'ether')
      });
    } catch (e) {
      console.error(e);
    }
    let result = await config.flightSuretyData.isFunded.call(newAirline);
    // ASSERT
    assert.equal(
      result,
      true,
      "Airline funding is equal to the required funding amount"
    );
  });



  it("(airline) can register an Airline using registerAirline() if it is funded", async () => {
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, {
        from: config.firstAirline,
      });
    } catch (e) {}
    let result = await config.flightSuretyData.isAirline.call(newAirline);

    // ASSERT
    assert.equal(
      result,
      false,
      "Airline should not be able to register another airline if it hasn't provided funding"
    );
  });

  it("(airline) cannot vote if it is not an authorized airline", async () => {
    // ARRANGE
    let newAirlineCandidate = accounts[2];
    // ACT
    // try {
    //   await config.flightSuretyApp.voteAirline(newAirlineCandidate, {
    //     from: config.firstAirline,
    //   });
    // } catch (e) {}
    let votes = await config.flightSuretyApp.getAirlineDetails(newAirlineCandidate, {from: config.firstAirline});
    assert.equal(
      votes,
      0,"Cannot vote if not authorized"
    )

  });

  it("(owner) cannot change the airline registration fees by someone who is not the owner", async () => {
    // ARRANGE
    let newFeesAmount = "15";

    // ACT
    try {
      await config.flightSuretyData.changeAirlineFundingAmount(web3.utils.toWei(newFeesAmount, 'ether'), {
        from: config.firstAirline,
      });
    } catch (e) {}
    let result = web3.utils.fromWei(await config.flightSuretyData.getAirlineFundingAmount(), 'ether');

    // ASSERT
    assert.equal(
      result,
      "10",
      "Registration fees is equal to the previous value"
    );
  })

  it("(owner) can change the airline registration fees", async () => {
    // ARRANGE
    let newFeesAmount = "15";

    // ACT
    try {
      await config.flightSuretyData.changeAirlineFundingAmount(web3.utils.toWei(newFeesAmount, 'ether'), {
        from: config.owner,
      });
    } catch (e) {}
    let result = web3.utils.fromWei(await config.flightSuretyData.getAirlineFundingAmount(), 'ether');

    // ASSERT
    assert.equal(
      newFeesAmount,
      result,
      "Registration fees is equal to the new value"
    );
  });
});
