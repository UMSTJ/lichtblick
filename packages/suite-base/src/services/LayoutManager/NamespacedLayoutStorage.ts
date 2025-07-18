// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Logger from "@lichtblick/log";
import { LayoutID } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { ILayoutStorage, Layout } from "@lichtblick/suite-base/services/ILayoutStorage";

const log = Logger.getLogger(__filename);

/**
 * A wrapper around ILayoutStorage for a particular namespace.
 */
export class NamespacedLayoutStorage {
  #migration: Promise<void>;
  public constructor(
    private storage: ILayoutStorage,
    private namespace: string,
    {
      migrateUnnamespacedLayouts,
      importFromNamespace,
    }: { migrateUnnamespacedLayouts: boolean; importFromNamespace: string | undefined },
  ) {
    this.#migration = (async function () {
      if (migrateUnnamespacedLayouts) {
        await storage.migrateUnnamespacedLayouts?.(namespace).catch((error: unknown) => {
          log.error("Migration failed:", error);
        });
      }

      if (importFromNamespace != undefined) {
        await storage
          .importLayouts({
            fromNamespace: importFromNamespace,
            toNamespace: namespace,
          })
          .catch((error: unknown) => {
            log.error("Import failed:", error);
          });
      }
    })();
  }

  public async list(): Promise<readonly Layout[]> {
    await this.#migration;
    return await this.storage.list(this.namespace);
  }
  public async get(id: LayoutID): Promise<Layout | undefined> {
    await this.#migration;
    return await this.storage.get(this.namespace, id);
  }
  public async put(layout: Layout): Promise<Layout> {
    await this.#migration;
    return await this.storage.put(this.namespace, layout);
  }
  public async delete(id: LayoutID): Promise<void> {
    await this.#migration;
    await this.storage.delete(this.namespace, id);
  }
}
