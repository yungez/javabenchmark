'use strict'

var webApp = require('./webApp.js');
var vm = require('./virtualMachine.js');
var resourceGroup = require('./resourceGroup.js');
var appServicePlan = require('./appServicePlan.js');

/*deployment.getWebApp('javatooest', function(response) {
    console.log(`response is ${response}`);
    if (typeof response === 'undefined') {
        console.log('not found!');
    } else {
        console.log(`${response.name} ${response.hostNames}`);
    }
}); */

// resourceGroup.createOrGetResourceGroup('javatest22112', 'westus', 'test', function(err, result) {
//     if (err) {
//         console.error(`createOrGetResourceGroup error: ${err}`);
//     } else {
//         console.log(`resource group javatest222 created succsffully ${result.name}`);
//     }
// });

// resourceGroup.createOrGetResourceGroup()

// appServicePlan.createOrGetAppServicePlan('westus','S1','javatest', function(err, result) {
//     if (err) {
//         console.error(`createOrGetAppServicePlan javaetst failed`);
//     } else {
//         console.log(`createOrGetAppServicePlan javaetst failed ${result.name}`);
//     }
// });

// webApp.createOrGetWebApp('javatest', 'testweb33333', 'west us', null, 2, null, function(err, result) {
//     if (err) {
//         console.error(`createOrGetWebApp testweb33333 failed`);
//     } else {
//         console.log(`createOrGetWebApp testweb33333 succeeded ${result.name}`);
//     }
// });

vm.createOrGetVirtualMachine('javatest', 'vmtest1234', 'west us', 1, function(err, result) {
    if (err) {
        console.error(`createOrGetVirtualMachine vmtest1234 failed`);
    } else {
        console.log(`createOrGetVirtualMachine vmtest1234 succeeded ${result.id}`);
    }
})
