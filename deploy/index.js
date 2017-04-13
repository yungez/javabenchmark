'use strict'

var deployment = require('./deployment.js');

/*deployment.getWebApp('javatooest', function(response) {
    console.log(`response is ${response}`);
    if (typeof response === 'undefined') {
        console.log('not found!');
    } else {
        console.log(`${response.name} ${response.hostNames}`);
    }
}); */

deployment.createOrGetWebApp('javatest', 'javaltest');