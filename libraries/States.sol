pragma solidity >=0.4.24 <0.7.0;


library AirlineStates {
    struct State {
        mapping(address => bool) airline;
    }

    function has(State storage state, address airlineAddress)
        internal
        view
        returns (bool)
    {
        require(airlineAddress != address(0), "Invalid airline address");
        return state.airline[airlineAddress];
    }

    function addAirlineToState(State storage state, address airlineAddress)
        internal
    {
        require(airlineAddress != address(0), "Invalid airline address");
        require(
            !has(state, airlineAddress),
            "The airline has already this state"
        );
        state.airline[airlineAddress] = true;
    }

    function removeAirlineFromState(State storage state, address airlineAddress)
        internal
    {
        require(airlineAddress != address(0), "Invalid airline address");
        require(
            has(state, airlineAddress),
            "The airline does not have this state"
        );
        delete state.airline[airlineAddress];
    }
}
