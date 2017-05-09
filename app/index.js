'use strict'

const fs = require('fs');
const path = require('path');
const deploy = require('./deploy.js');
const testConfig = JSON.parse(fs.readFileSync('./testConfig.json', 'utf8'));
const utility = require('../lib/common.js');
const async = require('async');

var testclient = {}
const seperator = '================================';

testclient.prepareAzureTestEnvironment = function (callback) {
    // 1. create resources
    console.log(seperator + '\ncreating azure test resources...\n');
    deploy.createAzureResource(testConfig.azure.resources, function (err, resources) {

        if (err) return finalCallback(err, callback);

        // 2. deploy resources
        var vmAddresses = [];
        var resourceAddresses = [];
        for (var item of resources) {
            resourceAddresses.push(item.address);

            if (item.type === 'vm') vmAddresses.push(item.address);
        }
        console.log(seperator + '\ndeploying test app to azure test resources...\n');
        deploy.deployTestAppToVM(vmAddresses, 'yungez', null, '#Bugsfor$123', 'ubuntu', function (err) {

            if (err) {
                console.log('deployTestAppToVM err' + err);
                return finalCallback(err, callback);
            }
            // 3. create test client
            console.log(seperator + '\ncreating azure test client...\n');
            deploy.createAzureResource([testConfig.azure.client], function (err, clients) {

                if (err) {
                    console.log('createAzureResource err' + err);
                    return finalCallback(err, callback);
                }

                // 4. deploy test client
                var clientAddress = [];
                for (var item of clients) {
                    clientAddress.push(item.address);
                }
                console.log(seperator + '\ndeploying azure test resources...\n');
                deploy.deployTestClient(clientAddress, 'yungez', null, '#Bugsfor$123', function (err, result) {

                    console.log('test client: ' + JSON.stringify(clients));

                    if (err) return finalCallback(err, callback);

                    // 5. customize test plan
                    var homefolder = '/home/yungez/';
                    var localtestplan = path.dirname(testConfig.azure.testplan.sampletestplan) + '\\azuretestplan.jmx';
                    var remotetestplanfile = homefolder + '/azuretestplan.jmx';
                    var remotelogfile = homefolder + '/azuretestresult.csv';
                    var remotetestfile = homefolder + '/azuretestfile.jpg';
                    var scenarioNames = [];
                    for (var target of testConfig.azure.resources) {
                        // e.g. azure_westus_vm_standard_a1_ubuntu_500_1_5
                        var info = ['azure', target.region.replace(' ', ''), target.type, target.size.replace(new RegExp('_', 'g'), ''),
                            testConfig.azure.testplan.threadnum, testConfig.azure.testplan.loopcount, testConfig.azure.testplan.rampupseconds];
                        scenarioNames.push(info.join('_'));
                    }

                    console.log(seperator + '\ncustomzing test plan based on configuration...\n');
                    deploy.customizeTestPlan(testConfig.azure.testplan.sampletestplan,
                        localtestplan,
                        resourceAddresses,
                        testConfig.azure.testplan.threadnum,
                        testConfig.azure.testplan.loopcount,
                        testConfig.azure.testplan.rampupseconds,
                        remotetestfile,
                        remotelogfile,
                        scenarioNames);

                    // 6. copy test plan and test file to remote test client                    
                    console.log(seperator + '\nuploading test plan to client...\n');
                    utility.uploadFilesViaScp(
                        [localtestplan, testConfig.azure.testplan.testfile],
                        [remotetestplanfile, remotetestfile],
                        clientAddress[0],
                        'yungez',
                        '',
                        '#Bugsfor$123',
                        function (err, result) {
                            if (err) return finalCallback(err, callback);

                            console.log('azure test env preparation done.');

                            var locallogfile = testConfig.azure.testplan.testresultsfolder + '\\azuretestresult.csv';
                            var output = {};
                            output.clientAddress = clientAddress[0];
                            output.remotelogfile = remotelogfile;
                            output.remotetestplan = remotetestplanfile;
                            output.remoteuser = 'yungez';
                            output.remotekey = '#Bugsfor$123';
                            output.locallogfile = locallogfile;


                            return callback(null, output);
                        });
                });
            });
        });
    });
}

