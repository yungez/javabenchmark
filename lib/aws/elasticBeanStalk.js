'use strict'

const AWS = require("aws-sdk");
AWS.config.loadFromPath('./aws/config.aws.json');
const elasticBeanStalk = new AWS.ElasticBeanstalk({ apiVersio: '2010-12-01' });


function createApplication(name, region, callback) {
    // switch region
    AWS.config.update({ region: region });

    var params = {
        ApplicationName: name,
        Description: 'test application ' + name
    };

    elasticBeanStalk.createApplication(params, function(err, data) {
        if (err) {
            console.error(err);
            return callback(err, data);
        }
        console.log('application ' + name + ' is created successfully!');
        return callback(err, data);
    });
}

exports.createApplication = createApplication;
