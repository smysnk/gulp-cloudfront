# [gulp](https://github.com/wearefractal/gulp)-cloudfront [![Build Status](https://travis-ci.org/smysnk/gulp-cloudfront.png?branch=master)](https://travis-ci.org/smysnk/gulp-cloudfront)

> Updates the [Default Root Object](http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DefaultRootObject.html) of a [CloudFront](http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html) distribution

## Purpose

Content distribution networks like [CloudFront](http://aws.amazon.com/cloudfront/) let you cache static assets in [Edge Locations](http://aws.amazon.com/about-aws/globalinfrastructure/) for extended periods of time.
A problem occurs however when you go to release a new version of your website, previous visitors of your website will hit their cache instead.
In the case of CloudFront, you will need to invalidate items or wait for the cache TTL to expire before vistors of your website will see the vew version.

A solution to this problem is adding a revisioned number to the name your static assets.  The gulp plugin [gulp-rev-all](https://github.com/smysnk/gulp-rev-all) can assist in this process.  eg. unicorn.css => unicorn-098f6bcd.css
You can then use [gulp-s3](https://github.com/nkostelnik/gulp-s3)* to upload the revisioned files to a S3 bucket which CloudFront points to.

**Finally gulp-cloudfront comes in during the final step, to update a CloudFront distributions' Default Root Object to the latest revisioned index.html.**  
Updating the Default Root Object only takes 5-10 minutes and all new visitors to your website will no longer see the old cached content.
A much better solution than waiting for cached items to expire or invalidating individual files which costs $$.

## Install

Install with [npm](https://npmjs.org/package/gulp-rev-all)

```
npm install --save-dev gulp-cloudfront
```

## Example

```js
var gulp = require('gulp');
var s3 = require("gulp-s3");
var revall = require('gulp-rev-all');
var gzip = require("gulp-gzip");
var cloudfront = require("gulp-cloudfront");

var options = { gzippedOnly: true };
var aws = {
    "key": "AKIAI3Z7CUAFHG53DMJA",
    "secret": "acYxWRu5RRa6CwzQuhdXEfTpbQA+1XQJ7Z1bGTCx",
    "bucket": "dev.example.com",
    "region": "eu-west-1",
    "distributionId": "E1SYAKGEMSK3OD"
};

gulp.task('default', function () {
    gulp.src('dist/**')
        .pipe(revall())
        .pipe(cloudfront(aws))
        .pipe(gzip())
        .pipe(s3(aws, options));
        
});
```

## Additional

 * A [pull request](https://github.com/nkostelnik/gulp-s3/pull/7) to gulp-s3 as it currently does not support file contents from streams, which makes it incompatible with [gulp-gzip](https://github.com/jstuckey/gulp-gzip).  In the mean time you can use my forked version [here](https://github.com/smysnk/gulp-s3).

## License

[MIT](http://opensource.org/licenses/MIT) © [Joshua Bellamy-Henn](http://www.psidox.com)