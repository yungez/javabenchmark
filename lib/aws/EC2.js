'use strict'

const fs = require('fs');
const AWS = require("aws-sdk");
const path = require('path');
AWS.config.loadFromPath(path.resolve(__dirname, '..\\aws', 'config.aws.json'));

function createKeyPair(region, keyName, pemfileName, callback) {
    AWS.config.update({ region: region });
    var ec2 = new AWS.EC2({ apiVersio: '2016-11-15' });

    var params = {
        KeyNames: [keyName]
    };
    ec2.describeKeyPairs(params, function (err, data) {
        if (err) {
            if (err.statusCode === 400) {
                ec2.createKeyPair({ KeyName: keyName }, function (error, key) {
                    console.log('creating keypair ' + keyName);
                    if (error) return callback(error, key);
                    fs.writeFileSync(pemfileName, key.KeyMaterial);
                    console.log('key file is saved to : ' + pemfileName);
                    return callback(null, key);
                })
            }
        }
        return callback(err, data);

    })
}

function createEC2Instance(name, region, osType, instanceType, callback) {
    // switch region
    AWS.config.update({ region: region });
    var ec2 = new AWS.EC2({ apiVersio: '2016-11-15' });

    // available region : http://docs.aws.amazon.com/general/latest/gr/rande.html
    var imageIds = require('./amiConfig.json');
    var imageId = ''
    switch (osType) {
        case 'windows':
            imageId = imageIds['windows'][region];
            break;
        case 'ubuntu':
            imageId = imageIds['ubuntu'][region];
            break;
    }

    console.log('imageId : ' + imageId);
    var keyPairName = 'keypair-' + region.replace(' ', '-');
    var params = {
        ImageId: imageId, //'ami-10fd7020',
        InstanceType: instanceType, // t1.micro
        MinCount: 1,
        MaxCount: 1,
        KeyName: keyPairName
    };

    createKeyPair(region, keyPairName, '.\\' + keyPairName + '.pem', function (err, result) {
        if (err) return callback(err, result);
        ec2.runInstances(params, function (err, data) {
            if (err) {
                console.error(err);
                return callback(err, data);
            }
            var instanceId = data.Instances[0].InstanceId;
            console.log(`creating instance ${instanceId}`);

            params = {
                Resources: [instanceId],
                Tags: [
                    {
                        Key: 'Name',
                        Value: name
                    }
                ]
            };

            ec2.createTags(params, function (err) {
                console.log('tagging resources: ', err ? 'failure' : 'success');

                // var sshsecurityGroupParams = {
                //     CidrIp: '0.0.0.0/0',
                //     FromPort: 22,
                //     ToPort: 22,
                //     IpProtocol: 'TCP',
                //     GroupName: 'default'
                // };
                if (err) return callback(err, null);

                var tcpsecurityGroupParams = {
                    CidrIp: '0.0.0.0/0',
                    FromPort: 0,
                    ToPort: 80,
                    IpProtocol: 'TCP',
                    GroupName: 'default'
                }

                ec2.authorizeSecurityGroupIngress(tcpsecurityGroupParams, function (err, result) {
                    console.log('authorizing securitygroup');
                    if (err.statusCode !== 400) return callback(err, result);
                    return callback(null, data.Instances[0]); // return instance object
                });
            });
        });
    })
}

function findImage(keyword, region, callback) {
    // switch region
    AWS.config.update({ region: region });
    var ec2 = new AWS.EC2({ apiVersio: '2016-11-15' });

    AWS.config.update({ region: region });

    var imageParams = {
        Filters: [
            // {
            //     Name: 'platform',
            //     Values: [ '' ] // valid value: windows
            // },
            {
                Name: 'image-type',
                Values: ['machine']
            },
            {
                Name: 'state',
                Values: ['available']
            },
            {
                Name: 'is-public',
                Values: ['true']
            },
            {
                Name: 'owner-alias',
                Values: ['amazon', 'microsoft'] // microsoft, amazon, 'aws-marketplace'
            },
            {
                Name: 'root-device-type',
                Values: ['ebs']
            },
            {
                Name: 'architecture',
                Values: ['x86_64']
            }
        ]
    };

    ec2.describeImages(imageParams, function (err, images) {
        if (err) {
            console.error(err);
            return callback(err, images);
        }
        for (let ami of images.Images) {
            //console.log('ami name: ' + ami.Name);
            if (ami.Name && ami.Name.toLowerCase().includes('ubuntu')) {
                if (ami.Name.toLowerCase().includes('16.04')) {
                    console.log('ubuntu server image info: ' + JSON.stringify(ami));
                    return callback(err, ami);
                }
            }
        }
    });

}

function manipulateEC2Instance(region, instanceId, action, callback) {
    // switch region
    AWS.config.update({ region: region });
    var ec2 = new AWS.EC2({ apiVersio: '2016-11-15' });

    var params = {
        InstanceIds: [instanceId],
        DryRun: false
    };

    switch (action.toUpperCase()) {
        case "ON":
            ec2.monitorInstances(params, function (err, data) {
                if (err) {
                    console.error(err);
                    return callback(err, data);
                }
                console.log('Instance ' + instanceId + 'is set to ' + action.toUpperCase());
                return callback(err, data);
            });
            break;
        case "OFF":
            ec2.unmonitorInstances(params, function (err, data) {
                if (err) {
                    console.error(err);
                    return callback(err, data);
                }
                console.log('Instance ' + instanceId + 'is set to ' + action.toUpperCase());
                return callback(err, data);
            });
            break;
    };
}

function terminateEC2Instance(region, instanceId, callback) {
    // switch region
    AWS.config.update({ region: region });
    var ec2 = new AWS.EC2({ apiVersio: '2016-11-15' });

    ec2.terminateInstances({
        instanceIds: [instanceid], function(err, data) {
            if (err) {
                console.error(err);
                return callback(err, data);
            }

            for (var i in data.TerminatingInstances) {
                var instance = data.TerminatingInstances[i];
                console.log('terminated: ' + instance.instanceId);
                return callback('', data);
            }
        }
    })
}

function waitingForInstanceRunning(region, instanceId, callback) {
    // switch region
    AWS.config.update({ region: region });
    var ec2 = new AWS.EC2({ apiVersio: '2016-11-15' });

    // get ec2 instance status, till it's running

}

function describeNetworkInterface(region, networkInterfaceId, callback) {
    // switch region
    AWS.config.update({ region: region });
    var ec2 = new AWS.EC2({ apiVersio: '2016-11-15' });
    
    var params = {
        NetworkInterfaceIds: [
            networkInterfaceId
        ]
    };
    ec2.describeNetworkInterfaces(params, function(err, result) {
        return callback(err, result);
    })
}

exports.createEC2Instance = createEC2Instance;
exports.manipulateEC2Instance = manipulateEC2Instance;
exports.terminateEC2Instance = terminateEC2Instance;
exports.findImage = findImage;
exports.describeNetworkInterface = describeNetworkInterface;