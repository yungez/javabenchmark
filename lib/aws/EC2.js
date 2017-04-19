'use strict'

const AWS = require("aws-sdk");
AWS.config.loadFromPath('./aws/config.aws.json');
AWS.config.update({ region: 'ca-central-1' });
const ec2 = new AWS.EC2({ apiVersio: '2016-11-15' });

function createEC2Instance(name, region, osType, instanceType, callback) {
    // switch region
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

    // findImage('', region, function (err, image) {
    //     if (err) {
    //         console.error(err);
    //         return callback(err, image);
    //     }
    //     console.log('found image: ' + image.ImageId);
    //     imageId = image.ImageId;        
    // });

    console.log('imageId : ' + imageId);
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

function findImage(keyword, region, callback) {
    AWS.config.update({ region: region });

    console.log('ec2 region is : ') + ec2.region;
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
exports.findImage = findImage;