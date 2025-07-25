// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0
import sanitizeHtml from "sanitize-html";

import { ALLOWED_TAGS } from "@lichtblick/suite-base/panels/DiagnosticStatus/constants";

export function sanitize(value: string): { __html: string } {
  return {
    __html: sanitizeHtml(value, {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: {
        font: ["color", "size"],
        td: ["colspan"],
        th: ["colspan"],
      },
    }),
  };
}
