'use strict'

const ComputeManagementClient = require("azure-arm-compute");
const ResourceManagementClient = require("azure-arm-resource").ResourceManagementClient;
const StorageManagementClient = require("azure-arm-storage");
const NetworkManagementClient = require("azure-arm-network");
const msRestAzure = require("ms-rest-azure");
const storage = require("azure-storage");

const fs = require("fs");
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..\\azure', 'config.json'), 'utf8'));
const vmImageConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..\\azure', 'vmImageConfig.json'), 'utf8'));
const utils = require('./utils.js');
const resourcegroup = require('./resourcegroup.js');

var credentials = new msRestAzure.ApplicationTokenCredentials(config.clientId, config.tenantId, config.key);

var resourceClient, computeClient, networkClient;
var storageClient = new StorageManagementClient(credentials, config.subscriptionId);

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

                    console.log(`found VM: ${result.hostNames}, ${result.containerSize}, ${result.location}, ${result.name}, ${result.type}`);

                    return callback(err, results);
                });
            }
        });
}

// location is like : west us
// vmSize is like : Standard_A1, Standard_D2_v2, Standard_DS14_v2. detail https://docs.microsoft.com/en-us/azure/virtual-machines/windows/sizes-general
function createOrGetVirtualMachine(resourceGroupName, vmName, location, vmSize, osType, callback) {

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

                var storageAccountName = resourceGroupName + location.replace(' ', '') + 'disk';
                var vnetName = resourceGroupName + '-' + location.replace(' ', '') + '-vnet';
                var publichIPName = vmName + '-ip';
                var networkInterfaceName = vmName + '-nic';
                var domainLableName = 'testdomain' + utils.generateRandomId('');
                var nsgName = vmName + '-nsg';

                if (osType !== 'windows' && osType !== 'ubuntu') {
                    console.error('invalid osType' + osType);
                    return callback('invalid osType' + osType, null);
                }
                var publisher = vmImageConfig[osType].publisher;
                var offer = vmImageConfig[osType].offer;
                var sku = vmImageConfig[osType].sku;

                resourcegroup.createOrGetResourceGroup(resourceGroupName, location, 'test', function (err, rg) {
                    if (err) return finalCallback(err);
                    createStorageAccount(resourceGroupName, storageAccountName, location, 'Standard_LRS', function (err, storageAccount) {
                        if (err) return finalCallback(err);
                        createVNet(resourceGroupName, vnetName, location, function (err, vnetInfo) {
                            // catch retryable exception
                            if (err) return finalCallback(err);
                            getSubnetInfo(resourceGroupName, vnetInfo.name, vnetInfo.subnets[0].name, function (err, subnetInfo) {
                                if (err) return finalCallback(err);
                                createPublicIP(resourceGroupName, publichIPName, location, domainLableName, function (err, publicIPInfo) {
                                    if (err) return finalCallback(err);
                                    createNetworkSecurityGroup(resourceGroupName, location, nsgName, function (err, nsgInfo) {
                                        if (err) return finalCallback(err);
                                        createNIC(resourceGroupName, networkInterfaceName, location, subnetInfo, publicIPInfo, nsgInfo, function (err, nicInfo) {
                                            if (err) return finalCallback(err);
                                            findVMImage(location.replace(' ', ''), publisher, offer, sku, function (err, vmImageInfo) {
                                                if (err) return finalCallback(err);
                                                createVirtualMachines(resourceGroupName, vmName, location.replace(' ', ''), vmSize, storageAccount.name, nicInfo.id,
                                                    publisher, offer, sku, vmImageInfo[0].name, function (err, vmInfo) {
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
                    });
                });
            }
        })
}

function createResourceGroup(resourceGroupName, location, callback) {
    var params = { location: location };
    return resourceClient.resourceGroups.createOrUpdate(resourceGroupName, params, callback);
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
    // 1. create storage account
    storageClient.storageAccounts.create(resourceGroupName, name, accountParameters, function (err, result) {
        if (err) {
            console.error(err);
            storageClient.storageAccounts.listKeys(resourceGroupName, name, null, function (err, data) {
                if (err) return callback(err, data);
                console.log('properties: ' + JSON.stringify(data));
            })
        } else {
            // 2. save customized image to the storage account            
            storageClient.storageAccounts.listKeys(resourceGroupName, name, null, function (err, data) {
                if (err) return callback(err, data);
                var key = data.keys[0].value;
                console.log('key is : ' + key);
                var storageSvc = storage.createBlobService(name, key);
                var sourceStorageSvc = storage.createBlobService('DefaultEndpointsProtocol=https;AccountName=yungezresourcegroup1247;AccountKey=bJP9I8ces+l4Fd2hFGqfomqs4qSrXPz2sZTWbaW6SEhVfo6OmzLdEo3EtgMVUmDaa///BlJXmT9Yf7Rt2ZEjUA==;EndpointSuffix=core.windows.net');
                storageSvc.createContainerIfNotExists('baseimages', { publicAccessLevel: 'blob' }, function (err, result) {
                    if (err) return callback(err, result);
                    // check if storage contains customized base image already
                    storageSvc.getBlobMetadata('baseimages', 'baseimage.vhd', null, function (err, result) {
                        if (err) {
                            sourceStorageSvc.getBlobToLocalFile('system', 'Microsoft.Compute/Images/saved/template-osDisk.35a7e648-84f4-465d-9996-ee2225e82a0e.vhd', './baseimage.vhd', function (err, data) {
                                // start upload
                                if (err) return callback(err, data);
                                storageSvc.createBlockBlobFromLocalFile('baseimages', 'baseimage.vhd', './baseimage.vhd', '', function (err, result) {
                                    if (err) return calback(err, result);
                                    console.log('base image prepartion done');
                                    return callback(err, result);
                                })
                            })
                        } else {
                            // customized base image already exits, quit
                            console.log('customized base image is already there, return');
                        }
                    })
                })
            })
        }
        return callback(err, result);
    });
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

function createNIC(resourceGroupName, networkInterfaceName, location, subnetInfo, publicIPInfo, nsgInfo, callback) {
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
        ],
        networkSecurityGroup: {
            id: nsgInfo.id
        }
    };

    return networkClient.networkInterfaces.createOrUpdate(resourceGroupName, networkInterfaceName, nicParameters, callback);
}

function createNetworkSecurityGroup(resourceGroupName, location, nsgName, callback) {
    console.log(`creating NSG ${nsgName}`);
    var nsgParameters = {
        location: location,
        securityRules: [
            {
                protocol: '*',
                sourcePortRange: '*',
                destinationPortRange: '80',
                access: 'Allow',
                direction: 'Inbound',
                name: 'tcp80',
                priority: 100,
                sourceAddressPrefix: '*',
                destinationAddressPrefix: '*'
            },
            {
                protocol: '*',
                sourcePortRange: '*',
                destinationPortRange: '22',
                access: 'Allow',
                direction: 'Inbound',
                name: 'ssh',
                priority: 100,
                sourceAddressPrefix: '*',
                destinationAddressPrefix: '*'
            }
        ]
    };

    return networkClient.networkSecurityGroups.createOrUpdate(resourceGroupName, nsgName, nsgParameters, null, callback);
}

function findVMImage(location, publisher, offer, sku, callback) {
    console.log(`finding VMImage ${offer}`);

    return computeClient.virtualMachineImages.list(location, publisher, offer, sku, { top: 1 }, callback);
}

function createVirtualMachines(resourceGroupName, vmName, location, vmSize, storageAccountName, nicId, publisher, offer, sku, vmImageVersionNumber, callback) {
    const vmParameters = {
        location: location,
        osProfile: {
            computerName: vmName,
            adminUsername: 'yungez',
            adminPassword: '#Bugsfor$123'
        },
        hardwareProfile: {
            vmSize: vmSize
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
                sourceImageUri: '',
                vhd: { uri: 'https://' + storageAccountName + '.blob.core.windows.net/vmhds/' + vmName + '.vhd' }
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

function powerOffVM(resourceGroupName, vmName, callback) {
    computeClient.virtualMachines.powerOff(resourceGroupName, vmName, function (err, result) {
        if (err) {
            console.error(err);
            return callback(err, result);
        } else {
            console.log(`azure vm ${vmName} in resourceGroup ${resourceGroupName} powerring off successfully`);
            return callback(err, result);
        }
    });
}

function deleteVM(resourceGroupName, vmName, callback) {
    computeClient.virtualMachines.deleteMethod(resourceGroupName, vmName, function (err, result) {
        if (err) {
            console.error(err);
            return callback(err, result);
        } else {
            console.log(`azure vm ${vmName} in resourceGroup ${resourceGroupName} deleting successfully`);
            return callback(err, result);
        }
    });
}

function startVM(resourceGroupName, vmName, callback) {
    computeClient.virtualMachines.start(resourceGroupName, vmName, function (err, result) {
        if (err) {
            console.error(err);
            return callback(err, result);
        } else {
            console.log(`azure vm ${vmName} in resourceGroup ${resourceGroupName} successfully`);
            return callback(err, result);
        }
    });
}

function finalCallback(err, result) {
    if (err) return console.error(err);
}

exports.createOrGetVirtualMachine = createOrGetVirtualMachine;
exports.createStorageAccount = createStorageAccount;