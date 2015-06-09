# [gulp](https://github.com/wearefractal/gulp)-s3-index [![Build Status](https://travis-ci.org/happylinks/gulp-s3-index.png?branch=master)](https://travis-ci.org/happylinks/gulp-s3-index)

> Updates the Website Index of a S3 Bucket

## Purpose

Amazon S3 let's you use buckets as a Static Website Host. This allows you to visit your bucket as if it were a normal website.
In the release process with gulp-awspublish and gulp-rev-all the index document has a hash. This plugin makes it possible to update the index document from your bucket, like [gulp-cloudfront](https://github.com/smysnk/gulp-cloudfront) does it for cloudfront.

## Under the Hood

This plugin will identify the index.html file based on the default or configured pattern.  Once identified it will update the S3 bucket with the new index file.

## Install

Install with [npm](https://npmjs.org)

```
npm install --save-dev gulp-s3-index
```

## Example

```js
var gulp = require('gulp');
var revall = require('gulp-rev-all');
var awspublish = require('gulp-awspublish');
var s3_index = require("gulp-s3-index");

var aws = {
    "key": "AKIAI3Z7CUAFHG53DMJA",
    "secret": "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",
    "bucket": "bucket-name",
    "region": "us-standard"
};

var publisher = awspublish.create(aws);
var headers = {'Cache-Control': 'max-age=315360000, no-transform, public'};

gulp.task('default', function () {
    gulp.src('dist/**')
        .pipe(revall())
        .pipe(awspublish.gzip())
        .pipe(publisher.publish(headers))
        .pipe(publisher.cache())
        .pipe(awspublish.reporter())
        .pipe(s3_index(aws));
});
```

  * See [gulp-awspublish](https://www.npmjs.org/package/gulp-awspublish), [gulp-rev-all](https://www.npmjs.org/package/gulp-rev-all)


## API

#### options.patternIndex

Type: `Regular Expression`
Default: `/^\/index\.[a-f0-9]{8}\.html(\.gz)*$/gi`

Specify the pattern used to match the default index file

```js

var aws = {
    ..,
    "patternIndex": /^\/root\-[a-f0-9]{4}\.html(\.gz)*$/gi
};

```


## License

[MIT](http://opensource.org/licenses/MIT)
