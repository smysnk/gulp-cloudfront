# gulp-cloudfront [![Tests](https://github.com/smysnk/gulp-cloudfront/actions/workflows/ci.yml/badge.svg)](https://github.com/smysnk/gulp-cloudfront/actions/workflows/ci.yml)

> Updates the Default Root Object of an AWS CloudFront distribution

## Purpose

CloudFront lets you cache static assets for long periods, which is great for immutable build output and less great for `index.html` when you deploy a new version of a site.

One way to avoid broad cache invalidations is to publish revisioned assets, upload them to S3, and then point CloudFront's default root object at the latest revisioned HTML entrypoint. `gulp-cloudfront` handles that last step by finding the revisioned index file in your Gulp stream and updating the distribution.

This pairs well with [`gulp-rev-all`](https://github.com/smysnk/gulp-rev-all) and an S3 publishing step such as [`gulp-awspublish`](https://www.npmjs.com/package/gulp-awspublish).

## Install

```sh
npm install --save-dev gulp-cloudfront
```

`gulp-cloudfront` currently supports Node.js 18.18 or newer.
The published package includes TypeScript declaration files.

## Example

```js
import gulp from "gulp";
import RevAll from "gulp-rev-all";
import awspublish from "gulp-awspublish";
import cloudfront from "gulp-cloudfront";

const aws = {
  distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
  region: "us-east-1",
};

export function deploy() {
  const publisher = awspublish.create({
    region: process.env.AWS_REGION || "us-east-1",
  });
  const headers = {
    "Cache-Control": "max-age=315360000, no-transform, public",
  };

  return gulp
    .src("dist/**", { base: "dist" })
    .pipe(RevAll.revision())
    .pipe(awspublish.gzip())
    .pipe(publisher.publish(headers))
    .pipe(publisher.cache())
    .pipe(awspublish.reporter())
    .pipe(cloudfront(aws));
}
```

## Options

### `distributionId`

Type: `string`

Required. The CloudFront distribution to update.

### `patternIndex`

Type: `RegExp`
Default: `/^\/index\.[a-f0-9]{8}\.html(?:\.gz)?$/i`

Overrides the pattern used to identify the HTML file that should become the default root object.

```js
const aws = {
  distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
  patternIndex: /^\/root\-[a-f0-9]{4}\.html(?:\.gz)?$/i,
};
```

### `region`

Type: `string`
Default: `"us-east-1"`

AWS region used to configure the SDK client. CloudFront is a global service, but the AWS SDK still requires a region for client resolution.

### Credentials

If you do not pass explicit credentials, the AWS SDK v3 default credential chain is used.

You can also pass:

- `accessKeyId`
- `secretAccessKey`
- `key`
- `secret`
- `sessionToken`
- `credentials`

### `pushstate`

Type: `boolean | number[]`
Default: `false`

Rewrites matching CloudFront custom error responses to the newly published root
object, which is useful for HTML5 pushstate routing.

Pass `true` to update both `403` and `404`, or pass a list such as `[404]` to
target specific status codes.

## Notes

- The plugin trims a trailing `.gz` suffix before updating `DefaultRootObject`.
- Update failures are logged and the Vinyl stream continues, matching the historical plugin behavior.

## License

[MIT](https://opensource.org/licenses/MIT) © [Joshua Bellamy](https://smysnk.com)
