'use strict'

const resoureceManagement = require('azure-arm-resource');
const msRestAzure = require("ms-rest-azure");
const fs = require("fs");

function getResourceGroup(resourceGroupName) {
    var configfilePath = './config.json';
    var fileContent = fs.readFileSync(configfilePath, 'utf8');    
    var config = JSON.parse(fileContent);

    msRestAzure.loginWithServicePrincipalSecret(
        config.clientId,    
        config.key, 
        config.tenantId, 
        function(err, creds) {
            if (err) {
                return console.error(err);
            } else
            {
                var client = new resoureceManagement.ResourceManagementClient(creds, config.subscriptionId);
                client.resourceGroups.get(resourceGroupName, null, function(err, result) {
                    if (err) {
                        return console.error(err);
                    }

                    if (result === 'undefined') {
                        console.log(`resourceGroup ${resourceGroupName} not found in subs ${config.subscriptionId}`);
                        return null;
                    }

                    console.log(`resourceGroup ${resourceGroupName} found in subs ${config.subscriptionId}`);
                    return result;
                })                            
            }
    });    
}

function createResourceGroup(resourceGroupName, location, tag) {
    if (resourceGroupName === null) {
        console.error(`resourceGroupName cannot be null`);
        return;
    }

    var configfilePath = './config.json';
    var fileContent = fs.readFileSync(configfilePath, 'utf8');    
    var config = JSON.parse(fileContent);

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
        function(err, creds) {
            if (err) {
                return console.error(err);
            } else
            {
                var client = new resoureceManagement.ResourceManagementClient(creds, config.subscriptionId);
                client.resourceGroups.createOrUpdate(resourceGroupName, groupParameters, null, function(err, result) {
                    if (err) {
                        return console.error(err);
                    }

                    if (result === 'undefined') {
                        console.log(`resourceGroup ${resourceGroupName} not created in subs ${config.subscriptionId}`);
                        return null;
                    }

                    console.log(`resourceGroup ${resourceGroupName} was created in subs ${config.subscriptionId}`);
                    return result;
                })                            
            }
    });    
}

exports.getResourceGroup = getResourceGroup;
exports.createResourceGroup = createResourceGroup;