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

  it(`(multiparty) can register the first Airline when the contract is deployed`, async () => {
    let registered = false;
    try {
      registered = await config.flightSuretyData.isAirlineRegistered(
        config.firstAirline
      );
    } catch (error) {
      
    }
    assert.equal(registered, true, "Airline is registered");
  })

  it(`(multiparty) check if airline has paid registration fees`, async () => {
    let funded = false;

    try {
      //Fund the first airline
      await config.flightSuretyData.fundAirline(config.firstAirline, {
        from: config.firstAirline,
        value: web3.utils.toWei("2", "ether"),
      });
    } catch (error) {}
    try {
      funded = await config.flightSuretyData.isAirlineFunded(
        config.firstAirline
      );
    } catch (error) {}
    assert.equal(funded, true, "Airline is not funded");
  });

  it(`(owner) cannot change the registration fees amount if it is not the owner`, async () => {
    let result = 6;
    try {
      //web3.utils.toWei("15", "ether")
      let r = await config.flightSuretyData.setAirlineFundingAmount(
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
      await config.flightSuretyData.setAirlineFundingAmount(
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
      await config.flightSuretyData.setAirlineFundingAmount(
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
      await config.flightSuretyData.fundAirline(newAirline, {
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
        "COSTAIR"
      );
    } catch (e) {}

    try {
      result = await config.flightSuretyData.isAirlineRegistered.call(
        newAirline
      );
    } catch (error) {}

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

  it("(airline) is authorized if is funded and count of airlines is less than required for voting", async () => {
    let newAirline = accounts[2];
    let result;
    try {
      result = await config.flightSuretyData.isAirlineAuthorized(newAirline);
    } catch (error) {}
    assert.equal(result, true, "airline is authorized");
  });

  it("(airline) is not authorized if is funded or registered and count of airlines is greater than required for voting", async () => {
    let registeringAccount1 = config.firstAirline;
    let newAirline1 = accounts[3];
    let newAirline2 = accounts[4];
    let newAirline3 = accounts[5];
    //let newAirline4 = accounts[6];
    let result1, result2, result3, result4;


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

    // try {
    //   await config.flightSuretyData.fundAirline(newAirline4, {
    //     from: newAirline4,
    //     value: web3.utils.toWei("2", "ether"),
    //   });
    // } catch (error) {}

    // ACT
    try {
      await config.flightSuretyData.registerAirline(
        newAirline1,
        "COST1",
        "COSTAIR1",{from:registeringAccount1}
      );
    } catch (e) {}

    try {
      await config.flightSuretyData.registerAirline(
        newAirline2,
        "COST2",
        "COSTAIR2",{from:registeringAccount1}
      );
    } catch (e) {}

    try {
      await config.flightSuretyData.registerAirline(
        newAirline3,
        "COST3",
        "COSTAIR3"
      );
    } catch (e) {}

    // try {
    //   await config.flightSuretyData.registerAirline(
    //     newAirline4,
    //     "COST4",
    //     "COSTAIR4"
    //   );
    // } catch (e) {}

    

    try {
      result1 = await config.flightSuretyData.isAirlineAuthorized(newAirline1);
    } catch (error) {}

    try {
      result2 = await config.flightSuretyData.isAirlineAuthorized(newAirline2);
    } catch (error) {}

    try {
      result3 = await config.flightSuretyData.isAirlineAuthorized(newAirline3);
    } catch (error) {}

    // try {
    //   result4 = await config.flightSuretyData.isAirlineAuthorized(newAirline4);
    // } catch (error) {}

    assert.equal(result1, true, "airline1 is authorized");
    assert.equal(result2, true, "airline2 is authorized");
    assert.equal(result3, false, "airline3 is authorized");
    //assert.equal(result4, false, "airline4 is not authorized");

  });


  it("(airline) cannot vote if it is not an authorized airline", async () => {
    // ARRANGE
    let votingAirline = accounts[6];
    let candidateAirline = accounts[5];
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
    let votingAirline = accounts[4];
    let candidateAirline = accounts[5];

    // ACT
    try {
      await config.flightSuretyData.registerAirline(
        candidateAirline,
        "RWANDAIR",
        "RWA"
      );
    } catch (e) {}
    //ACT
    try {
      await config.flightSuretyData.voteAirline(
        votingAirline,
        candidateAirline
      );
    } catch (e) {
    }

    let votes;
    try {
      votes = (
        await config.flightSuretyData.getAirlineVoteCount(candidateAirline)
      ).toNumber();
    } catch (error) {}
    assert.equal(votes, 1, "Cannot vote if authorized");
  });

  it("(airline) cannot vote twice", async () => {
    // ARRANGE
    let votingAirline = accounts[4];
    let candidateAirline = accounts[5];
    //ACT
    try {
      await config.flightSuretyData.voteAirline(
        votingAirline,
        candidateAirline
      );
    } catch (e) {
    }

    let votes;
    try {
      votes = (
        await config.flightSuretyData.getAirlineVoteCount(candidateAirline)
      ).toNumber();
    } catch (error) {}
    assert.equal(votes, 1, "Can vote twice");
  });

  it("(airline) is authorized if is funded and has collected enough votes", async () => {
    let votingAirline = accounts[3];
    let candidateAirline = accounts[5];
    let result;

    try {
      result = await config.flightSuretyData.isAirlineAuthorized(candidateAirline);
    } catch (error) {}
    assert.equal(result, false, "airline is not authorized");

    try {
      await config.flightSuretyData.voteAirline(votingAirline, candidateAirline);
    } catch (e) {}

    try {
      result = await config.flightSuretyData.isAirlineAuthorized(candidateAirline);
    } catch (error) {}
    assert.equal(result, true, "airline is authorized");
  });

  it("(airline) cannot register flight if airline is not authorized", async () => {
    // ARRANGE
    let registeringAirline = accounts[5];
    let airline = accounts[6];
    let flight = "KQ100";
    let timestamp = 10;
    //ACT

    try {
      await config.flightSuretyData.fundAirline(airline, {
        from: airline,
        value: web3.utils.toWei("2", "ether"),
      });
    } catch (e) {}

    // ACT
    try {
      await config.flightSuretyData.registerAirline(
        airline,
        "KENYA AIRWAYS",
        "KQ",{from:registeringAirline}
      );
    } catch (e) {}



    try {
      await config.flightSuretyData.registerFlight(airline, flight, timestamp);
    } catch (e) {}

    let status;
    try {
      status = await config.flightSuretyData.isFlightRegistered.call(
        airline,
        flight,
        timestamp
      );
    } catch (error) {}
    assert.equal(
      status,
      false,
      "Can register flight if the airline is not authorized"
    );
  });

  it("(airline) can register flight if airline is authorized", async () => {
    // ARRANGE
    let votingAirline1 = accounts[4];
    let votingAirline2 = accounts[3];
    let votingAirline3 = accounts[2];
    let airline = accounts[6];
    let flight = "KQ100";
    let timestamp = 10;
    //ACT

    try {
      await config.flightSuretyData.voteAirline(votingAirline1, airline);
    } catch (e) {}

    try {
      await config.flightSuretyData.voteAirline(votingAirline2, airline);
    } catch (e) {}

    try {
      await config.flightSuretyData.voteAirline(votingAirline3, airline);
    } catch (e) {}

    try {
      await config.flightSuretyData.registerFlight(airline, flight, timestamp);
    } catch (e) {}

    let status;
    try {
      status = await config.flightSuretyData.isFlightRegistered.call(
        airline,
        flight,
        timestamp
      );
    } catch (error) {}
    assert.equal(
      status,
      true,
      "Cannot register flight if the airline is authorized"
    );
  });

  it("(airline) can update flight status code", async () => {
    // ARRANGE
    let airline = accounts[6];
    let flight = "KQ100";
    let timestamp = 10;
    let statusCode = 100;
    //ACT
    try {
      await config.flightSuretyData.updateFlightStatus(
        airline,
        flight,
        timestamp,
        statusCode
      );
    } catch (e) {}

    let status;
    try {
      status = await config.flightSuretyData.getFlightStatusCode.call(
        airline,
        flight,
        timestamp
      );
    } catch (error) {
    }
    assert.equal(status, 100, "Cannot update flight status code");


  });

  it("(passenger) cannot buy insurance for a non registered flight", async () => {
    // ARRANGE
    let passenger = accounts[7];
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
      status = await config.flightSuretyData.isPassengerInsured.call(
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
    let passenger = accounts[7];
    let airline = accounts[6];
    let flight = "KQ100";
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
      status = await config.flightSuretyData.isPassengerInsured.call(
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
    let passenger = accounts[7];
    let airline = accounts[6];
    let flight = "KQ100";
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
      status = await config.flightSuretyData.isPassengerInsured.call(
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
    let passenger = accounts[7];
    let airline = accounts[6];
    let flight = "KQ100";
    let timestamp = 10;
    //ACT
    try {
      await config.flightSuretyApp.buy(airline, flight, timestamp, {
        from: passenger,
        value: web3.utils.toWei("0.5", "ether"),
      });
    } catch (e) {
      console.log(e)
    }

    let status;
    try {
      status = await config.flightSuretyData.isPassengerInsured.call(
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
    let passenger = accounts[7];
    let airline = accounts[6];
    let flight = "KQ100";
    let timestamp = 10;
    //ACT
    let amount;
    try {
      amount = web3.utils.fromWei(
        await config.flightSuretyData.getPassengerInsuranceAmount.call(
          passenger,
          airline,
          flight,
          timestamp
        )
      );
    } catch (e) {}
    assert.equal(amount, 0.5, "Cannot get the passenger insurance amount");
  });

  it("(contract)can register oracles", async () => {
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

  it("(contract)can request flight status", async () => {
    // ARRANGE
    let flight = "KQ100"; // Course number
    let timestamp = 10; //Math.floor(Date.now() / 1000);
    console.log("timestamp ", timestamp);
    let requestIndex;

    // Submit a request for oracles to get status information for a flight
    await config.flightSuretyApp.fetchFlightStatus.sendTransaction(
      accounts[6],
      flight,
      timestamp
    );

    // ACT

    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature

    for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({
        from: accounts[a],
      });
      for (let idx = 0; idx < 3; idx++) {
        try {
          // Submit a response...it will only be accepted if there is an Index match
          await config.flightSuretyApp.submitOracleResponse(
            oracleIndexes[idx],
            accounts[6],
            flight,
            timestamp,
            STATUS_CODE_LATE_AIRLINE,
            {
              from: accounts[a],
            }
          );
          console.log(
            `[${a}]`,
            "\nSuccess",
            idx,
            oracleIndexes[idx].toNumber(),
            accounts[6],
            flight,
            timestamp
          );
        } catch (e) {
          // Enable this when debugging
          console.log(
            "\nError",
            idx,
            oracleIndexes[idx].toNumber(),
            flight,
            timestamp
          );
        }
      }
    }
  });

  it("(contract)can credit insurees of 1.5X the amount they paid", async () => {
    let passenger = accounts[7];
    let airline = accounts[6];
    let flight = "KQ100";
    let timestamp = 10;

    let amount;
    try {
      amount = web3.utils.fromWei(
        await config.flightSuretyData.getPassengerReimbursement.call(
          airline,
          flight,
          timestamp,
          passenger
        )
      );
    } catch (error) {}
    assert.equal(
      amount,
      0.75,
      "Cannot credit insurees of 1.5X the amount they paid"
    );
  });

  it("(passenger) can withdraw the credited insurance", async () => {
    let passenger = accounts[7];
    let airline = accounts[6];
    let flight = "KQ100";
    let timestamp = 10;
    let amountBefore, amountAfter, balanceBefore, balanceAfter, etherBalanceBefore, etherBalanceAfter;

    try {
      balanceBefore = await web3.eth.getBalance(passenger);
      etherBalanceBefore = web3.utils.fromWei(balanceBefore);
      console.log("BALANCE BEFORE: ", etherBalanceBefore);

      amountBefore = web3.utils.fromWei(
        await config.flightSuretyData.getPassengerReimbursement.call(
          airline,
          flight,
          timestamp,
          passenger
        )
      );

      await config.flightSuretyData.pay(airline, flight, timestamp, {
        from: passenger,
      });

      amountAfter = web3.utils.fromWei(
        await config.flightSuretyData.getPassengerReimbursement.call(
          airline,
          flight,
          timestamp,
          passenger
        )
      );

      balanceAfter = await web3.eth.getBalance(passenger);
      etherBalanceAfter = web3.utils.fromWei(balanceAfter);
      console.log("BALANCE AFTER: ", etherBalanceAfter);
    } catch (error) {
      console.log(error);
    }

    let difference = Math.ceil(Math.ceil(etherBalanceAfter * 100) - Math.ceil(etherBalanceBefore * 100))/100;
    assert.equal(
      difference,
      amountBefore,
      "Balance after is not equal to balance before plus insurance"
    );
    assert.equal(
      amountAfter,
      0,
      "Reimbursement amount is not set to zero after withdraw"
    );
  });
});
