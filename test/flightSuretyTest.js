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

    try {
      //Fund the first airline
      await config.flightSuretyData.fundAirline(config.firstAirline, {
        from: config.firstAirline,
        value: web3.utils.toWei("10", "ether"),
      });
    } catch (error) {
      console.log(error);
    }
    //Register the first airline
    try {
      await config.flightSuretyApp.registerAirline("FIRST AIRLINE", "FIRST",config.firstAirline);
    } catch (e) {}

    try {
      //Authorize the first airline
      await config.flightSuretyData.authorizeAirline(config.firstAirline);
    } catch (error) {
      console.log(error);
    }

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
      funded = await config.flightSuretyData.isFunded(config.firstAirline);
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
      10,
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
        web3.utils.toWei("10", "ether"),
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
    assert.equal(result, 10, "Airline can query the registration fees amount");
  });

  it("(airline) can fund the airline with the amount required", async () => {
    // ARRANGE
    let newAirline = accounts[3];
    // ACT
    try {
      await config.flightSuretyData.fundAirline(newAirline, {
        from: newAirline,
        value: web3.utils.toWei("10", "ether"),
      });
    } catch (e) {}
    let result = await config.flightSuretyData.isFunded.call(newAirline);
    // ASSERT
    assert.equal(
      result,
      true,
      "Airline funding should should be equal to the required funding amount"
    );
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
    let result = await config.flightSuretyData.isFunded.call(newAirline);
    // ASSERT
    assert.equal(
      result,
      false,
      "Airline funding should should be equal to the required funding amount"
    );
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

  it("(airline) can register an Airline using registerAirline() if it is funded", async () => {
    // ARRANGE
    let newAirline = accounts[4];
    try {
      await config.flightSuretyData.fundAirline(newAirline, {
        from: newAirline,
        value: web3.utils.toWei("10", "ether"),
      });
    } catch (e) {}

    // ACT
    try {
      await config.flightSuretyApp.registerAirline("COSTAIR","COST",newAirline);
    } catch (e) {}
    let result = await config.flightSuretyData.isAirline.call(
      newAirline
    );

    // ASSERT
    assert.equal(
      result,
      true,
      "Airline should be able to register another airline if it has provided funding"
    );
  });


  it("(airline) can get details of a registered airlines", async () => {
    // ARRANGE
    let newAirline = accounts[5];
    let result;
    try {
      await config.flightSuretyData.fundAirline(newAirline, {
        from: newAirline,
        value: web3.utils.toWei("10", "ether"),
      });
    } catch (e) {}

    // ACT
    try {
      let result = await config.flightSuretyApp.registerAirline("RWANDAIR","RW",newAirline);
    } catch (e) {
      console.log(e)
    }
    try {
       result = await config.flightSuretyApp.getAirlineDetails(
        newAirline
      );
    } catch (error) {
      console.log(error)
    }

    // ASSERT
    assert.equal(
      result.name,
      "RWANDAIR",
      "Should be able to get the airline details"
    );
  });


  // it("(airline) cannot vote if it is not an authorized airline", async () => {
  //   // ARRANGE
  //   let votingAirline = accounts[2];
  //   let candidateAirline = accounts[3];
  //   //ACT
  //   try {
  //     await config.flightSuretyApp.voteAirline(candidateAirline, {
  //       from: votingAirline,
  //     });
  //   } catch (e) {}
  //     let votes = await config.flightSuretyApp.getAirlineDetails.call(candidateAirline);
  //   assert.equal(
  //     votes.votes,
  //     0,"Cannot vote if not authorized"
  //   )

  // });


  // it("airline cannot authorize airline which is not funded", async () => {
  //   try {
  //     await config.flightSuretyData.authorizeAirline(config.firstAirline);
  //   } catch (error) {
  //   }
  //   let isAuthorized = await config.flightSuretyData.isAirlineOperational.call(config.firstAirline);
  //   assert.equal(isAuthorized, false, "Airline can be authorized only if it has paid registration fees");
  // });

  // it("airline can authorize airline which is funded", async () => {
  //   try {
  //     await config.flightSuretyData.payAirlineFunding(config.firstAirline, {
  //       from: config.firstAirline, value: web3.utils.toWei("10", 'ether')
  //     });
  //     await config.flightSuretyData.authorizeAirline(config.firstAirline);
  //   } catch (error) {
  //   }
  //   let isAuthorized = await config.flightSuretyData.isAirlineOperational.call(config.firstAirline);
  //   assert.equal(isAuthorized, true, "Airline can be authorized only if it has paid registration fees");
  // });

  

  // it("(owner) cannot change the airline registration fees by someone who is not the owner", async () => {
  //   // ARRANGE
  //   let newFeesAmount = "15";

  //   // ACT
  //   try {
  //     await config.flightSuretyData.changeAirlineFundingAmount(web3.utils.toWei(newFeesAmount, 'ether'), {
  //       from: config.firstAirline,
  //     });
  //   } catch (e) {}
  //   let result = web3.utils.fromWei(await config.flightSuretyData.getAirlineFundingAmount(), 'ether');

  //   // ASSERT
  //   assert.equal(
  //     result,
  //     "10",
  //     "Registration fees is equal to the previous value"
  //   );
  // })

  // it("(owner) can change the airline registration fees", async () => {
  //   // ARRANGE
  //   let newFeesAmount = "15";

  //   // ACT
  //   try {
  //     await config.flightSuretyData.changeAirlineFundingAmount(web3.utils.toWei(newFeesAmount, 'ether'), {
  //       from: config.owner,
  //     });
  //   } catch (e) {}
  //   let result = web3.utils.fromWei(await config.flightSuretyData.getAirlineFundingAmount(), 'ether');

  //   // ASSERT
  //   assert.equal(
  //     newFeesAmount,
  //     result,
  //     "Registration fees is equal to the new value"
  //   );
  // });
});
