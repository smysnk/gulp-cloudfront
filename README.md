# [gulp](https://github.com/wearefractal/gulp)-cloudfront [![Build Status](https://travis-ci.org/smysnk/gulp-cloudfront.png?branch=master)](https://travis-ci.org/smysnk/gulp-cloudfront)

> Updates the Default Root Object of a CloudFront distribution

## Purpose

Content distribution networks like [CloudFront](http://aws.amazon.com/cloudfront/) let you cache static assets in [Edge Locations](http://aws.amazon.com/about-aws/globalinfrastructure/) for extended periods of time.
A problem occurs however when you go to release a new version of your website, you will have to explictly tell CloudFront to expire each file or you will have to wait for the [TTL to expire](http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html).
In the case of CloudFront, you will need to invalidate items or wait for the cache TTL to expire before vistors of your website will see the vew version.

A solution to this problem is adding a revisioned suffix to the filename for each static asset.  The gulp plugin [gulp-rev-all](https://github.com/smysnk/gulp-rev-all) can assist in this process.  eg. unicorn.css => unicorn-098f6bcd.css
You can then use [gulp-s3](https://github.com/nkostelnik/gulp-s3) to upload the revisioned files to a S3 bucket which CloudFront points to.

**Finally gulp-cloudfront comes in during the final step, to update a CloudFront distributions' [Default Root Object](http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DefaultRootObject.html) to the latest revisioned index.html.**  
Updating the Default Root Object only takes 5-10 minutes and all new visitors to your website will no longer see the old cached content.
A much better solution than waiting for cached items to expire or invalidating individual files which costs $$.

## Under the Hood

This plugin will identify the index.html file based on the default or configured pattern.  Once identified it will update the CloudFront distribution to the new index file.

## Install

Install with [npm](https://npmjs.org)

```
npm install --save-dev gulp-cloudfront
```

## Example

```js
var gulp = require('gulp');
var revall = require('gulp-rev-all');
var awspublish = require('gulp-awspublish');
var cloudfront = require("gulp-cloudfront");

var aws = {
    "key": "AKIAI3Z7CUAFHG53DMJA",
    "secret": "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",
    "bucket": "bucket-name",
    "region": "us-standard",
    "distributionId": "E1SYAKGEMSK3OD"
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
        .pipe(cloudfront(aws));
});
```

  * See [gulp-awspublish](https://www.npmjs.org/package/gulp-awspublish), [gulp-rev-all](https://www.npmjs.org/package/gulp-rev-all)


## API

#### options.patternIndex

Type: `Regular Expression`
Default: `/^\/index\.[a-f0-9]{8}\.html(\.gz)*$/gi`

Specify the pattern used to match the default root object

```js

var aws = {
    ..,
    "patternIndex": /^\/root\-[a-f0-9]{4}\.html(\.gz)*$/gi
};

```


## License

[MIT](http://opensource.org/licenses/MIT) © [Joshua Bellamy-Henn](http://www.psidox.com)
