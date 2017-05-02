'use strict'

// azure resources
const azureWebApp = require('./azure/webApp.js');
const azureVM = require('./azure/virtualMachine.js');

// aws resources
const awsElasticBeanStalk = require('./aws/elasticBeanStalk.js');
const awsEC2 = require('./aws/EC2.js');

var resource = {};

// azure
// 1. webApp
resource.createOrGetAzureWebApp = function (resourceGroupName, name, region, skuName, callback) {
    return azureWebApp.createOrGetWebApp(resourceGroupName, name, region, skuName, null, callback);
}

resource.startAzureWebApp = function (resourceGroupName, name, callback) {
    return azureWebApp.startWebApp(resourceGroupName, name, callback);
}

resource.stopAzureWebApp = function (resourceGroupName, name, callback) {
    return azureWebApp.stopWebApp(resourceGroupName, name, callback);
}

resource.deleteAzureWebApp = function (resourceGroupName, name, callback) {
    return azureWebApp.deleteWebApp(resourceGroupName, name, callback);
}

// 2. vm
resource.createOrGetAzureVM = function (resourceGroupName, vmName, region, size, osType, callback) {
    return azureVM.createOrGetVirtualMachine(resourceGroupName, vmName, region, size, osType, callback);
}

resource.startAzureVM = function (resourceGroupName, vmName, callback) {
    return azureVM.startVM(resourceGroupName, vmName, callback);
}

resource.stopAzureVM = function (resourceGroupName, vmName, callback) {
    return azureVM.powerOffVM(resourceGroupName, vmName, callback);
}

resource.deleteAzureVM = function (resourceGroupName, vmName, callback) {
    return azureVM.deleteVM(resourceGroupName, vmName, callback);
}

// aws
// 1. elasticBeanStalk
resource.createOrGetAWSElasticBeanStalk = function (appName, envName, size, callback) {
    return awsElasticBeanStalk.createElasticBeanstalkWebApp(appName, envName, 'testsize', callback);
}

resource.startAWSElasticBeanStalk = function () {

}

resource.stopAWSElasticBeanStalk = function () {

}

resource.deleteAWSElasticBeanStalk = function () {

}

// 2. EC2
resource.createOrGetAWSEC2Instance = function (name, region, osType, instanceType, callback) {
    return awsEC2.createEC2Instance(name, region, osType, instanceType, callback);
}

resource.startAWSEC2Instance = function (region, instanceId, callback) {
    return awsEC2.manipulateEC2Instance(region, instanceId, 'ON', callback);
}

resource.stopAWSEC2Instance = function (region, instanceId, callback) {
    return awsEC2.manipulateEC2Instance(region, instanceId, 'OFF', callback);
}

resource.terminateAWSEC2Instance = function (region, instanceId, callback) {
    return awsEC2.terminateEC2Instance(region, instanceId, callback);
}

resource.describeAWSEC2InstanceNetworkInterface = function(region, networkInterfaceId, callback) {
    return awsEC2.describeNetworkInterface(region, networkInterfaceId, callback);
}

module.exports = resource;