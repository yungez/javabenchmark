'use strict'

const fs = require('fs');
const fsExtra = require('fs-extra');
const spawn = require('child_process').spawn;
const async = require('async');
const select = require('xpath.js');
const dom = require('xmldom').DOMParser;
const serializer = require('xmldom').XMLSerializer;

const resource = require('../lib/index.js');
const utility = require('../lib/common.js');
const testConfig = JSON.parse(fs.readFileSync('./testConfig.json', 'utf8'));

// return list of azure resource:
// [ { type, resourcegroupname, name }]
function createAzureResource(resourceConfigs, callback) {
    var results = [];

    if (resourceConfigs === null || resourceConfigs === '' || typeof resourceConfigs === undefined) {
        console.log('resourceConfigs no azure config');
        return callback();
    }

    async.each(resourceConfigs,
        function (config, cb) {
            if (config.type.toLowerCase() === 'vm') {
                // azure windows vm name length limitation 15..
                var name = config.name ||
                    (config.size.replace('Standard', '') + config.region.replace(' ', '') + config.os + config.type).split('_').join('').substring(0, 15);
                resource.createOrGetAzureVM(
                    config.resourcegroup,
                    name,
                    config.region,
                    config.size,
                    config.os,
                    function (err, vmip) {
                        if (err) {
                            console.error(err);
                            return cb(err);
                        } else {
                            // create done, start it
                            console.log('vmip: ' + vmip);
                            resource.startAzureVM(config.resourcegroup, name, function (err, result) {
                                if (err) {
                                    console.error(err);
                                    return cb(err);
                                } else {
                                    // save resource group and vm name to results
                                    results.push({ type: config.type, resourcegroup: config.resourcegroup, name: name, address: vmip });
                                    return cb(null);
                                }
                            });
                        }
                    }
                );
            } else if (config.type.toLowerCase() === 'webapp') {
                var name = config.name ||
                    (config.size.replace('Standard', '') + config.region.replace(' ', '') + config.type).split('_').join('').substring(0, 15);
                resource.createOrGetAzureWebApp(
                    config.resourcegroup,
                    name,
                    config.region,
                    config.size,
                    function (err, webapp) {
                        if (err) {
                            console.error(err);
                            return cb(err);
                        } else {
                            // create done, start it
                            resource.startAzureWebApp(config.resourcegroup, name, function (err, result) {
                                if (err) {
                                    console.error(err);
                                    return cb(err);
                                } else {
                                    // save resource group and app name to results
                                    results.push({ type: config.type, resourcegroup: config.resourcegroup, name: name, address: webapp.hostNames[0] });
                                    return cb(null);
                                }
                            });
                        }
                    });
            } else {
                console.error('invalid resource type: ' + config.type);
                return cb('invalid resource type: ' + config.type);
            }
        }, function (err) {
            if (err) {
                console.error('creating azure resources failed..' + err);
                return callback(err, null);
            } else {
                console.log('creating azure resources done. \n' + JSON.stringify(results));
                return callback(null, results);
            }
        });

    return callback(null, results);
}

