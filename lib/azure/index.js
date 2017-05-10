'use strict'

const webApp = require('./webApp.js');
const vm = require('./virtualMachine.js');

function createWebApp(resourceGroupName, name, region, skuName, callback) {
    webApp.createOrGetWebApp(resourceGroupName, name, region, skuName, null, function(err, data) {
        if (err) {
            console.error(err);
            return callback(err, data);
        }
        // if created successfully, return web app url
            
    })
}