var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var gutil = require('gulp-util');

module.exports = function(options) {

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
                if (data.DistributionConfig.Comment == null) data.DistributionConfig.Comment = '';
                if (data.DistributionConfig.Logging.Enabled == false) {
                    data.DistributionConfig.Logging.Bucket = '';
                    data.DistributionConfig.Logging.Prefix = '';
                }

                // Update the distribution with the new default root object
                data.DistributionConfig.DefaultRootObject = defaultRootObject;
                if (data.DistributionConfig.Origins.Items[0].S3OriginConfig.OriginAccessIdentity === null) {
                  data.DistributionConfig.Origins.Items[0].S3OriginConfig.OriginAccessIdentity = '';
                }

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

    return {
        updateDefaultRootObject: updateDefaultRootObject
    };

};
