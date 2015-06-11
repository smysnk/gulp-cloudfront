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
	params: {
		Bucket: options.params.bucket
	},
        accessKeyId: options.accesKeyId,
        secretAccessKey: options.secretAccesKeyId
    });

    var updateWebsiteIndex = function (indexFile) {

        var deferred = Q.defer();
	
	// this killed everything.. missing credentials.
        //var s3 = new AWS.S3({params: {Bucket: options.bucket}});

        s3.getBucketWebsite({}, function (err, data) {
            if (err) {
                deferred.reject(err);
            } else {
                data.IndexDocument.Suffix = indexFile.substr(1);

                //Remove empty properties
                Object.keys(data).forEach(function (k) {
                    if (!data[k] || (Array.isArray(data[k]) && !data[k].length)) {
                        delete data[k];
                    }
                });

                s3.putBucketWebsite({
                    WebsiteConfiguration: data
                }, function (err) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        gutil.log('gulp-s3-index:', 'WebsiteIndex updated to [' + indexFile.substr(1) + '].');
                        deferred.resolve();
                    }
                });
            }
        });

        return deferred.promise;

    };

    return {
        updateWebsiteIndex: updateWebsiteIndex
    };

};
