'use strict'

const fs = require('fs');
const resource = require('../lib/index.js');
const testConfig = JSON.parse(fs.readFileSync('./testConfig.json', 'utf8'));

function setupTargetTestEnv(callback) {

}

function finalCallback(err, result) {
    if (err) console.error(err);
}

// return list of vms
function prepareAzureTargetResource(callback) {
    var name = '';
    var results = {};

    for (var config of testConfig.resources) {
        if (typeof config.azure === undefined || config.azure === '' || typeof config.aws === undefined || config.aws === '') {
            console.error('testConfig.json invalid');
            return callback('testConfig.json invalid', null);
        }

        if (config.azure.type.toLowerCase() === 'vm') {
            name = config.azure.name || config.azure.size + '_' + config.azure.region.replace(' ', '_') + config.azure.os + '_' + config.azure.type
            resource.createOrGetAzureVM(
                config.azure.resourcegroup,
                name,
                config.azure.size,
                config.azure.os,
                function (err, vm) {
                    if (err) {
                        console.error(err);
                        return callback(err, null);
                    } else {
                        // create done, start it
                        resource.startAzureVM(config.azure.resourcegroup, name, function (err, result) {
                            if (err) {
                                console.error(err);
                                return callback(err, null);
                            } else {
                                console.log(`azure vm ${name} is ready`);

                                // save resource group and vm name to results
                                results.add(config.azure.resourcegroup, name);
                            }
                        });
                    }
                }
            );
        } else if (config.azure.type.toLowerCase() === 'webapp') {
            name = config.azure.name || config.azure.size + '_' + config.azure.region.replace(' ', '_') + '_' + config.azure.type
            resource.createOrGetAzureWebApp(
                config.azure.resourcegroup,
                name,
                config.azure.region,
                config.azure.size,
                function (err, result) {
                    if (err) {
                        console.error(err);
                        return callback(err, null);
                    } else {
                        // create done, start it
                        resource.startAzureWebApp(config.azure.resourcegroup, name, function (err, result) {
                            if (err) {
                                console.error(err);
                                return callback(err, null);
                            } else {
                                console.log(`azure webapp ${name} is ready`);

                                // save resource group and app name to results
                                results.add(config.azure.resourcegroup, name);
                            }
                        });
                    }
                });
        }
    }

    return callback(null, results);
}

function prepareAWSResource(callback) {
    var name = '';
    var results = {};

    for (var resource of testConfig.resources) {
        if (typeof config.aws === undefined || config.aws === '' || typeof config.aws === undefined || config.aws === '') {
            console.error('testConfig.json invalid');
            return callback('testConfig.json invalid', null);
        }

        if (config.aws.type === 'vm') {
            // create aws ec2 instance
            name = config.aws.name || config.aws.size + '_' + config.aws.region.replace(' ', '_') + config.aws.os + '_' + config.aws.type;

            resource.createOrGetAWSEC2Instance(name, config.aws.region, config.aws.os, config.aws.size, function (err, result) {
                if (err) {
                    console.error(err);
                    return callback(err, result);
                } else {
                    var instanceId = result.InstanceId;
                    // start instance
                    resource.startAWSEC2Instance(result.InstanceId, function (err, result) {
                        if (err) {
                            console.error(err);
                            return callback(err, result);
                        } else {
                            console.log(`aws EC2 instance ${result.InstanceId} with name ${name} ready`);
                            results.add(name, instanceId);
                        }
                    })
                }
            })
        }
    }
}

exports.setupTargetTestEnv = setupTargetTestEnv;
