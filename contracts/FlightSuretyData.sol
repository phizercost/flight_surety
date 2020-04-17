pragma solidity >=0.4.24 <0.7.0;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./../libraries/States.sol";


contract FlightSuretyData {
    using SafeMath for uint256;
    using AirlineStates for AirlineStates.State;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false

    mapping(address => bool) authorizedAppContracts;
    AirlineStates.State private registeredAirlines;
    AirlineStates.State private fundedAirlines;
    AirlineStates.State private operationalAirlines;

    uint256 private airlineFundingAmount;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event AuthorizedContractCaller(address appContract);
    event DeAuthorizedContractCaller(address appContract);
    event AirlineRegistered(address airlineAddress);
    event AirlineFunded(address airlineAddress);
    event AirlineDeRegistered(address airlineAddress);
    event ChangedAirlineFundingAmount(uint256 amount);
    event AirlineAuthorized(address airlineAddress);

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor() public {
        contractOwner = msg.sender;
        authorizedAppContracts[contractOwner] = true;
        airlineFundingAmount = 10 ether;
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

    modifier onlyOperationalAirlines(address airlineAddress) {
        require(operationalAirlines.has(airlineAddress), "Airline is not operational");
        _;
    }

    modifier onlyRegisteredAirlines(address airlineAddress) {
        require(
            registeredAirlines.has(airlineAddress),
            "Airline is not registered"
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

    function authorizeCaller(address appContract) public requireContractOwner {
        authorizedAppContracts[appContract] = true;
        emit AuthorizedContractCaller(appContract);
    }

    /**Function to authorize an application contract to call the data contract */

    function deAuthorizeCaller(address appContract)
        public
        requireContractOwner
    {
        delete authorizedAppContracts[appContract];
        emit DeAuthorizedContractCaller(appContract);
    }

    function _registerAirline(address airlineAddress) internal {
        registeredAirlines.addAirlineToState(airlineAddress);
        emit AirlineRegistered(airlineAddress);
    }

    function _deRegisterAirline(address airlineAddress) internal {
        registeredAirlines.removeAirlineFromState(airlineAddress);
        emit AirlineDeRegistered(airlineAddress);
    }

    function _fundAirline(address airlineAddress) internal {
        fundedAirlines.addAirlineToState(airlineAddress);
        emit AirlineFunded(airlineAddress);
    }

    function _authorizeAirline(address airlineAddress) internal {
        operationalAirlines.addAirlineToState(airlineAddress);
        emit AirlineAuthorized(airlineAddress);
    }

    function changeAirlineFundingAmount(uint256 amount)
        public
        requireContractOwner
    {
        airlineFundingAmount = amount;
        emit ChangedAirlineFundingAmount(amount);
    }

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */

    function isOperational() public view returns (bool) {
        return operational;
    }

    function getAirlineFundingAmount() public view returns (uint256) {
        return airlineFundingAmount;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */

    function setOperatingStatus(bool mode) public requireContractOwner {
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

    function isAirline(address airlineAddress) public view returns (bool) {
        return registeredAirlines.has(airlineAddress);
    }

    function isFunded(address airlineAddress) public view returns (bool) {
        return fundedAirlines.has(airlineAddress);
    }

    function isAirlineOperational(address airlineAddress) public view returns (bool) {
        return operationalAirlines.has(airlineAddress);
    }

    function registerAirline(address airlineAddress)
        public
        requireIsOperational
        onlyFundedAirlines(airlineAddress)
    {
        _registerAirline(airlineAddress);
    }

    function fundAirline(address airlineAddress) public requireIsOperational {
        _fundAirline(airlineAddress);
    }

    function authorizeAirline(address airlineAddress)
        public
        requireIsOperational
        onlyRegisteredAirlines(airlineAddress)
    {
        _authorizeAirline(airlineAddress);
    }

    function deRegisterAirline(address airlineAddress)
        external
        requireIsOperational
        onlyRegisteredAirlines(airlineAddress)
    {
        _deRegisterAirline(airlineAddress);
    }

    /**
     * @dev Buy insurance for a flight
     *
     */

    function buy() external payable {}

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

    function payAirlineFunding(address airlineAddress)
        public
        payable
        requireIsOperational
        paidEnough(airlineFundingAmount)
        checkValue(airlineFundingAmount)
    {
        fundAirline(airlineAddress);
        emit AirlineFunded(airlineAddress);
    }

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
