import type {
  CloudFrontClientConfig,
  GetDistributionConfigCommand,
  GetDistributionConfigCommandOutput,
  UpdateDistributionCommand,
} from "@aws-sdk/client-cloudfront";

/**
 * Minimal tool contract used by the plugin to update a CloudFront distribution.
 */
export interface CloudfrontTool {
  /**
   * Sets the distribution's `DefaultRootObject`.
   *
   * The provided path may start with `/`; the implementation normalizes it to
   * the value CloudFront expects before submitting the update request.
   *
   * @param defaultRootObject Distribution-relative path to publish as the
   * default root object.
   * @returns A promise that resolves when the CloudFront update has completed,
   * or immediately when no update is needed.
   */
  updateDefaultRootObject(defaultRootObject: string): Promise<void>;
}

/**
 * Lightweight client contract that matches the subset of the AWS SDK used by
 * this package. Supplying this makes the tool easy to stub in tests.
 */
export interface CloudFrontClientLike {
  /**
   * Sends a `GetDistributionConfig` command.
   *
   * @param command AWS SDK command instance describing the distribution config
   * lookup.
   * @returns The CloudFront distribution config response from AWS.
   */
  send(
    command: GetDistributionConfigCommand,
  ): Promise<GetDistributionConfigCommandOutput>;
  /**
   * Sends an `UpdateDistribution` command.
   *
   * @param command AWS SDK command instance describing the distribution update.
   * @returns A promise that resolves when AWS accepts the distribution update.
   */
  send(command: UpdateDistributionCommand): Promise<unknown>;
}

/**
 * Options used to create the CloudFront update tool.
 */
export interface CloudfrontToolOptions {
  /** CloudFront distribution identifier to update. */
  distributionId: string;
  /** Region used to configure the AWS SDK client. Defaults to `us-east-1`. */
  region?: string;
  /** Explicit AWS credential provider or static credential object. */
  credentials?: CloudFrontClientConfig["credentials"];
  /** AWS access key id. Alias of {@link key}. */
  accessKeyId?: string;
  /** AWS secret access key. Alias of {@link secret}. */
  secretAccessKey?: string;
  /** Legacy alias for {@link accessKeyId}. */
  key?: string;
  /** Legacy alias for {@link secretAccessKey}. */
  secret?: string;
  /** Optional AWS session token when using temporary credentials. */
  sessionToken?: string;
  /** Override for the CloudFront client, primarily useful in tests. */
  client?: CloudFrontClientLike;
}

/**
 * Options accepted by the Gulp plugin entry point.
 */
export interface CloudfrontOptions {
  /** CloudFront distribution identifier to update. Required unless `tool` is provided. */
  distributionId?: string;
  /** Region used to configure the AWS SDK client. Defaults to `us-east-1`. */
  region?: string;
  /** Explicit AWS credential provider or static credential object. */
  credentials?: CloudFrontClientConfig["credentials"];
  /** AWS access key id. Alias of {@link key}. */
  accessKeyId?: string;
  /** AWS secret access key. Alias of {@link secret}. */
  secretAccessKey?: string;
  /** Legacy alias for {@link accessKeyId}. */
  key?: string;
  /** Legacy alias for {@link secretAccessKey}. */
  secret?: string;
  /** Optional AWS session token when using temporary credentials. */
  sessionToken?: string;
  /** Override for the CloudFront client, primarily useful in tests. */
  client?: CloudFrontClientLike;
  /** Pattern used to identify the revisioned HTML file that should become the root object. */
  patternIndex?: RegExp;
  /** Root directory used to derive the distribution-relative path from each Vinyl file. */
  dirRoot?: string;
  /** Pre-built tool implementation. When provided, `distributionId` is not needed. */
  tool?: CloudfrontTool;
}

/**
 * Minimal Vinyl contract consumed by the plugin transform.
 */
export interface VinylLike {
  isNull(): boolean;
  isStream(): boolean;
  base: string;
  path: string;
}
