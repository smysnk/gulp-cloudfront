"use strict";

const assert = require("node:assert/strict");
const gulp = require("gulp");
const sinon = require("sinon");
const {
  GetDistributionConfigCommand,
  UpdateDistributionCommand,
} = require("@aws-sdk/client-cloudfront");

const cloudfront = require("./dist");
const createTool = require("./dist/tool");

function withStubbedFancyLog(stub) {
  const fancyLogPath = require.resolve("fancy-log");
  const cloudfrontPath = require.resolve("./dist");
  const originalFancyLogModule = require.cache[fancyLogPath];
  const originalCloudfrontModule = require.cache[cloudfrontPath];

  require.cache[fancyLogPath] = {
    ...originalFancyLogModule,
    exports: stub,
  };
  delete require.cache[cloudfrontPath];

  try {
    return require("./dist");
  } finally {
    if (originalFancyLogModule) {
      require.cache[fancyLogPath] = originalFancyLogModule;
    } else {
      delete require.cache[fancyLogPath];
    }

    if (originalCloudfrontModule) {
      require.cache[cloudfrontPath] = originalCloudfrontModule;
    } else {
      delete require.cache[cloudfrontPath];
    }
  }
}

function collectStream(stream) {
  return new Promise((resolve, reject) => {
    const files = [];

    stream.on("data", function onData(file) {
      files.push(file);
    });
    stream.on("error", reject);
    stream.on("end", function onEnd() {
      resolve(files);
    });
  });
}

function runFixturePipeline(globPath, options) {
  return collectStream(
    gulp
      .src([`${globPath}/**/*.*`], { cwd: __dirname, nodir: true })
      .pipe(cloudfront(options)),
  );
}

function createDistributionConfig(overrides = {}) {
  return {
    DefaultRootObject: "index.old.html",
    Comment: null,
    Logging: {
      Enabled: false,
      Bucket: null,
      Prefix: null,
    },
    Origins: {
      Items: [
        {
          Id: "origin-1",
          DomainName: "example.s3.amazonaws.com",
          S3OriginConfig: {
            OriginAccessIdentity: null,
          },
        },
      ],
    },
    ...overrides,
  };
}

