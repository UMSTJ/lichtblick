// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

const path = require("path");

const {
  makeElectronBuilderConfig,
} = require("@lichtblick/suite-desktop/src/electronBuilderConfig");

module.exports = makeElectronBuilderConfig({
  appPath: path.resolve(__dirname, ".webpack"),

  // 新增以下配置
  files: [
    "dist/**/*",
    "main/**/*",
    "public/**/*", // ✅ 包含public目录
    "preload.js"
  ],
  extraResources: [
    {
      "from": "public",  // 源目录
      "to": "public",    // 目标目录（会复制到app资源目录）
      "filter": ["**/*"] // 包含所有文件
    }
  ]
});
