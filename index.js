var es = require('event-stream');
var fs = require('fs');
var path = require('path');
var gutil = require('gulp-util');
var AWS = require('aws-sdk');
var map = require('map-stream');
var Q = require('q');
var through = require('through2');

module.exports = function(options) {

    options = options || {};
    var cloudfront = new AWS.CloudFront({
        accessKeyId: options.key,
        secretAccessKey: options.secret
    });

    var updateDefaultRootObject = function (defaultRootObject) {

        var deferred = Q.defer();

        // Get the existing distribution id
        cloudfront.getDistribution({ Id: options.distributionId }, function(err, data) {

            if (err) {                
                deferred.reject(err);
            } else {
                
                // AWS Service returns errors if we don't fix these
                data.DistributionConfig.Comment = '';
                data.DistributionConfig.Logging.Bucket = '';
                data.DistributionConfig.Logging.Prefix = '';
                data.DistributionConfig.DefaultRootObject = defaultRootObject;

                // Update the distribution with the new default root object
                cloudfront.updateDistribution({
                    IfMatch: data.ETag,
                    Id: options.distributionId,
                    DistributionConfig: data.DistributionConfig
                }, function(err, data) {
                    
                    if (err) {                
                        deferred.reject(err);
                    } else {
                        deferred.resolve();
                    }

                });

            }
        });   

        return deferred.promise;

    };

    return through.obj(function (file, enc, callback) {

        var self = this;

        if (file.isNull()) {
            return callback(null, file);
        } else if (file.isStream()) {
            throw new Error('Streams are not supported!');
        } 

        // Update the default root object once we've found the index.html file
        if (file.path.match(/index\-[a-f0-9]{8}\.html/gi)) {            

            updateDefaultRootObject(path.basename(file.path))
                .then(function() {
                    return callback(null, file);                
                }, function(err) {
                    self.emit('error', new gutil.PluginError('gulp-cloudfront', err));
                    callback(null, file);

                })

        } else {
            return callback(null, file);
        }

    });


};
