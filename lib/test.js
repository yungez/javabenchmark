'use strict'

var webApp = require('./azure/webApp.js');
var vm = require('./azure/virtualMachine.js');
var resourceGroup = require('./azure/resourceGroup.js');
var appServicePlan = require('./azure/appServicePlan.js');

var awsEC2 = require('./aws/EC2.js');
var utility = require('./common.js');

var elb = require('./aws/elasticBeanStalk.js');
elb.createElasticBeanstalkWebApp('us-west-1', 'testlinuxdocker2', 'testenv2', 'testsize', 'version2', function (err, result) {
    if (err) {
        console.error('elb failed ' + err);
    } else {
        console.log('elb done ' + JSON.stringify(result));
    }
})
// vm.createStorageAccount('test1', 'teststorage68435', 'east us', '', function(err, result) {
//     if (err) {
//         return console.error(err);
//     } else {
//         console.log('create storage done: ' + result);
//     }
// })


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

// vm.createOrGetVirtualMachine('javatest', 'vmtest12345', 'west us', 1, function(err, result) {
//     if (err) {
//         console.error(`createOrGetVirtualMachine vmtest1234 failed`);
//     } else {
//         console.log(`createOrGetVirtualMachine vmtest1234 succeeded ${result.id}`);
//     }
// });

// awsEC2.createEC2Instance('testec21', 'us-east-1', 'ubuntu', 't2.micro', function(err, data) {
//     if (err) {
//         console.log(`createEC2Instance error ${err}`);
//     } else {
//         console.log(`createEC2Instance succeeded ${data}`);
//     }
// })

//awsEC2.findImage('test', 'ca-central-1', function(err, data) {
// awsEC2.createEC2Instance('testvm', 'ca-central-1', 'ubuntu', 't2.micro', function(err, data) {
//     if (err) {
//         console.log('createEC2Instance error: ' + err);
//     } else {
//         console.log('createEC2Instance: ' + data) ;
//     }

// })

// utility.sshExecCmd('ec2-52-60-211-198.ca-central-1.compute.amazonaws.com', 'ubuntu', 'E:\\vsiot1\\keypair-ca-central-1.pem', 'ls', '', function(err) {
// if(err) console.error('ssh error: ' + err);
// console.log('ssh done');
// }

// )
