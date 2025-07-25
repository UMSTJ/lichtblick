// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as Comlink from "@lichtblick/comlink";
import { abortSignalTransferHandler } from "@lichtblick/comlink-transfer-handlers";
import { Immutable, MessageEvent } from "@lichtblick/suite";

import type {
  GetBackfillMessagesArgs,
  IIterableSource,
  IMessageCursor,
  Initialization,
  IteratorResult,
  MessageIteratorArgs,
} from "./IIterableSource";
import { IteratorCursor } from "./IteratorCursor";

export class WorkerIterableSourceWorker implements IIterableSource {
  protected _source: IIterableSource;

  public constructor(source: IIterableSource) {
    this._source = source;
  }

  public async initialize(): Promise<Initialization> {
    return await this._source.initialize();
  }

  public messageIterator(
    args: MessageIteratorArgs,
  ): AsyncIterableIterator<Readonly<IteratorResult>> & Comlink.ProxyMarked {
    return Comlink.proxy(this._source.messageIterator(args));
  }

  public async getBackfillMessages(
    args: Omit<GetBackfillMessagesArgs, "abortSignal">,
    // abortSignal is a separate argument so it can be proxied by comlink since AbortSignal is not
    // clonable (and needs to signal across the worker boundary)
    abortSignal?: AbortSignal,
  ): Promise<MessageEvent[]> {
    return await this._source.getBackfillMessages({
      ...args,
      abortSignal,
    });
  }

  public getMessageCursor(
    args: Omit<Immutable<MessageIteratorArgs>, "abort">,
    abort?: AbortSignal,
  ): IMessageCursor & Comlink.ProxyMarked {
    const iter = this._source.messageIterator(args);
    const cursor = new IteratorCursor(iter, abort);
    return Comlink.proxy(cursor);
  }
}

Comlink.transferHandlers.set("abortsignal", abortSignalTransferHandler);
