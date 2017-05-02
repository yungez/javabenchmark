'use strict'

const resoureceManagement = require('azure-arm-resource');
const msRestAzure = require("ms-rest-azure");
const fs = require("fs");
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..\\azure', 'config.json'), 'utf8'));

function getResourceGroup(resourceGroupName, callback) {    
    msRestAzure.loginWithServicePrincipalSecret(
        config.clientId,
        config.key,
        config.tenantId,
        function (err, creds) {
            if (err) {
                return console.error(err);
            } else {
                var client = new resoureceManagement.ResourceManagementClient(creds, config.subscriptionId);
                client.resourceGroups.get(resourceGroupName, null, function (err, result) {
                    if (err) {
                        if (err.statusCode === 404) {
                            console.log(`resourceGroup ${resourceGroupName} not found in subs ${config.subscriptionId}`);
                            return callback(err, result);
                        } else {
                            console.log('in error');
                            return console.error(err);
                        }
                    }

                    console.log(`resourceGroup ${resourceGroupName} found in subs ${config.subscriptionId}`);
                    return callback(err, result);
                })
            }
        });
}

function createResourceGroup(resourceGroupName, location, tag, callback) {
    if (resourceGroupName === null) {
        console.error(`resourceGroupName cannot be null`);
        return;
    }

    var groupParameters = {
        location: location,
        tags: {
            tag
        }
    };

    msRestAzure.loginWithServicePrincipalSecret(
        config.clientId,
        config.key,
        config.tenantId,
        function (err, creds) {
            if (err) {
                return console.error(err);
            } else {
                var client = new resoureceManagement.ResourceManagementClient(creds, config.subscriptionId);
                client.resourceGroups.createOrUpdate(resourceGroupName, groupParameters, null, function (err, result) {
                    if (err) {
                        return console.error(err);
                    }

                    if (result === 'undefined') {
                        console.log(`resourceGroup ${resourceGroupName} not created in subs ${config.subscriptionId}`);
                        return null;
                    }

                    console.log(`resourceGroup ${resourceGroupName} was created in subs ${config.subscriptionId}`);
                    return callback(err, result);
                })
            }
        });
}

function createOrGetResourceGroup(resourceGroupName, location, tag, callback) {
    getResourceGroup(resourceGroupName, function (err, result) {
        if (err) {
            if (err.statusCode === 404) {
                // not exists, create one
                createResourceGroup(resourceGroupName, location, tag, function (err, result) {
                    if (err) {
                        console.error(err);
                        return callback(err, result);
                    } else {
                        console.log(`resourceGroup ${resourceGroupName} was created successfully`);
                        return callback(err, result);
                    }
                })
            }
        } else {
            // exists, return get result directly
            return callback(err, result);
        }
    })
}

exports.getResourceGroup = getResourceGroup;
exports.createResourceGroup = createResourceGroup;
exports.createOrGetResourceGroup = createOrGetResourceGroup;