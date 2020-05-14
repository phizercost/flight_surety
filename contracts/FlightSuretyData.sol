pragma solidity >=0.4.24 <0.7.0;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./../libraries/States.sol";


contract FlightSuretyData {
    using SafeMath for uint256;
    using AirlineStates for AirlineStates.State;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    struct Airline {
        string name;
        string code;
        uint256 votes;
        uint256 funds;
        address airlineAddress;
    }

    struct Vote {
        address voter;
        address airlineAddress;
    }

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }


    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false
    mapping(address => bool) authorizedAppContracts;
    mapping(address => Airline) private airlines;
    mapping(bytes32 => bool) private votes;
    mapping(bytes32 => Flight) private flights;
    mapping(bytes32 => mapping(address => uint256)) private insurances;
    address[] authorizedAirlinesArray = new address[](0);
    AirlineStates.State private fundedAirlines;
    AirlineStates.State private registeredAirlines;
    AirlineStates.State private authorizedAirlines;

    uint256 private airlineFundingAmount;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event AuthorizedContractCaller(address appContract);
    event DeAuthorizedContractCaller(address appContract);
    event ChangedAirlineFundingAmount(uint256 amount);
    event AirlineFunded(address airlineAddress);
    event AirlineRegistered(address airlineAddress);
    event AirlineAuthorized(address airlineAddress);
    event AirlineVoted(address airlineAddress);

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor() public {
        contractOwner = msg.sender;
        authorizedAppContracts[contractOwner] = true;
        airlineFundingAmount = 2 ether;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier onlyFundedAirlines(address airlineAddress) {
        require(fundedAirlines.has(airlineAddress), "Airline is not funded");
        _;
    }

    modifier onlyRegisteredAirlines(address airlineAddress) {
        require(
            registeredAirlines.has(airlineAddress),
            "Airline is not registered"
        );
        _;
    }

    modifier voteIsNotDuplicate(address voter, address candidate) {
        Vote memory vote = Vote({voter: voter, airlineAddress: candidate});
        bytes32 voteHash = keccak256(
            abi.encodePacked(vote.voter, vote.airlineAddress)
        );
        require(!votes[voteHash], "This airline has already voted");
        _;
    }

    modifier onlyAuthorizedAirlines(address airlineAddress) {
        require(
            authorizedAirlines.has(airlineAddress),
            "Airline is not authorized"
        );
        _;
    }

    modifier onlyFlightOwner(address airline, string flight, uint256 timestamp) {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        require(
            flights[flightKey].airline == airline,
            "Only flight owner is allowed to do this"
        );
        _;
    }

    modifier paidEnough(uint256 amount) {
        require(msg.value >= amount, "Have not paid enough");
        _;
    }

    modifier checkValue(uint256 amount) {
        _;
        uint256 amountToRefund = msg.value.sub(amount);
        msg.sender.transfer(amountToRefund);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**Function to authorize an application contract to call the data contract */

    function authorizeCaller(address appContract)
        external
        requireContractOwner
    {
        authorizedAppContracts[appContract] = true;
        emit AuthorizedContractCaller(appContract);
    }

    /**Function to authorize an application contract to call the data contract */

    function deAuthorizeCaller(address appContract)
        external
        requireContractOwner
    {
        delete authorizedAppContracts[appContract];
        emit DeAuthorizedContractCaller(appContract);
    }

    function changeAirlineFundingAmount(uint256 amount)
        external
        requireContractOwner
    {
        airlineFundingAmount = amount;
        emit ChangedAirlineFundingAmount(amount);
    }

    function _fundAirline(address airlineAddress) internal {
        fundedAirlines.addAirlineToState(airlineAddress);
        emit AirlineFunded(airlineAddress);
    }

    function _registerAirline(address airlineAddress) internal {
        registeredAirlines.addAirlineToState(airlineAddress);
        emit AirlineRegistered(airlineAddress);
    }

    function _authorizeAirline(address airlineAddress) internal {
        authorizedAirlines.addAirlineToState(airlineAddress);
        authorizedAirlinesArray.push(airlineAddress);
        emit AirlineAuthorized(airlineAddress);
    }

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */

    function isOperational() external view returns (bool) {
        return operational;
    }

    function getAirlineFundingAmount() external view returns (uint256) {
        return airlineFundingAmount;
    }

    function registerFunds(
        address passengerAddress,
        address airlineAddress, string flight, uint256 timestamp,
        uint256 amount
    ) external {
        uint256 funds = airlines[airlineAddress].funds;
        airlines[airlineAddress].funds = funds.add(amount);
        bytes32 flightKey = getFlightKey(airlineAddress,flight,timestamp);
        insurances[flightKey][passengerAddress] = amount;
    }

    function getPassengerInsuranceAmount(
        address passengerAddress,
        address airline,
        string flight,
        uint256 timestamp
    ) public view returns (uint256) {
        if (!isPassengerInsured(passengerAddress, airline, flight, timestamp)) {
            return 0;
        } else {
            bytes32 flightKey = getFlightKey(airline, flight, timestamp);
            return insurances[flightKey][passengerAddress];
        }
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */

    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */

    function isAirlineRegistered(address airlineAddress)
        public
        view
        returns (bool)
    {
        return registeredAirlines.has(airlineAddress);
    }

    function isAirlineFunded(address airlineAddress)
        public
        view
        returns (bool)
    {
        return fundedAirlines.has(airlineAddress);
    }

    function fundAirline(address airlineAddress)
        public
        payable
        requireIsOperational
        paidEnough(airlineFundingAmount)
        checkValue(airlineFundingAmount)
    {
        _fundAirline(airlineAddress);

        if (isAirlineRegistered(airlineAddress)) {
            uint256 airlineCount = getAuthorizedAirlineCount();
            if (airlineCount < 4) {
                authorizeAirline(airlineAddress);
            } else {
                uint256 totalVotes = getAirlineVoteCount(airlineAddress);
                if (totalVotes >= airlineCount / 2) {
                    authorizeAirline(airlineAddress);
                }
            }
        }
    }

    function getAirlineVoteCount(address airlineAddress)
        public
        view
        onlyRegisteredAirlines(airlineAddress)
        returns (uint256)
    {
        return airlines[airlineAddress].votes;
    }

    function getAuthorizedAirlineCount() internal view returns (uint256) {
        return authorizedAirlinesArray.length;
    }

    function registerAirline(
        address airlineToRegister,
        string airlineCode,
        string airlineName
    ) public requireIsOperational() {
        require(
            getAuthorizedAirlineCount() >= 4,
            "Register directly only if there is at least 4 authorized airlines to vote"
        );
        Airline memory _airline = Airline({
            name: airlineName,
            code: airlineCode,
            votes: 0,
            funds: 0,
            airlineAddress: airlineToRegister
        });

        airlines[_airline.airlineAddress] = _airline;
        _registerAirline(airlineToRegister);
    }

    function registerAirline(
        address airlineToRegister,
        string airlineCode,
        string airlineName,
        address airlineRegistering
    ) public requireIsOperational() {
        require(
            getAuthorizedAirlineCount() < 4,
            "Register another airline only if there is less than 4 authorized airlines"
        );
        require(
            isAirlineAuthorized(airlineRegistering) ||
                getAuthorizedAirlineCount() == 0,
            "Only authorized airlines or first ever airline"
        );
        Airline memory _airline = Airline({
            name: airlineName,
            code: airlineCode,
            votes: 0,
            funds: 0,
            airlineAddress: airlineToRegister
        });

        airlines[_airline.airlineAddress] = _airline;
        _registerAirline(airlineToRegister);
    }

    function voteAirline(address votingAirline, address candidateAirline)
        public
        onlyAuthorizedAirlines(votingAirline)
        onlyRegisteredAirlines(candidateAirline)
        voteIsNotDuplicate(votingAirline, candidateAirline)
    {
        Vote memory vote = Vote({
            voter: votingAirline,
            airlineAddress: candidateAirline
        });
        airlines[candidateAirline].votes = airlines[candidateAirline].votes.add(
            1
        );
        bytes32 voteHash = keccak256(
            abi.encodePacked(vote.voter, vote.airlineAddress)
        );
        votes[voteHash] = true;

        emit AirlineVoted(candidateAirline);

        uint256 totalVotes = getAirlineVoteCount(candidateAirline);
        uint256 airlineCount = getAuthorizedAirlineCount();
        if (
            totalVotes >= airlineCount / 2 && isAirlineFunded(candidateAirline)
        ) {
            authorizeAirline(candidateAirline);
        }
    }

    function getAirlineDetails(address airlineAddress)
        public
        view
        onlyRegisteredAirlines(airlineAddress)
        returns (
            string name,
            string code,
            uint256 voteCount,
            uint256 funds,
            address airlAdd
        )
    {
        Airline memory airline = airlines[airlineAddress];
        name = airline.name;
        code = airline.code;
        voteCount = airline.votes;
        funds = airline.funds;
        airlAdd = airline.airlineAddress;

        return (name, code, voteCount, funds, airlAdd);
    }

    function authorizeAirline(address airlineAddress)
        public
        requireIsOperational
        onlyRegisteredAirlines(airlineAddress)
    {
        _authorizeAirline(airlineAddress);
    }

    function isAirlineAuthorized(address airlineAddress)
        public
        view
        returns (bool)
    {
        return authorizedAirlines.has(airlineAddress);
    }

    function isPassengerInsured(address passengerAddress,address airline,
        string flight,
        uint256 timestamp)
        public
        view
        returns (bool)
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        uint256 amount = insurances[flightKey][passengerAddress];
        if(amount == 0){
            return false;
        }else {
            return true;
        }
    }

    function registerFlight(address airline, string flight, uint256 timestamp)
        external
        requireIsOperational
        onlyAuthorizedAirlines(airline)
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        flights[flightKey].isRegistered = true;
        flights[flightKey].updatedTimestamp = timestamp;
        flights[flightKey].airline = airline;
    }

    function isFlightRegistered(
        address airline,
        string flight,
        uint256 timestamp
    ) public view returns (bool) {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        if (flights[flightKey].isRegistered) {
            return true;
        } else {
            return false;
        }
    }

    function updateFlightStatus(
        string flight,
        uint256 timestamp,
        uint8 statusCode,
        address airline
    ) external requireIsOperational {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        flights[flightKey].statusCode = statusCode;
    }

    function fetchFlightStatus(string flight,
        uint256 timestamp,
        address airline) public view returns(uint256){
            require(isFlightRegistered(airline, flight, timestamp), "The flight should exist before getting its status");
            bytes32 flightKey = getFlightKey(airline, flight, timestamp);
            return flights[flightKey].statusCode;
        }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees() external pure {}

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay() external pure {}

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */

    function fund() public payable requireIsOperational {}

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    // function() external payable {
    //     fund();
    // }
}
