import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // User-submitted transaction
        DOM.elid('fund-airline').addEventListener('click', () => {
            let address = DOM.elid('airline-address').value;
            let amount = DOM.elid('amount').value;
            // Write transaction
            contract.fundAirline(address,amount, (error, result) => {
                display('Flight Surety', 'Airline Funding', [ { label: 'Airline Funding Status', error: error, value: result} ]);
            });
        })

        // User-submitted transaction
        DOM.elid('register-airline').addEventListener('click', () => {
            let address = DOM.elid('airline-reg-address').value;
            let regAddress = DOM.elid('airline-registering-address').value;
            let name = DOM.elid('airline-reg-name').value;
            let code = DOM.elid('airline-reg-code').value;
            // Write transaction
            contract.registerAirline(address, regAddress, name,code, (error, result) => {
                display('Flight Surety', 'Airline Registration', [ { label: 'Airline Registration Status', error: error, value: result} ]);
            });
        })

        // User-submitted transaction
        DOM.elid('register-airline-flight').addEventListener('click', () => {
            let address = DOM.elid('airline-flight-reg-address').value;
            let flight = DOM.elid('airline-flight-reg-code').value;
            let timestamp = DOM.elid('airline-flight-reg-timestamp').value;
            // Write transaction
            contract.registerFLight(address,flight,timestamp, (error, result) => {
                display('Flight Surety', 'Flight Registration', [ { label: 'Flight Registration Result', error: error, value: result} ]);
            });
        })

        // User-submitted transaction
        DOM.elid('register-airline-flight-status').addEventListener('click', () => {
            let address = DOM.elid('airline-flight-reg-address').value;
            let flight = DOM.elid('airline-flight-reg-code').value;
            let timestamp = DOM.elid('airline-flight-reg-timestamp').value;
            // Write transaction
            contract.isFlightRegistered(address,flight,timestamp, (error, result) => {
                display('Flight Surety', 'Flight Registration Status', [ { label: 'Flight Registration Status', error: error, value: result} ]);
            });
        })

        

        

        // User-submitted transaction
        DOM.elid('get-airline-details').addEventListener('click', () => {
            let address = DOM.elid('airline-det-address').value;
            // Write transaction
            contract.getAirlineDetails(address, (error, result) => {
                display('Flight Surety', 'Airline Registration', [ { label: 'Airline Details', error: error, value: "Name:"+result.name+" - Code:"+result.code} ]);
            });
        })
    

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let airline = DOM.elid('airline-flight-status-address').value;
            let flight = DOM.elid('airline-flight-status-code').value;
            let timestamp = DOM.elid('airline-fligh-status-timestamp').value;
            // Write transaction
            contract.fetchFlightStatus(airline, flight,timestamp, (error, result) => {
                display('Flight Surety', 'Flight Status', [ { label: 'Result', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        DOM.elid('operational-status-get').addEventListener('click', () => {
            // Write transaction
            contract.isOperational((error, result) => {
                display('Flight Surety', 'Operational Status', [ { label: 'Flight Surety Contract Status', error: error, value: result} ]);
            });
        })
        DOM.elid('registered-airlines-get').addEventListener('click', () => {
            // Write transaction
            contract.getAuthorizedAirlineCount((error, result) => {
                display('Flight Surety', 'Authorized', [ { label: 'Number', error: error, value: result} ]);
            });
        })

        DOM.elid('buy-insurance').addEventListener('click', () => {
            // Write transaction
            let passengerAddress = DOM.elid('airline-insurance-passenger-address').value;
            let airlineAddress = DOM.elid('airline-insurance-buy-address').value;
            let flight = DOM.elid('airline-insurance-buy-code').value;
            let timestamp = DOM.elid('airline-insurance-buy-timestamp').value;
            let amount = DOM.elid('airline-insurance-buy-amount').value;

            contract.buy(passengerAddress,airlineAddress, flight, timestamp,amount,(error, result) => {
                display('Flight Surety', 'Insurance purchase', [ { label: 'Result', error: error, value: result} ]);
            });
        })

        DOM.elid('get-payment-details').addEventListener('click', () => {
            // Write transaction
            let passengerAddress = DOM.elid('passenger-address-payment').value;
            let airlineAddress = DOM.elid('airline-address-payment').value;
            let flight = DOM.elid('flight-code-payment').value;
            let timestamp = DOM.elid('flight-timestamp-payment').value;

            contract.getPassengerReimbursement(airlineAddress,flight, timestamp, passengerAddress,(error, result) => {
                display('Flight Surety', 'Payment Details', [ { label: 'Amount to receive', error: error, value: result} ]);
            });
        })

        DOM.elid('get-withdraw').addEventListener('click', () => {
            // Write transaction
            let passengerAddress = DOM.elid('passenger-address-withdraw').value;
            let airlineAddress = DOM.elid('airline-address-withdraw').value;
            let flight = DOM.elid('flight-code-withdraw').value;
            let timestamp = DOM.elid('flight-timestamp-withdraw').value;

            contract.pay(airlineAddress,flight, timestamp, passengerAddress,(error, result) => {
                display('Flight Surety', 'Withdraw Details', [ { label: 'Result', error: error, value: result} ]);
            });
        })

        

        $('.dropdown-menu').on('click', 'a', function(e) {
            var text = this.text;
            clearScreen();
            let divId
            switch (text) {
                case 'Status':
                    divId="contract-div";
                    showDiv(divId);
                    break;
                case 'Airline Registration':
                    divId="airline-registration-div";
                    showDiv(divId);
                    break;
                case 'Airline Funding':
                    divId="airline-funding-div";
                    showDiv(divId);
                    break;
                case 'Airline Details':
                    divId="airline-details-div";
                    showDiv(divId);
                    break;  
                case 'Airlines Stats':
                    divId="contract-airline-stats-div";
                    showDiv(divId);
                    break;
                case 'Flight Registration':
                    divId="flight-registration-div";
                    showDiv(divId);
                    break;
                case 'Insurance Purchase':
                    divId="insurance-purchase-div";
                    showDiv(divId);
                    break; 
                case 'Flight Status':
                    divId="flight-div";
                    showDiv(divId);
                    break;  
                case 'Payment Details':
                    divId="payment-details-div";
                    showDiv(divId);
                    break;
                case 'Withdraw':
                    divId="withdraw-div";
                    showDiv(divId);
                    break;
                
                    
                    
        
                default:
                    break;
            }
            
          
            
          
            // here add to local storage;
          
          });

        
    
    });
    

})();


function display(title, description, results) {
    let divId = "container-shower"
    let displayDiv = DOM.elid("display-wrapper");
    displayDiv.innerHTML = "";
    let section = DOM.section();
    let row = DOM.div({className: "row"});
    let titleContainer = DOM.div({className: "col-12"});
    titleContainer.appendChild(DOM.h5(title));
    let descContainer = DOM.div({className:"col-12"});
    descContainer.appendChild(DOM.p(description));
    row.appendChild(titleContainer);
    row.appendChild(descContainer);
    results.map((result) => {
        row.appendChild(DOM.div({className: 'col-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    });
    displayDiv.append(section);
    showDiv(divId);

}

function showDiv(divId){
    let div = DOM.elid(divId);
    div.style.display = 'block';
}


function clearScreen(){
    var divs = ['container-shower','contract-div', 'airline-funding-div','flight-registration-div','airline-details-div','contract-airline-stats-div','insurance-purchase-div','flight-div','airline-registration-div','payment-details-div','withdraw-div']
    for (var i = 0; i < divs.length; i++) {
        let div = DOM.elid(divs[i]);
        div.style.display = 'none';        
    }
}