const azureArmWebsite = require("azure-arm-website");
const msRestAzure = require("ms-rest-azure");
const fs = require("fs");
const resourceManagement = require('./resourcegroup.js');
const appServicePlan = require('./appServicePlan.js');
const config = JSON.parse(fs.readFileSync('./azure/config.json', 'utf8'));
var webSiteManagementClient;


function getWebApps(callback) {
    msRestAzure.loginWithServicePrincipalSecret(
        config.clientId,
        config.key,
        config.tenantId,
        function (err, creds) {
            if (err) {
                console.error(err);
            } else {
                webSiteManagementClient = new azureArmWebsite(creds, config.subscriptionId);
                webSiteManagementClient.webApps.list(null, function (err, results) {
                    if (err) {
                        return console.error(err, results);
                    }

                    return callback(err, results);
                });
            }
        });
}

function getWebApp(siteName, callback) {
    getWebApps(function (err, apps) {
        for (var item of apps) {
            if (item.name === siteName) {
                return callback(err, item);
            }
        }
        return callback(err, null);
    })
}

// app service plan: https://azure.microsoft.com/en-us/pricing/details/app-service/
// skuName available value: B1/B2/B3, S1/S2/S3, P1/P2/P3/P4
function createOrGetWebApp(resourceGroupName, name, region, skuName, dockerContainerName, callback) {
    resourceManagement.createOrGetResourceGroup(resourceGroupName, null, null, function (err, result) {
        if (err) {
            console.log(`resourceGroup ${resourceGroupName} createOrGet failed, ${err}`);
            return callback(err, null);
        }
    });

    var serverEnvelope = {
        enable: true,
        location: region,
        type: 'Microsoft.Web/Sites'
    }

    var result = getWebApp(name, function (err, result) {
        if (err) {
            console.error(err);
            return callback(err, result);
        }

        if (typeof result === 'undefined' || result === null || result === '') {
            msRestAzure.loginWithServicePrincipalSecret(
                config.clientId,
                config.key,
                config.tenantId,
                function (err, creds) {
                    if (err) {
                        console.error(err);
                        return callback(err, result);
                    } else {
                        webSiteManagementClient = new azureArmWebsite(creds, config.subscriptionId);

                        appServicePlan.createOrGetAppServicePlan(region, skuName, resourceGroupName, function (err, result) {
                            if (typeof result === 'undefined') {
                                return console.error('createOrGetAppServicePlan get undefined');
                            } else {
                                console.log(`appserviceplan is ${result.name}, ${result.id}`);
                                serverEnvelope.serverFarmId = result.id;

                                webSiteManagementClient.webApps.createOrUpdate(
                                    resourceGroupName,
                                    name,
                                    serverEnvelope,
                                    null,
                                    function (err, result) {
                                        if (err) {
                                            console.error(err);
                                            return callback(err, result);
                                        }
                                        console.log('create webapp succeeded')
                                        return callback(err, result);
                                    })
                            }
                        })
                    }
                });
        } else {
            console.log(`site ${name} already exists in region ${result.region}`);
        }
    });
}

exports.createOrGetWebApp = createOrGetWebApp;