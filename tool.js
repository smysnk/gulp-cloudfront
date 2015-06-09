var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var gutil = require('gulp-util');
var AWS = require('aws-sdk');
var Q = require('q');
var gutil = require('gulp-util');

module.exports = function (options) {

    AWS.config.region = options.region;
    var s3 = new AWS.S3({
        accessKeyId: options.key,
        secretAccessKey: options.secret
    });

    var updateWebsiteIndex = function (indexFile) {

        var deferred = Q.defer();

        var s3 = new AWS.S3({params: {Bucket: options.bucket}});
        s3.putBucketWebsite({
            WebsiteConfiguration: {
                IndexDocument: {
                    Suffix: indexFile.substr(1)
                }
            }
        }, function (err, data) {
            if (err) {
                deferred.reject(err);
            } else {
                gutil.log('gulp-s3-index:', 'WebsiteIndex updated to [' + indexFile.substr(1) + '].');
                deferred.resolve();
            }
        });

        return deferred.promise;

    };

    return {
        updateWebsiteIndex: updateWebsiteIndex
    };

};
