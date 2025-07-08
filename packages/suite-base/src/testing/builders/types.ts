// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

export type NumberBuilder = {
  min: number;
  max: number;
};

export type StringBuilder = {
  capitalization?: Capitalization;
  charset: "alphanumeric" | "alphabetic" | "numeric";
  count?: number;
  length: number;
};

export type MapBuilder = StringBuilder & {
  count?: number;
};

export enum Capitalization {
  LOWERCASE = "lowercase",
  UPPERCASE = "uppercase",
}

export type SamplePropertyKey = string | symbol | number;
