// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import * as _ from "lodash-es";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defaults<T extends Record<string, any>>(props: Partial<T>, fallbackProps: T): T {
  return _.defaults<Partial<T>, T>({ ...props }, fallbackProps);
}
