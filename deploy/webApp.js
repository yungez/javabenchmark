const azureArmWebsite = require("azure-arm-website");
const msRestAzure = require("ms-rest-azure");
const fs = require("fs");
const resourceManagement = require('./resourcegroup.js');
const appServicePlan = require('./appServicePlan.js');
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
var webSiteManagementClient;


function getWebApps(callback) {
    console.log(`in getall`);
    msRestAzure.loginWithServicePrincipalSecret(
        config.clientId,
        config.key,
        config.tenantId,
        function (err, creds) {
            if (err) {
                console.log('error in login');
                console.error(err);
            } else {
                console.log(`creds is ${creds}`);
                credentials = creds;

                webSiteManagementClient = new azureArmWebsite(credentials, config.subscriptionId);
                webSiteManagementClient.webApps.list(null, function (err, results) {
                    if (err) {
                        return console.error(err, results);
                    }

                    results.forEach(function (val) {
                        console.log(`${val.hostNames}, ${val.containerSize}, ${val.location}, ${val.name}, ${val.type}`);
                    })

                    return callback(err, results);
                });
            }
        });
}

function getWebApp(siteName, callback) {
    getWebApps(function (err, apps) {
        for (var item of apps) {
            if (item.name === siteName) {
                console.log(`!!!found web app ${siteName}`);
                return callback(err, item);
            }
        }
        return callback(err, null);
    })
}

function createOrGetWebApp(resourceGroupName, name, region, type, size, dockerContainerName, callback) {
    resourceManagement.createOrGetResourceGroup(resourceGroupName, null, null, function (err, result) {
        if (err) {
            console.log(`resourceGroup ${resourceGroupName} creatorget failed, ${err}`);
        } else {
            console.log(`resourceGroup ${resourceGroupName} creatorget succeeded, ${result.name}`);
        }
    });

    var serverEnvelope = {
        enable: true,
        location: 'west us',
        type: 'Microsoft.Web/Sites'
    }

    var result = getWebApp(name, function (err, result) {
        if (err) {
            console.error(err);
            return callback(err, result);
        }
        console.log(`getwebapp get ${result}`);
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

                        appServicePlan.createOrGetAppServicePlan(region, 'S1', resourceGroupName, function (err, result) {
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
                                        console.log(result.name + result.region);
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
exports.getWebApp = getWebApp;