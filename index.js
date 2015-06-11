var gutil = require('gulp-util');
var through = require('through2');
var toolFactory = require('./tool');

module.exports = function(options) {

    options = options || {};
    options.patternIndex = options.patternIndex || /^\/index\.[a-f0-9]{8}\.html(\.gz)*$/gi;
    var tool = options.tool || toolFactory(options);
    var first = true;

    return through.obj(function (file, enc, callback) {

        if (first) {
            options.dirRoot = options.dirRoot || file.base.replace(/\/$/, "");
            gutil.log('gulp-s3-index:', 'Root directory [', options.dirRoot, ']');
            first = !first;
        }

        // Update the default root object once we've found the index.html file
        var filename = file.path.substr(options.dirRoot.length);
        if (filename.match(options.patternIndex)) {

            gutil.log('gulp-s3-index:', 'Identified index [', filename, ']');

            // Trim the '.gz' if gzipped
            if (filename.substr(filename.length - 3) === '.gz') {
                filename = filename.substr(0, filename.length - 3);
            }

            tool.updateWebsiteIndex(filename)
                .then(function() {
                    return callback(null, file);
                }, function(err) {
                    gutil.log(new gutil.PluginError('gulp-s3-index', err));
                    callback(null, file);

                });

        } else {
            return callback(null, file);
        }

    });


};
