'use strict'

const ComputeManagementClient = require("azure-arm-compute");
const ResourceManagementClient = require("azure-arm-resource").ResourceManagementClient;
const StorageManagementClient = require("azure-arm-storage");
const NetworkManagementClient = require("azure-arm-network");
const msRestAzure = require("ms-rest-azure");

const async = require("async");
const fs = require("fs");
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const vmImageConfig = JSON.parse(fs.readFileSync('./vmImageConfig.json', 'utf8'));

var resourceClient, computeClient, storageClient, networkClient;

function getVirutalMachine(resourceGroupName, vmName, callback) {
    msRestAzure.loginWithServicePrincipalSecret(
        config.clientId,
        config.key,
        config.tenantId,
        function (err, creds) {
            if (err) {
                console.error(err);
                return callback(err, null);
            } else {
                var client = new ComputeManagementClient(creds, config.subscriptionId);
                client.virtualMachines.get(resourceGroupName, vmName, null, function (err, result) {
                    if (err) {
                        if (err.statusCode === 404) {
                            // not found vm
                            // return null
                            return callback(null, null);
                        } else {
                            // other get error, return callback
                            console.error(err);
                            return callback(err, result);
                        }
                    }

                    if (typeof result === 'undefined' || result === '' || result === null) {
                        return console.log(`vm ${vmName} not found in resource group ${resourceGroupName}`);
                    }

                    console.log(`found VM: ${result.hostNames}, ${vresultal.containerSize}, ${result.location}, ${result.name}, ${result.type}`);

                    return callback(err, results);
                });
            }
        });
}

function createOrGetVirtualMachine(resourceGroupName, vmName, region, size, callback) {
    getVirutalMachine(resourceGroupName, vmName, function (err, result) {
        if (typeof result === 'undefined' || result === null || result == '') {
            // not exists, create a new vm
            msRestAzure.loginWithServicePrincipalSecret(
                config.clientId,
                config.key,
                config.tenantId,
                function (err, creds) {
                    if (err) {
                        console.error(err);
                        return callback(err, null);
                    } else {
                        resourceClient = new ResourceManagementClient(creds, config.subscriptionId);
                        computeClient = new ComputeManagementClient(creds, config.subscriptionId);
                        storageClient = new StorageManagementClient(creds, config.subscriptionId);
                        networkClient = new NetworkManagementClient(creds, config.subscriptionId);

                        createStorageAccount(resourceGroupName, 'storageaccountname221', 'west us', 'Standard_LRS', function (err, storageAccount) {
                            if (err) return finalCallback(err);
                            createVNet(resourceGroupName, 'testvnet321', 'west us', function (err, vnetInfo) {
                                if (err) return finalCallback(err);
                                getSubnetInfo(resourceGroupName, vnetInfo.name, vnetInfo.subnets[0].name, function (err, subnetInfo) {
                                    if (err) return finalCallback(err);
                                    createPublicIP(resourceGroupName, 'testpublicip2231', 'west us', 'testdomainlabel32f', function (err, publicIPInfo) {
                                        if (err) return finalCallback(err);
                                        createNIC(resourceGroupName, 'testnetworkinterfacename2039', 'west us', subnetInfo, publicIPInfo, function (err, nicInfo) {
                                            findVMImage('westus', vmImageConfig.linux.publisher, vmImageConfig.linux.offer, vmImageConfig.linux.sku, function (err, vmImageInfo) {
                                                if (err) return finalCallback(err);
                                                createVirtualMachines(resourceGroupName, 'testvm39201', 'westus', '111', storageAccount.name, nicInfo.id,
                                                    vmImageConfig.linux.publisher, vmImageConfig.linux.offer, vmImageConfig.linux.sku, vmImageConfig.linux.osType, vmImageInfo[0].name, function (err, vmInfo) {
                                                        if (err) return finalCallback(err);
                                                        console.log(`vm ${vmInfo.name} created succssfully!`);
                                                        return finalCallback(null, vmInfo);
                                                    });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    }
                })
        }
    });
}

function createStorageAccount(resourceGroupName, name, location, type, callback) {
    console.log(`create storage account ${name}`);
    var accountParameters = {
        location: location,
        sku: {
            name: 'Standard_LRS'
        },
        kind: 'Storage'
    };
    return storageClient.storageAccounts.create(resourceGroupName, name, accountParameters, callback);
}

function createVNet(resourceGroupName, name, location, callback) {
    console.log(`create VNet ${name}`);
    var vnetParameters = {
        location: location,
        addressSpace: {
            addressPrefixes: ['10.0.0.0/16']
        },
        subnets: [{ name: name, addressPrefix: '10.0.0.0/24' }]
    };

    return networkClient.virtualNetworks.createOrUpdate(resourceGroupName, name, vnetParameters, callback);
}

function getSubnetInfo(resourceGroupName, vnetName, subnetName, callback) {
    console.log(`getting subnet ${subnetName}`);
    return networkClient.subnets.get(resourceGroupName, vnetName, subnetName, callback);
}

function createPublicIP(resourceGroupName, publicIPName, location, domainNameLabel, callback) {
    console.log(`creating publicIP ${publicIPName}`);
    var publicIPParameters = {
        location: location,
        publicIPAllocationMethod: 'Dynamic',
        dnsSettings: {
            domainNameLabel: domainNameLabel
        }
    };

    return networkClient.publicIPAddresses.createOrUpdate(resourceGroupName, publicIPName, publicIPParameters, callback);
}

function createNIC(resourceGroupName, networkInterfaceName, location, subnetInfo, publicIPInfo, callback) {
    console.log(`creating NIC ${networkInterfaceName}`);
    var nicParameters = {
        location: location,
        ipConfigurations: [
            {
                name: networkInterfaceName,
                privateIPAllocationMethod: 'Dynamic',
                subnet: subnetInfo,
                publicIPAddress: publicIPInfo
            }
        ]
    };

    return networkClient.networkInterfaces.createOrUpdate(resourceGroupName, networkInterfaceName, nicParameters, callback);
}

function findVMImage(location, publisher, offer, sku, callback) {
    console.log(`finding VMImage ${publisher}`);

    return computeClient.virtualMachineImages.list(location, publisher, offer, sku, {top : 1}, callback);
}

function createVirtualMachines(resourceGroupName, vmName, location, vmSize, storageAccountName, nicId, publisher, offer, sku, osType, vmImageVersionNumber, callback) {
    const vmParameters = {
        location: location,
        osProfile: {
            computerName: vmName,
            adminUsername: 'yungez',
            adminPassword: '#Bugsfor$123'
        },
        hardwareProfile: {
            vmSize: 'Basic_A0'
        },
        storageProfile: {
            imageReference: {
                publisher: publisher,
                offer: offer,
                sku: sku,
                version: vmImageVersionNumber
            },
            osDisk: {
                name: 'randomtest',
                caching: 'None',
                createOption: 'fromImage',
                vhd: { uri: 'https://' + storageAccountName + '.blob.core.windows.net/nodejscontainer/osnodejslinux.vhd' }
            },
        },
        networkProfile: {
            networkInterfaces: [
                {
                    id: nicId,
                    primary: true
                }
            ]
        }
    };

    console.log(`creating VM ${vmName}`);
    return computeClient.virtualMachines.createOrUpdate(resourceGroupName, vmName, vmParameters, callback);
}

function finalCallback(err, result) {
    if (err) return console.error(err);
}

exports.createOrGetVirtualMachine = createOrGetVirtualMachine;