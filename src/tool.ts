import {
  CloudFrontClient,
  GetDistributionConfigCommand,
  type DistributionConfig,
  type GetDistributionConfigCommandOutput,
  UpdateDistributionCommand,
  type CloudFrontClientConfig,
} from "@aws-sdk/client-cloudfront";
import fancyLog from "fancy-log";
import type {
  CloudFrontClientLike,
  CloudfrontTool,
  CloudfrontToolOptions,
} from "./types";

const PLUGIN_NAME = "gulp-cloudfront";
const DEFAULT_REGION = "us-east-1";

function trimLeadingSlash(value: string): string {
  return value.replace(/^\/+/, "");
}

function createClient(options: CloudfrontToolOptions): CloudFrontClientLike {
  if (options.client) {
    return options.client;
  }

  const accessKeyId = options.accessKeyId || options.key;
  const secretAccessKey = options.secretAccessKey || options.secret;
  const hasExplicitCredentials =
    accessKeyId || secretAccessKey || options.sessionToken;

  if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
    throw new Error(
      "options.accessKeyId/options.key and options.secretAccessKey/options.secret must be provided together",
    );
  }

  const clientOptions: CloudFrontClientConfig = {
    region: options.region || DEFAULT_REGION,
  };

  if (options.credentials) {
    clientOptions.credentials = options.credentials;
  } else if (hasExplicitCredentials) {
    clientOptions.credentials = {
      accessKeyId: accessKeyId as string,
      secretAccessKey: secretAccessKey as string,
      sessionToken: options.sessionToken,
    };
  }

  return new CloudFrontClient(clientOptions);
}

function normalizeDistributionConfig(
  distributionConfig: DistributionConfig,
): DistributionConfig {
  const normalized = structuredClone(distributionConfig);

  if (normalized.Comment == null) {
    normalized.Comment = "";
  }

  if (normalized.Logging?.Enabled === false) {
    normalized.Logging.Bucket = normalized.Logging.Bucket || "";
    normalized.Logging.Prefix = normalized.Logging.Prefix || "";
  }

  for (const origin of normalized.Origins?.Items || []) {
    if (
      origin.S3OriginConfig &&
      origin.S3OriginConfig.OriginAccessIdentity == null
    ) {
      origin.S3OriginConfig.OriginAccessIdentity = "";
    }
  }

  return normalized;
}

function assertGetDistributionResponse(
  response: GetDistributionConfigCommandOutput,
): asserts response is GetDistributionConfigCommandOutput & {
  DistributionConfig: DistributionConfig;
  ETag: string;
} {
  if (!response.DistributionConfig || !response.ETag) {
    throw new Error(
      "CloudFront getDistributionConfig response is missing DistributionConfig or ETag",
    );
  }
}

/**
 * Creates the default CloudFront tool used by the Gulp plugin.
 *
 * The returned tool fetches the current distribution config, normalizes fields
 * that CloudFront rejects when empty, and updates `DefaultRootObject` when the
 * target value changes.
 *
 * @param options CloudFront client and credential configuration used to build
 * the updater.
 * @returns A tool implementation that can update the distribution's default
 * root object.
 */
function createTool(options?: CloudfrontToolOptions): CloudfrontTool {
  if (!options?.distributionId) {
    throw new Error("options.distributionId is required");
  }

  const toolOptions = options;
  const client = createClient(toolOptions);

  async function updateDefaultRootObject(
    defaultRootObject: string,
  ): Promise<void> {
    const rootObject = trimLeadingSlash(defaultRootObject);
    const response = await client.send(
      new GetDistributionConfigCommand({ Id: toolOptions.distributionId }),
    );

    assertGetDistributionResponse(response);

    const distributionConfig = normalizeDistributionConfig(
      response.DistributionConfig,
    );

    if (distributionConfig.DefaultRootObject === rootObject) {
      fancyLog(
        `${PLUGIN_NAME}:`,
        "DefaultRootObject hasn't changed, not updating.",
      );
      return;
    }

    distributionConfig.DefaultRootObject = rootObject;

    await client.send(
      new UpdateDistributionCommand({
        Id: toolOptions.distributionId,
        IfMatch: response.ETag,
        DistributionConfig: distributionConfig,
      }),
    );

    fancyLog(`${PLUGIN_NAME}:`, `DefaultRootObject updated to [${rootObject}].`);
  }

  return {
    updateDefaultRootObject,
  };
}

namespace createTool {
  /** Options accepted by {@link createTool}. */
  export type Options = CloudfrontToolOptions;
  /** Tool shape returned by {@link createTool}. */
  export type Tool = CloudfrontTool;
}

export = createTool;
