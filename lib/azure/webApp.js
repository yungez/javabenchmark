const azureArmWebsite = require("azure-arm-website");
const msRestAzure = require("ms-rest-azure");
const fs = require("fs");
const resourceManagement = require('./resourcegroup.js');
const appServicePlan = require('./appServicePlan.js');
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..\\azure', 'config.json'), 'utf8'));

var credentials = new msRestAzure.ApplicationTokenCredentials(config.clientId, config.tenantId, config.key);
var webSiteManagementClient = new azureArmWebsite(credentials, config.subscriptionId);


function getWebApps(callback) {
    webSiteManagementClient.webApps.list(null, function (err, results) {
        if (err) {
            return console.error(err, results);
        }

        return callback(err, results);
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
    resourceManagement.createOrGetResourceGroup(resourceGroupName, region, 'test', function (err, result) {
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
            appServicePlan.createOrGetAppServicePlan(region, skuName, resourceGroupName, function (err, result) {
                if (typeof result === 'undefined') {
                    return console.error('createOrGetAppServicePlan get undefined');
                } else {
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
                            console.log(`creating webapp ${name} succeeded`);
                            return callback(err, result);
                        })
                }
            });
        } else {
            console.log(`webapp ${name} already exists`);
            return callback(err, result);
        }
    });
}

function deleteWebApp(resourceGroupName, webappName, callback) {
    webSiteManagementClient.webApps.deleteMethod(resourceGroupName, webappName, function (err, result) {
        if (err) {
            console.error(err);
            return callback(err, result);
        } else {
            console.log(`webapp ${name} deleting successful`);
            return callback(err, result);
        }
    });
}

function stopWebApp(resourceGroupName, name, callback) {
    webSiteManagementClient.webApps.stop(resourceGroupName, name, null, function (err, result) {
        if (err) {
            console.error(err);
            return callback(err, result);
        } else {
            console.log(`webapp ${name} stopping successful`);
            return callback(err, result);
        }
    });
}

function startWebApp(resourceGroupName, name, callback) {
    webSiteManagementClient.webApps.start(resourceGroupName, name, null, function (err, result) {
        if (err) {
            console.error(err);
            return callback(err, result);
        } else {
            console.log(`webapp ${name} starting successful`);
            return callback(err, result);
        }
    });
}

exports.createOrGetWebApp = createOrGetWebApp;
exports.startWebApp = startWebApp;
exports.stopWebApp = stopWebApp;
exports.deleteWebApp = deleteWebApp;