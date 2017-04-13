const azureArmWebsite = require("azure-arm-website");
const msRestAzure = require("ms-rest-azure");
const fs = require("fs");
const resourceManagement = require('./resourcegroup.js');
var webSiteManagementClient;


function getWebApps(callback) {
    var configfilePath = './config.json';
    var fileContent = fs.readFileSync(configfilePath, 'utf8');
    var config = JSON.parse(fileContent);

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
                console.log(`create websiteclient`);
                console.log(`creds is ${creds}`);
                credentials = creds;

                webSiteManagementClient = new azureArmWebsite(credentials, config.subscriptionId);
                webSiteManagementClient.webApps.list(null, function (err, results) {
                    if (err) {
                        return console.error(err);
                    }

                    results.forEach(function (val) {
                        console.log(`${val.hostNames}, ${val.containerSize}, ${val.location}, ${val.name}, ${val.type}`);
                    })

                    return callback(results);
                });
            }
        });
}

function getWebApp(siteName, callback) {
    getWebApps(function (apps) {
        for (var item of apps) {
            if (item.name === siteName) {
                console.log(`!!!found web app ${siteName}`);
                return callback(item);
            }
        }
        return callback();
    })
}

function createOrGetWebApp(resourceGroupName, name, region, type, size, dockerContainerName) {
    var configfilePath = './config.json';
    var fileContent = fs.readFileSync(configfilePath, 'utf8');
    var config = JSON.parse(fileContent);

    if (resourceManagement.getResourceGroup(resourceGroupName) === null) {
        console.log(`resourceGroup ${resourceGroupName} not exists, creating`);
        resourceManagement.createResourceGroup(resourceGroupName, region);
    } else {
        console.log(`resourceGroup ${resourceGroupName} exists`);
    }

    var serverEnvelope = {
        enable: true,
        location: 'west us',
        type: 'Microsoft.Web/Sites'
    }

    var result = getWebApp(name, function (result) {
        if (typeof result === 'undefined') {

            msRestAzure.loginWithServicePrincipalSecret(
                config.clientId,
                config.key,
                config.tenantId,
                function (err, creds) {
                    if (err) {
                        console.error(err);
                    } else {
                        webSiteManagementClient = new azureArmWebsite(creds, config.subscriptionId);
                        webSiteManagementClient.webApps.createOrUpdate(
                            resourceGroupName,
                            name,
                            serverEnvelope,
                            null,
                            function (err, result) {
                                if (err) {
                                    console.error(err);
                                }
                                console.log(result);
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