describe("gulp-cloudfront", function () {
  describe("plugin", function () {
    it("identifies the default index pattern", async function () {
      const updateDefaultRootObject = sinon.stub().resolves();

      const files = await runFixturePipeline("test/fixtures/config1", {
        tool: { updateDefaultRootObject },
      });

      assert.ok(files.length > 0);
      sinon.assert.calledOnceWithExactly(
        updateDefaultRootObject,
        "/index.abcd1234.html",
      );
    });

    it("identifies the default gzipped index pattern", async function () {
      const updateDefaultRootObject = sinon.stub().resolves();

      await runFixturePipeline("test/fixtures/gzip", {
        tool: { updateDefaultRootObject },
      });

      sinon.assert.calledOnceWithExactly(
        updateDefaultRootObject,
        "/index.abcd1234.html",
      );
    });

    it("identifies a custom index pattern", async function () {
      const updateDefaultRootObject = sinon.stub().resolves();

      await runFixturePipeline("test/fixtures/config1", {
        patternIndex: /^\/custom\.[a-f0-9]{4}\.html$/i,
        tool: { updateDefaultRootObject },
      });

      sinon.assert.calledOnceWithExactly(
        updateDefaultRootObject,
        "/custom.a1b2.html",
      );
    });

    it("logs update errors and continues streaming files", async function () {
      const updateDefaultRootObject = sinon.stub().rejects(new Error("boom"));
      const logStub = sinon.stub();
      const cloudfrontWithStubbedLog = withStubbedFancyLog(logStub);

      const files = await collectStream(
        gulp
          .src(["test/fixtures/config1/**/*.*"], { cwd: __dirname, nodir: true })
          .pipe(cloudfrontWithStubbedLog({ tool: { updateDefaultRootObject } })),
      );

      assert.ok(files.length > 0);
      sinon.assert.calledOnce(updateDefaultRootObject);
      sinon.assert.called(logStub);
    });
  });

  describe("tool", function () {
    it("requires a distribution id", function () {
      assert.throws(
        function expectThrow() {
          createTool();
        },
        /options\.distributionId is required/,
      );
    });

    it("requires explicit credentials to be complete", function () {
      assert.throws(
        function expectThrow() {
          createTool({
            distributionId: "DIST_ID",
            accessKeyId: "access-key-only",
          });
        },
        /must be provided together/,
      );
    });

    it("skips the update when the default root object is unchanged", async function () {
      const client = {
        send: sinon.stub().resolves({
          ETag: "etag-1",
          DistributionConfig: createDistributionConfig({
            DefaultRootObject: "index.abcd1234.html",
          }),
        }),
      };

      const tool = createTool({
        distributionId: "DIST_ID",
        client,
      });

      await tool.updateDefaultRootObject("/index.abcd1234.html");

      sinon.assert.calledOnce(client.send);
      assert.ok(
        client.send.firstCall.args[0] instanceof GetDistributionConfigCommand,
      );
      assert.deepEqual(client.send.firstCall.args[0].input, { Id: "DIST_ID" });
    });

    it("updates the distribution config with a trimmed root object", async function () {
      const client = {
        send: sinon.stub(),
      };

      client.send.onFirstCall().resolves({
        ETag: "etag-1",
        DistributionConfig: createDistributionConfig(),
      });
      client.send.onSecondCall().resolves({});

      const tool = createTool({
        distributionId: "DIST_ID",
        client,
      });

      await tool.updateDefaultRootObject("/index.abcd1234.html");

      sinon.assert.calledTwice(client.send);

      const getDistributionConfigCommand = client.send.firstCall.args[0];
      const updateDistributionCommand = client.send.secondCall.args[0];

      assert.ok(
        getDistributionConfigCommand instanceof GetDistributionConfigCommand,
      );
      assert.deepEqual(getDistributionConfigCommand.input, { Id: "DIST_ID" });

      assert.ok(updateDistributionCommand instanceof UpdateDistributionCommand);
      assert.equal(updateDistributionCommand.input.Id, "DIST_ID");
      assert.equal(updateDistributionCommand.input.IfMatch, "etag-1");
      assert.equal(
        updateDistributionCommand.input.DistributionConfig.DefaultRootObject,
        "index.abcd1234.html",
      );
      assert.equal(
        updateDistributionCommand.input.DistributionConfig.Comment,
        "",
      );
      assert.equal(
        updateDistributionCommand.input.DistributionConfig.Logging.Bucket,
        "",
      );
      assert.equal(
        updateDistributionCommand.input.DistributionConfig.Logging.Prefix,
        "",
      );
      assert.equal(
        updateDistributionCommand.input.DistributionConfig.Origins.Items[0]
          .S3OriginConfig.OriginAccessIdentity,
        "",
      );
    });

    it("updates 403 and 404 error responses when pushstate is enabled", async function () {
      const client = {
        send: sinon.stub(),
      };

      client.send.onFirstCall().resolves({
        ETag: "etag-1",
        DistributionConfig: createDistributionConfig({
          CustomErrorResponses: {
            Quantity: 3,
            Items: [
              { ErrorCode: 403, ResponsePagePath: "/errors/403.html" },
              { ErrorCode: 404, ResponsePagePath: "/errors/404.html" },
              { ErrorCode: 500, ResponsePagePath: "/errors/500.html" },
            ],
          },
        }),
      });
      client.send.onSecondCall().resolves({});

      const tool = createTool({
        distributionId: "DIST_ID",
        pushstate: true,
        client,
      });

      await tool.updateDefaultRootObject("/index.abcd1234.html");

      const updateDistributionCommand = client.send.secondCall.args[0];
      const errorResponses =
        updateDistributionCommand.input.DistributionConfig.CustomErrorResponses
          .Items;

      assert.equal(errorResponses[0].ResponsePagePath, "/index.abcd1234.html");
      assert.equal(errorResponses[1].ResponsePagePath, "/index.abcd1234.html");
      assert.equal(errorResponses[2].ResponsePagePath, "/errors/500.html");
    });

    it("updates only configured error responses when pushstate is a custom list", async function () {
      const client = {
        send: sinon.stub(),
      };

      client.send.onFirstCall().resolves({
        ETag: "etag-1",
        DistributionConfig: createDistributionConfig({
          CustomErrorResponses: {
            Quantity: 2,
            Items: [
              { ErrorCode: 403, ResponsePagePath: "/errors/403.html" },
              { ErrorCode: 404, ResponsePagePath: "/errors/404.html" },
            ],
          },
        }),
      });
      client.send.onSecondCall().resolves({});

      const tool = createTool({
        distributionId: "DIST_ID",
        pushstate: [404],
        client,
      });

      await tool.updateDefaultRootObject("/index.abcd1234.html");

      const updateDistributionCommand = client.send.secondCall.args[0];
      const errorResponses =
        updateDistributionCommand.input.DistributionConfig.CustomErrorResponses
          .Items;

      assert.equal(errorResponses[0].ResponsePagePath, "/errors/403.html");
      assert.equal(errorResponses[1].ResponsePagePath, "/index.abcd1234.html");
    });
  });
});
