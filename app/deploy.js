'use strict'

const fs = require('fs');
const spawn = require('child_process').spawn;
const async = require('async');
const resource = require('../lib/index.js');
const utility = require('../lib/common.js');
const testConfig = JSON.parse(fs.readFileSync('./testConfig.json', 'utf8'));

function setupTargetTestEnv(callback) {

}

function finalCallback(err, result) {
    if (err) return console.error(err);
}

// return list of azure resource:
// [ { type, resourcegroupname, name }]
function prepareAzureResource(callback) {
    var name = '';
    var results = [];

    for (var config of testConfig.resources) {
        if (typeof config.azure === undefined || config.azure === '' || typeof config.aws === undefined || config.aws === '') {
            console.error('testConfig.json invalid');
            return callback('testConfig.json invalid', null);
        }

    }

    async.each(testConfig.resources,
        function (config, cb) {
            console.log('processing azure config...');
            if (config.azure.type.toLowerCase() === 'vm') {
                name = config.azure.name ||
                    (config.azure.size.replace('Standard', '') + config.azure.region.replace(' ', '') + config.azure.os + config.azure.type).split('_').join('').substring(0, 15);
                resource.createOrGetAzureVM(
                    config.azure.resourcegroup,
                    name,
                    config.azure.region,
                    config.azure.size,
                    config.azure.os,
                    function (err, vm) {
                        if (err) {
                            console.error(err);
                            return cb(err);
                        } else {
                            // create done, start it
                            resource.startAzureVM(config.azure.resourcegroup, name, function (err, result) {
                                if (err) {
                                    console.error(err);
                                    return cb(err);
                                } else {
                                    console.log(`azure vm ${name} is ready`);
                                    // save resource group and vm name to results
                                    results.push({ type: config.azure.type, resourcegroup: config.azure.resourcegroup, name: name });
                                    return cb(null);
                                }
                            });
                        }
                    }
                );
            } else if (config.azure.type.toLowerCase() === 'webapp') {
                name = config.azure.name ||
                    (config.azure.size.replace('Standard', '') + config.azure.region.replace(' ', '') + config.azure.type).split('_').join('').substring(0, 15);
                resource.createOrGetAzureWebApp(
                    config.azure.resourcegroup,
                    name,
                    config.azure.region,
                    config.azure.size,
                    function (err, result) {
                        if (err) {
                            console.error(err);
                            return cb(err);
                        } else {
                            // create done, start it
                            resource.startAzureWebApp(config.azure.resourcegroup, name, function (err, result) {
                                if (err) {
                                    console.error(err);
                                    return cb(err);
                                } else {
                                    console.log(`azure webapp ${name} is ready`);

                                    // save resource group and app name to results
                                    results.push({ type: config.azure.type, resourcegroup: config.azure.resourcegroup, name: name });
                                    return cb(null);
                                }
                            });
                        }
                    });
            } else {
                console.error('invalid resource type: ' + config.azure.type);
                return cb('invalid resource type: ' + config.azure.type);
            }
        }, function (err) {
            if (err) {
                console.error('prepare azure resources failed..' + err);
                return callback(err, null);
            } else {
                console.log('prepare azure resources done. \n' + JSON.stringify(results));
                return callback(null, results);
            }
        });




    return callback(null, results);
}

// return array of aws resource:
// ec2: [ { type, name, instanceid, publicDnsName } ]
function prepareAWSResource(callback) {
    var name = '';
    var results = [];

    for (var config of testConfig.resources) {
        if (typeof config.aws === undefined || config.aws === '' || typeof config.aws === undefined || config.aws === '') {
            console.error('testConfig.json invalid');
            return callback('testConfig.json invalid', null);
        }
    }

    async.each(testConfig.resources,
        function (config, cb) {
            console.log('process config...');
            if (config.aws.type === 'vm') {
                // create aws ec2 instance
                name = config.aws.name || config.aws.size + '_' + config.aws.region.replace(' ', '_') + config.aws.os + '_' + config.aws.type;

                resource.createOrGetAWSEC2Instance(name, config.aws.region, config.aws.os, config.aws.size, function (err, result) {
                    if (err) {
                        console.error(err);
                        return cb(err);
                    } else {
                        var instanceId = result.InstanceId;
                        var dnsName = result.PublicDnsName;
                        var networkInterfaceId = result.NetworkInterfaces[0].NetworkInterfaceId;

                        // start instance
                        resource.startAWSEC2Instance(config.aws.region, result.InstanceId, function (err, result) {
                            if (err) {
                                console.error(err);
                                return cb(err);
                            } else {
                                resource.describeAWSEC2InstanceNetworkInterface(config.aws.region, networkInterfaceId, function (err, result) {
                                    if (err) return cb(err);
                                    var dnsName = result.NetworkInterfaces[0].Association.PublicDnsName;
                                    console.log(`aws EC2 instance ${instanceId} with name ${name}, dns: ${dnsName} ready`);
                                    results.push({ type: config.aws.type, name: name, instanceid: instanceId, dnsname: dnsName });
                                    return cb(null);
                                })

                            }
                        })
                    }
                })
            } else if (config.aws.type === 'elasticbeanstalk') {
                // creating elascticbeanstalk
            } else {
                return cb('invalid resource type : ' + config.aws.type);
            }
        }, function (err) {
            if (err) {
                console.error('prepare aws resources failed..' + err);
                return callback(err, null);
            } else {
                console.log('prepare aws resources done. \n' + JSON.stringify(results));
                return callback(null, results);
            }
        })

}

function runPsExecOnWindowsRemote(hostname, username, password, cmd, callback) {
    var psexec = spawn('PsExec.exe', ['\\\\' + hostname, '-u', username, '-p', password, cmd]);

    psexec.stdout.on('data', (data) => {
        console.log('stdout: ' + data);
        return callback(null, data);
    });

    psexec.stderr.on('data', (data) => {
        console.error(data);
        return callback(data, null);
    });

    psexec.on('close', (code) => {
        console.log('child process exited with code : ' + code);
        return callback(null, code);
    })
}

// deploy docker to VM
function deployVM(vms, userName, keyfileName, key, osType, callback) {
    if (osType === 'windows') {

    } else if (osType === 'ubuntu') {
        for (var vm of vms) {
            // 1. install docker
            // 2. run docker run
            var cmds = 'sudo apt-get update && sudo apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D && ' +
                ' sudo apt-add-repository \'deb https://apt.dockerproject.org/repo ubuntu-xenial main\' && ' +
                ' sudo apt-get update && ' +
                ' apt-cache policy docker-engine && ' +
                ' sudo apt-get install -y docker-engine && ' +
                ' sudo usermod -aG docker $(whoami) && ' +
                ' sudo apt-get install -y docker && docker pull yungez/tomcat1 && docker run -p 80:80 yungez/tomcat1 && ';

            utility.sshExecCmd(vm, userName, keyfileName, key, cmds, { verbose: true },
                function (err, result) {
                    if (err) return callback(err, result);
                });
        }
    } else {
        console.error('invalid os type: ' + osType);
        return callback('error', null);
    }
}

exports.setupTargetTestEnv = setupTargetTestEnv;
exports.prepareAzureTargetResource = prepareAzureTargetResource;
exports.deployVM = deployVM;
exports.prepareAWSResource = prepareAWSResource;