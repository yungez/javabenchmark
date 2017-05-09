'use strict'

const testrunner = require('./index.js');
const async = require('async');


testrunner.prepareAzureTestEnvironment(function (err, result) {
    if (err) console.error('prepare azure env failed : ' + err);
    //console.log('azure result is : ' + JSON.stringify(result));
    testrunner.runTest(
        result.clientAddress,
        result.remoteuser,
        result.remotekeyfile,
        result.remotekey,
        result.remotetestplan,
        result.remotelogfile,
        result.locallogfile,
        function (err) {
            if (err) console.error('run azure test failed: ' + err);

            testrunner.prepareAWSTestEnvironment(function (err, aws) {
                if (err) console.error('prepare aws env failed : ' + err);
                console.log('aws result is : ' + JSON.stringify(aws));
                testrunner.runTest(
                    aws.clientAddress,
                    aws.remoteuser,
                    aws.remotekeyfile,
                    aws.remotekey,
                    aws.remotetestplan,
                    aws.remotelogfile,
                    aws.locallogfile,
                    function (err) {
                        if (err) console.error('run aws test failed: ' + err);
                    })
            })
        });
});

/*var result = { "clientAddress": "13.92.237.9", "remotelogfile": "/home/yungez//testresult.csv", "remotetestplan": "/home/yungez//testplan.jmx", "remoteuser": "yungez", "remotekey": "#Bugsfor$123", "locallogfile": "E:\\vsiot1\\javabenchmark\\testresults\\azuretestresult.csv" }
testrunner.runTest(
    result.clientAddress,
    result.remoteuser,
    result.remotekeyfile,
    result.remotekey,
    result.remotetestplan,
    result.remotelogfile,
    result.locallogfile,
    function (err) {
        if (err) console.error('run azure test failed: ' + err);

        testrunner.prepareAWSTestEnvironment(function (err, aws) {
            if (err) console.error('prepare aws env failed : ' + err);
            console.log('aws result is : ' + JSON.stringify(aws));
            testrunner.runTest(
                aws.clientAddress,
                aws.remoteuser,
                aws.remotekeyfile,
                aws.remotekey,
                aws.remotetestplan,
                aws.remotelogfile,
                aws.locallogfile,
                function (err) {
                    if (err) console.error('run aws test failed: ' + err);
                })
        })
    });*/