testclient.prepareAWSTestEnvironment = function (callback) {
    // 1. create resources
    console.log(seperator + '\ncreating aws test resources...\n');
    deploy.createAWSResource(testConfig.aws.resources, function (err, resources) {
        if (err) return finalCallback(err, callback);

        // 2. deploy resources
        var vmAddresses = [];
        var resourceAddresses = [];
        var keypairFiles = [];
        var vmkeyPairFiles = [];
        for (var item of resources) {
            resourceAddresses.push(item.address);
            keypairFiles.push(item.keypairfile);

            if (item.type === 'vm') {
                vmAddresses.push(item.address);
                vmkeyPairFiles.push(item.keypairfile);
            }
        }

        // 2.5 start EC2 instance
        console.log(seperator + '\ndeploying test app to aws test resources...\n');
        deploy.deployTestAppToVM(vmAddresses, 'ubuntu', vmkeyPairFiles, '', 'ubuntu', function (err) {

            if (err) {
                console.log('deployTestAppToVM err' + err);
                return finalCallback(err, callback);
            }
            // 3. create test client
            console.log(seperator + '\ncreating aws test client...\n');
            deploy.createAWSResource([testConfig.aws.client], function (err, clients) {

                if (err) {
                    console.log('createAzureResource err' + err);
                    return finalCallback(err, callback);
                }

                // 4. deploy test client
                var clientAddress = [];
                var clientskeypairfiles = [];
                for (var item of clients) {
                    clientAddress.push(item.address);
                    clientskeypairfiles.push(item.keypairfile);
                }
                console.log(seperator + '\ndeploying azure test resources...\n');
                deploy.deployTestClient(clientAddress, 'ubuntu', clientskeypairfiles, '', function (err, result) {

                    console.log('test client: ' + JSON.stringify(clients));

                    if (err) return finalCallback(err, callback);

                    // 5. customize test plan
                    var homefolder = '/home/ubuntu/';
                    var localtestplan = path.dirname(testConfig.azure.testplan.sampletestplan) + '\\awstestplan.jmx';
                    var remotetestplanfile = homefolder + '/awstestplan.jmx';
                    var remotelogfile = homefolder + '/awstestresult.csv';
                    var remotetestfile = homefolder + '/awstestfile.jpg';
                    var scenarioNames = [];
                    for (var target of testConfig.azure.resources) {
                        // e.g. azure_westus_vm_standard_a1_ubuntu_500_1_5
                        var info = ['aws', target.region.replace(' ', ''), target.type, target.size,
                            testConfig.aws.testplan.threadnum, testConfig.aws.testplan.loopcount, testConfig.aws.testplan.rampupseconds];
                        scenarioNames.push(info.join('_'));
                    }

                    console.log(seperator + '\ncustomzing test plan based on configuration...\n');
                    deploy.customizeTestPlan(testConfig.azure.testplan.sampletestplan,
                        localtestplan,
                        resourceAddresses,
                        testConfig.aws.testplan.threadnum,
                        testConfig.aws.testplan.loopcount,
                        testConfig.aws.testplan.rampupseconds,
                        remotetestfile,
                        remotelogfile,
                        scenarioNames);

                    // 6. copy test plan and test file to remote test client                    
                    console.log(seperator + '\nuploading test plan to client...\n');
                    utility.uploadFilesViaScp(
                        [localtestplan, testConfig.azure.testplan.testfile],
                        [remotetestplanfile, remotetestfile],
                        clientAddress[0],
                        'ubuntu',
                        clientskeypairfiles[0],
                        '',
                        function (err, result) {
                            if (err) return finalCallback(err, callback);

                            console.log('aws test env preparation done.');
                            var locallogfile = testConfig.azure.testplan.testresultsfolder + '\\awstestresult.csv';
                            var output = {};
                            output.clientAddress = clientAddress[0];
                            output.remotelogfile = remotelogfile;
                            output.remotetestplan = remotetestplanfile;
                            output.remoteuser = 'ubuntu';
                            output.remotekeyfile = clientskeypairfiles[0];
                            output.locallogfile = locallogfile;

                            return callback(null, output);
                        });
                });
            });
        });
    });
}

testclient.runTest = function (clientAddress, userName, keyFileName, key, testplanfile, logfile, locallogfile, callback) {
    console.log('username; ' + userName);
    console.log(seperator + '\nrunning test against ' + clientAddress + '...\n');
    var cmds = 'cd ~/apache-jmeter-3.2/bin && ./jmeter.sh -n -t ' + testplanfile + ' -l ' + logfile;
    utility.sshExecCmd(clientAddress, userName, keyFileName, key, cmds, { verbose: true, sshPrintCommands: true }, function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log('test done...');
        }

        // download test results    
        utility.downloadFilesViaScp([logfile],
            [locallogfile],
            clientAddress, userName, keyFileName, key, function (err) {
                if (err) console.error('download test result failed');
                return callback(err);
            });
    })
}

function finalCallback(err, callback) {
    console.error(err);
    return callback(err);
}

module.exports = testclient;