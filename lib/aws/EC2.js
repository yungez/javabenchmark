'use strict'

const AWS = require("aws-sdk");
AWS.config.loadFromPath('./aws/config.aws.json');
const ec2 = new AWS.EC2({ apiVersio: '2016-11-15' });

function createEC2Instance(name, region, osType, instanceType, callback) {
    // switch region
    AWS.config.update({ region: region });

    var imageIds = require('./aws/amiConfig.json');
    switch (osType) {
        case 'windows':
            var imageId = ImageIds['windows'];
            break;
        case 'ubuntu':
            var imageId = ImageIds['ubuntu'];
            break;
    }
    var params = {
        ImageId: imageId, //'ami-10fd7020',
        InstanceType: instanceType, // t1.micro
        MinCount: 1,
        MaxCount: 1
    };

    ec2.runInstances(params, function (err, data) {
        if (err) {
            console.error(err);
            return callback(err, data);
        }
        var instanceId = data.Instances[0].InstanceId;

        console.log(`created instance ${instanceId}`);

        params = {
            Resources: [instanceId],
            Tags: [
                {
                    Key: 'name',
                    Value: name
                }
            ]
        };

        ec2.createTags(params, function (err) {
            console.log("tagging resources: ", err ? 'failure' : 'success');
            return callback(err, data.instanceId);
        })
    });
}

function findImage(keyword, callback) {
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
                Values: ['amazon', 'aws-marketplace', 'microsoft'] // microsoft, amazon
            }
        ]
    };

    ec2.describeImages(imageParams, function (err, images) {
        if (err) {
            console.error(err);
            return callback(err, images);
        }
        images.Images.forEach(function (ami) {
            if (ami.Name && ami.Name.includes('ubuntu').includes('16.04')) {
                console.log('ubuntu server image info: ' + JSON.stringify(ami));
                return callback(err, images);
            }
        })
    });

}

function ManipulateEC2Instance(instanceId, action, callback) {
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

exports.createEC2Instance = createEC2Instance;
exports.ManipulateEC2Instance = ManipulateEC2Instance;