// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import path from "path";

import { WebpackConfigParams } from "@lichtblick/suite-desktop/src/WebpackConfigParams";
import { webpackDevServerConfig } from "@lichtblick/suite-desktop/src/webpackDevServerConfig";
import { webpackMainConfig } from "@lichtblick/suite-desktop/src/webpackMainConfig";
import { webpackPreloadConfig } from "@lichtblick/suite-desktop/src/webpackPreloadConfig";
import { webpackQuicklookConfig } from "@lichtblick/suite-desktop/src/webpackQuicklookConfig";
import { webpackRendererConfig } from "@lichtblick/suite-desktop/src/webpackRendererConfig";

import packageJson from "../package.json";
import CopyWebpackPlugin from "copy-webpack-plugin";
import { Configuration } from "webpack"; // 新增导入
import type { Configuration as WebpackConfig } from 'webpack';
const params: WebpackConfigParams = {
  packageJson,
  outputPath: path.resolve(__dirname, ".webpack"),
  prodSourceMap: "source-map",
  rendererContext: path.resolve(__dirname, "renderer"),
  rendererEntrypoint: "./index.ts",
  mainContext: path.resolve(__dirname, "main"),
  mainEntrypoint: "./index.ts",
  quicklookContext: path.resolve(__dirname, "quicklook"),
  quicklookEntrypoint: "./index.ts",
  preloadContext: path.resolve(__dirname, "preload"),
  preloadEntrypoint: "./index.ts",
};
// 修改开发服务器配置
const customDevServerConfig = (config: Configuration) => {
  return {
    ...webpackDevServerConfig(params)(config),
    static: {
      directory: path.join(__dirname, "public"), // 添加静态资源目录
      publicPath: "/public",
    },
  };
};
// 修改渲染器配置
const customRendererConfig = (config: Configuration) => {
  return {
    ...webpackRendererConfig(params)(config),
    plugins: [
      ...(webpackRendererConfig(params)(config).plugins || []),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, "public"), // 源目录
            to: path.resolve(__dirname, ".webpack/renderer/public"), // 输出目录
            globOptions: {
              ignore: ["**/.DS_Store"], // 忽略Mac系统文件
            },
          },
        ],
      }),
    ],
  };
};

// export default [
//   webpackDevServerConfig(params),
//   webpackMainConfig(params),
//   webpackPreloadConfig(params),
//   webpackRendererConfig(params),
//   webpackQuicklookConfig(params),
//
// ];
const configs: WebpackConfig[] = [
  customDevServerConfig,
  webpackMainConfig(params),
  webpackPreloadConfig(params),
  customRendererConfig,
  webpackQuicklookConfig(params),
];

export default configs;
