// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/* eslint-disable filenames/match-exported */

import * as monacoApi from "monaco-editor/esm/vs/editor/editor.api";

const theme: monacoApi.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    {
      foreground: "6c6783",
      token: "comment",
    },
    {
      foreground: "eba800",
      token: "string",
    },
    {
      foreground: "9987ff",
      token: "constant.numeric",
    },
    {
      foreground: "9987ff",
      token: "constant.language",
    },
    {
      foreground: "9987ff",
      token: "constant.character",
    },
    {
      foreground: "9987ff",
      token: "constant.other",
    },
    {
      foreground: "e05ffa",
      token: "keyword",
    },
    {
      foreground: "e05ffa",
      token: "storage",
    },
    {
      foreground: "45a5ff",
      fontStyle: "italic",
      token: "storage.type",
    },
    {
      foreground: "6bd66f",
      fontStyle: "underline",
      token: "entity.name.class",
    },
    {
      foreground: "6bd66f",
      fontStyle: "italic underline",
      token: "entity.other.inherited-class",
    },
    {
      foreground: "6bd66f",
      token: "entity.name.function",
    },
    {
      foreground: "fc8942",
      fontStyle: "italic",
      token: "variable.parameter",
    },
    {
      foreground: "db3553",
      token: "entity.name.tag",
    },
    {
      foreground: "6bd66f",
      token: "entity.other.attribute-name",
    },
    {
      foreground: "45a5ff",
      token: "support.function",
    },
    {
      foreground: "45a5ff",
      token: "support.constant",
    },
    {
      foreground: "45a5ff",
      fontStyle: "italic",
      token: "support.type",
    },
    {
      foreground: "45a5ff",
      fontStyle: "italic",
      token: "support.class",
    },
    {
      foreground: "f0f0f0",
      background: "ff6b82",
      token: "invalid",
    },
    {
      foreground: "f0f0f0",
      background: "6858f5",
      token: "invalid.deprecated",
    },
  ],
  colors: {
    "editor.foreground": "#F7F7F3C4",
    "editor.background": "#08080A",
    "editor.selectionBackground": "#F7F7F326",
    "editor.lineHighlightBackground": "#F7F7F31A",
    "editorCursor.foreground": "#F7F7F3C4",
    "editorWhitespace.foreground": "#3B3A32",
  },
};

export default theme;
