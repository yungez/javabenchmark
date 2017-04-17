'use strict'

const azureArmWebsite = require("azure-arm-website");
const msRestAzure = require("ms-rest-azure");
const fs = require("fs");
const config = JSON.parse(fs.readFileSync('./azure/config.json', 'utf8'));

function createOrGetAppServicePlan(location, sku, resourceGroupName, callback) {
    var appServicePlanName = (location + '_' + sku).replace(' ', '_');

    msRestAzure.loginWithServicePrincipalSecret(
        config.clientId,
        config.key,
        config.tenantId,
        function (err, creds) {
            if (err) {
                console.error(err);
            } else {
                var webSiteManagementClient = new azureArmWebsite(creds, config.subscriptionId);
                webSiteManagementClient.appServicePlans.get(
                    resourceGroupName,
                    appServicePlanName,
                    null,
                    function (err, appserviceplan) {
                        if (err) {
                            if (err.statusCode === 404) {
                                // not found
                                // create one
                                var appServicePlanDetail = {
                                    appServicePlanName: appServicePlanName,
                                    sku: {
                                        name: 'S1',
                                        tier: 'S1',
                                        size: '1'
                                    },
                                    location: location
                                }

                                webSiteManagementClient.appServicePlans.createOrUpdate(
                                    resourceGroupName,
                                    appServicePlanName,
                                    appServicePlanDetail,
                                    function (err, result) {
                                        if (err) {
                                            console.error(err);
                                        } else {
                                            console.log(`appServicePlan ${appServicePlanName} created in resource group ${resourceGroupName}`);
                                        }
                                        return callback(err, result);
                                    }
                                )
                                // cretion done
                            } else {
                                // other get error, callback
                                return callback(err, appserviceplan);
                            }
                        } else {
                            // get exists, directly callback result
                            return callback(err, appserviceplan);
                        }
                    })
            }
        });
}

exports.createOrGetAppServicePlan = createOrGetAppServicePlan;