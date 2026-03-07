import path from "node:path";
import type { Transform } from "node:stream";
import fancyLog from "fancy-log";
import PluginError from "plugin-error";
import through from "through2";
import createTool = require("./tool");
import type {
  CloudfrontOptions,
  CloudfrontTool,
  CloudfrontToolOptions,
  VinylLike,
} from "./types";

const PLUGIN_NAME = "gulp-cloudfront";
const DEFAULT_PATTERN_INDEX = /^\/index\.[a-f0-9]{8}\.html(?:\.gz)?$/i;

type TransformCallback = (error?: Error | null, data?: VinylLike) => void;

function stripTrailingSeparator(value: string): string {
  return value.replace(/[\\/]$/, "");
}

function toDistributionPath(dirRoot: string, filePath: string): string {
  const relativePath = path.relative(dirRoot, filePath).split(path.sep).join("/");
  return relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
}

function matchesPattern(pattern: RegExp, value: string): boolean {
  pattern.lastIndex = 0;
  return pattern.test(value);
}

function resolveToolOptions(options: CloudfrontOptions): CloudfrontToolOptions {
  if (!options.distributionId) {
    throw new Error("options.distributionId is required");
  }

  return {
    distributionId: options.distributionId,
    region: options.region,
    credentials: options.credentials,
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    key: options.key,
    secret: options.secret,
    sessionToken: options.sessionToken,
    pushstate: options.pushstate,
    client: options.client,
  };
}

/**
 * Gulp plugin that finds the revisioned HTML entrypoint in the incoming Vinyl
 * stream and updates a CloudFront distribution's `DefaultRootObject`.
 *
 * If the matching file ends with `.gz`, the suffix is removed before the
 * CloudFront update is sent.
 *
 * @param options Plugin configuration, including CloudFront credentials,
 * distribution id, and optional matching overrides.
 * @returns An object-mode transform stream that forwards every Vinyl file after
 * evaluating whether it should update CloudFront.
 */
function cloudfront(options: CloudfrontOptions = {}): Transform {
  const patternIndex = options.patternIndex || DEFAULT_PATTERN_INDEX;
  const tool = options.tool || createTool(resolveToolOptions(options));
  let dirRoot = options.dirRoot ? path.resolve(options.dirRoot) : null;
  let firstFile = true;

  return through.obj(function transform(
    file: VinylLike,
    _enc: BufferEncoding,
    callback: TransformCallback,
  ) {
    const processFile = async (): Promise<void> => {
      if (file.isNull()) {
        callback(null, file);
        return;
      }

      if (file.isStream()) {
        callback(new PluginError(PLUGIN_NAME, "Streams not supported"));
        return;
      }

      if (firstFile) {
        dirRoot = dirRoot || stripTrailingSeparator(file.base);
        fancyLog(`${PLUGIN_NAME}:`, `Root directory [${dirRoot}]`);
        firstFile = false;
      }

      let filename = toDistributionPath(dirRoot as string, file.path);
      if (!matchesPattern(patternIndex, filename)) {
        callback(null, file);
        return;
      }

      fancyLog(`${PLUGIN_NAME}:`, `Identified index [${filename}]`);

      if (filename.endsWith(".gz")) {
        filename = filename.slice(0, -3);
      }

      try {
        await tool.updateDefaultRootObject(filename);
      } catch (error) {
        const pluginError = new PluginError(PLUGIN_NAME, error as Error);
        fancyLog(pluginError.toString());
      }

      callback(null, file);
    };

    processFile().catch(function onUnhandledError(error: unknown) {
      callback(new PluginError(PLUGIN_NAME, error as Error));
    });
  });
}

namespace cloudfront {
  /** Options accepted by the main plugin entry point. */
  export type Options = CloudfrontOptions;
  /** Tool contract used by the plugin to update CloudFront. */
  export type Tool = CloudfrontTool;
  /** Options accepted when constructing the default CloudFront tool. */
  export type ToolOptions = CloudfrontToolOptions;
}

export = cloudfront;
