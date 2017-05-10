'use strict'

const deploy = require('./deploy.js');
const testclient = require('./index.js');
const utility = require('../lib/common.js');
const fs = require('fs');
const path = require('path');
const testConfig = JSON.parse(fs.readFileSync('./testConfig.json', 'utf8'));

// testclient.prepareAzureTestEnvironment(function (err, results) {
//     if (err) {
//         console.error('preparing azure failed ' + err);
//     } else {
//         console.log('prepare azure done');
//     }
// });

// testclient.prepareAWSTestEnvironment(function (err, results) {
//     if (err) {
//         console.error('preparing aws failed ' + err);
//     } else {
//         console.log('prepare aws done');
//     }
// });

// var vms = ['ec2-34-207-183-15.compute-1.amazonaws.com'];
// var keyfiles = ['e:\\vsiot1\\javabenchmark\\app\\keypair-us-east-1.pem'];

// deploy.deployTestAppToVM(vms, 'ubuntu', keyfiles, '', 'ubuntu', function (err, result) {
//     if (err) {
//         console.error(err);
//     } else {
//         console.log('ssh done');
//     }
// })
var awsclient = 'ec2-52-207-24-144.compute-1.amazonaws.com';
var username = 'ubuntu';
var keyfile = 'e:\\vsiot1\\javabenchmark\\app\\keypair-us-east-1.pem';
var homefolder = '/home/' + username + '/';
//'13.92.237.9'
testclient.runTest(awsclient, username, keyfile, '',  homefolder + '/awstestplan.jmx', homefolder + 'awstestresult.csv', function(err, result) {
    if (err) {
        console.error('test run failed' + err);
    } else {
        console.log('test run done');
    }
})
// [ 'F:\\software\\apache-jmeter-3.1\\apache-jmeter-3\\apache-jmeter-3.1\\testplan\\test.jmx'] 
// var sourcelists = [];
// sourcelists.push('F:\\software\\apache-jmeter-3.1\\apache-jmeter-3\\apache-jmeter-3.1\\testplan\\test.jmx');
// utility.uploadFilesViaScp( sourcelists,
// [ '/home/yungez/testplan.jmx' ], '13.92.237.9', 'yungez', '', '#Bugsfor$123', function(err) {
//     if (err) console.error('upload error: ' + err);
// })

// utility.downloadFilesViaScp( ['/home/yungez/testresult.csv'],
// [ 'E:\\vsiot1\\javabenchmark\\testresults\\testresult.csv' ], '13.92.237.9', 'yungez', '', '#Bugsfor$123', function(err) {
//     if (err) console.error('upload error: ' + err);
// })

// testClient.runTest('13.92.237.9', 'yungez', '', '#Bugsfor$123', '~\\testplan\testplan.jmx', '~\\testresult.csv', function(err, result) {
//     if (err) {
//         console.error('run test failed ' + err);
//     } else {
//         console.log('run test done. result file: ~\\testresult.csv');
//     }
// } )

// deploy.createAzureResource(testConfig.azure.resources, function(err, result) {
//     if (err) {
//         console.error(err);
//     } else {
//         console.log('azure resource preparation done!');
//     }
// });

// var vms = [
//     '13.82.181.178',
//     '13.64.244.8'
// ];

// deploy.deployVM(vms, 'yungez', null, '#Bugsfor$123', 'ubuntu', function(err, result) {
//     if (err) {
//         return console.error(err);
//     } else {
//         console.log('vm: ' + vm + ' deployed successfully');
//     }

// })

// deploy.prepareAWSResource(function(err, result) {
//     if (err) return console.error(err);
//     console.log('aws resource creation done.');
// })

// var endpoints = [
//     'testteststest',
//     'aaaaaaaaaaaa'
// ]
// deploy.customizeTestPlan('E:\\vsiot1\\javabenchmark\\app\\testplan\\sampleplan.jmx', 
// 'E:\\vsiot1\\javabenchmark\\app\\testplan\\test.jmx', endpoints, 1000, 1, 10, 'test.csv', ['test1', 'test2'] , function(err, data) {
//          if (err) return console.error(err);
//         console.log('doc parse done.');    
// })

// deploy.deployTestClient()