// return array of aws resource:
// ec2: [ { type, name, instanceid, publicDnsName } ]
function createAWSResource(resourceConfigs, callback) {
    var results = [];

    if (resourceConfigs === null || resourceConfigs === '' || typeof resourceConfigs === undefined) {
        console.log('resourceConfigs no aws config');
        return callback();
    }

    async.each(resourceConfigs,
        function (config, cb) {
            if (config.type === 'vm') {
                // create aws ec2 instance
                var name = config.name || config.size + '_' + config.region.replace(' ', '_') + config.os + '_' + config.type;

                resource.createOrGetAWSEC2Instance(name, config.region, config.os, config.size, function (err, result) {
                    if (err) {
                        console.error(err);
                        return cb(err);
                    } else {
                        var instanceId = result.InstanceId;
                        var dnsName = result.PublicDnsName;
                        var networkInterfaceId = result.NetworkInterfaces[0].NetworkInterfaceId;
                        var keyPairFile = result.keypairfile;

                        // start instance                        
                        resource.startAWSEC2Instance(config.region, result.InstanceId, function (err, result) {
                            if (err) {
                                console.error(err);
                                return cb(err);
                            } else {
                                resource.describeAWSEC2InstanceNetworkInterface(config.region, networkInterfaceId, function (err, result) {
                                    if (err) return cb(err);
                                    var dnsName = result.NetworkInterfaces[0].Association.PublicDnsName;
                                    console.log(`aws EC2 instance ${instanceId} with name ${name}, dns: ${dnsName} ready`);
                                    results.push({ type: config.type, name: name, instanceid: instanceId, address: dnsName, keypairfile: keyPairFile });
                                    return cb();
                                });
                            }
                        })
                    }
                })
            } else if (config.type === 'elasticbeanstalk') {
                // creating elascticbeanstalk, with docker container deploy ready, in Dockerrun.aws.json
                var name = config.name || config.size.replace('.', '') + config.region;
                var envName = name + 'env';
                resource.createOrGetAWSElasticBeanStalk(config.region, name, envName, config.size, 'testversion1', function (err, result) {
                    if (err) return cb(err);
                    results.push({ type: config.type, name: name, address: result });
                    return cb(null);
                })
            } else {
                return cb('invalid resource type : ' + config.type);
            }
        }, function (err) {
            if (err) {
                console.error('creating aws resources failed..' + err);
                return callback(err, null);
            } else {
                console.log('creating aws resources done. \n' + JSON.stringify(results));
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
function deployTestAppToVM(vms, userName, keyfileNames, key, osType, callback) {
    if (osType === 'windows') {
        // todo
        // for azure, use customized windows image which already have docker installed
        // for aws, customized image building..
    } else if (osType === 'ubuntu') {
        for (var i = 0; i < vms.length; i++) {
            // 1. install docker
            // 2. run docker run
            var vm = vms[i];

            var keyfile = '';
            if (keyfileNames) {
                keyfile = keyfileNames[i];
            }

            console.log('deploying test app to : ' + vm);
            console.log('keyfile is: ' + keyfile);

            var cmds = 'sudo apt-get update && sudo apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D && ' +
                ' sudo apt-add-repository \'deb https://apt.dockerproject.org/repo ubuntu-xenial main\' && ' +
                ' sudo apt-get update && ' +
                ' apt-cache policy docker-engine && ' +
                ' sudo apt-get install -y docker-engine && ' +
                ' sudo usermod -aG docker $(whoami) && ' +
                ' sudo apt-get install -y docker ';
            console.log('SSH: ' + vm);
            utility.sshExecCmd(vm, userName, keyfile, key, cmds, { verbose: false, sshPrintCommands: true },
                function (err) {
                    if (err) {
                        return callback(err);
                    }

                    //var dockercmd = 'docker pull yungez/tomcat1 && nohup docker run -p 80:80 yungez/tomcat1 > /dev/null 2>&1 &';//
                    var dockercmd = 'docker pull yungez/tomcat1 &&  docker run -p 80:80 -d yungez/tomcat1 > /dev/null 2>&1';//
                    utility.sshExecCmd(vm, userName, keyfile, key, dockercmd, { verbose: true, sshPrintCommands: true }, function (err) {
                        if (err) return callback(err);
                        return callback();
                    });
                });
        }
    } else {
        console.error('invalid os type: ' + osType);
        return callback('error', null);
    }
}

// deploy test client to ubuntu system, not windows. 
// 1. install jmeter
// 2. copy testplan
function deployTestClient(vms, userName, keyfiles, key, callback) {

    var cmds = 'sudo apt-get update && sudo apt-get install -y openjdk-8-jdk && ' +
        ' wget -c http://www-us.apache.org/dist//jmeter/binaries/apache-jmeter-3.2.tgz && ' +
        ' tar -xzf apache-jmeter-3.2.tgz && ' +
        ' cd ./apache-jmeter-3.2';
    for (var j = 0; j < vms.length; j++) {
        var vm = vms[j];

        var keyfile = '';
        if (keyfiles) {


            keyfile = keyfiles[j];
        }

        console.log('deploying test client : ' + vm);
        utility.sshExecCmd(vm, userName, keyfile, key, cmds, { verbose: false, sshPrintCommands: true },
            function (err) {
                if (err) {
                    console.error(err);
                }
                return callback(err);
            });
    }
}

function customizeTestPlan(sampletestplan, targettestplan, endpoints, threadnum, loopcount, rampupseconds, testfile, logfile, scenarionames) {
    if (!fs.existsSync(sampletestplan)) {
        return console.error('test plan file not exists ' + sampletestplan);
    }

    var content = fsExtra.readFileSync(sampletestplan, 'utf8');
    var doc = new dom().parseFromString(content, 'application/xml');

    //customize log file
    var logfileNode = select(doc, '//stringProp[@name="filename"]');
    logfileNode[0].textContent = logfile;

    // customize endpoints
    var endpointNodes = select(doc, '//stringProp[@name="HTTPSampler.domain"]');
    for (var j = 0; j < endpointNodes.length; j++) {
        endpointNodes[j].textContent = endpoints[Math.floor(j / 2)];
    }

    // customize # of threads
    var threadNumNodes = select(doc, '//stringProp[@name="ThreadGroup.num_threads"]');
    for (var j = 0; j < threadNumNodes.length; j++) {
        threadNumNodes[j].textContent = threadnum;
    }

    // customize loopcount
    var loopNodes = select(doc, '//stringProp[@name="LoopController.loops"]');
    for (var j = 0; j < loopNodes.length; j++) {
        loopNodes[j].textContent = loopcount;
    }
    // customize rampup seconds
    var rampupNodes = select(doc, '//stringProp[@name="ThreadGroup.ramp_time"]');
    for (var j = 0; j < rampupNodes.length; j++) {
        rampupNodes[j].textContent = rampupseconds;
    }

    // customize scenario names
    // mark test metrics into scenario names
    // e.g. azure_westus_vm_standard_a1_ubuntu_500_1_5
    var threadGroups = select(doc, '//ThreadGroup[@testclass="ThreadGroup"]/@testname');
    for (var j = 0; j < threadGroups.length; j++) {
        threadGroups[j].textContent = scenarionames[j];
    }

    // customize test file for file upload scenario
    var fileNodes = select(doc, '//stringProp[@name="File.path"]');
    for (var j = 0; j < fileNodes.length; j++) {
        fileNodes[j].textContent = testfile;
    }

    var eleFileNodes = select(doc, '//elementProp[@elementType="HTTPFileArg"]/@name');
    for (var j = 0; j < eleFileNodes.length; j++) {
        eleFileNodes[j].textContent = testfile;
    }

    // save updated test plan
    var newDoc = new serializer().serializeToString(doc);
    fs.writeFileSync(targettestplan, newDoc);
}

exports.createAzureResource = createAzureResource;
exports.createAWSResource = createAWSResource;
exports.deployTestAppToVM = deployTestAppToVM;
exports.deployTestClient = deployTestClient;
exports.customizeTestPlan = customizeTestPlan;