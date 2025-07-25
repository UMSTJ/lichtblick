// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import BasicBuilder from "@lichtblick/suite-base/testing/builders/BasicBuilder";
import MessageDefinitionBuilder from "@lichtblick/suite-base/testing/builders/MessageDefinitionBuilder";
import { defaults } from "@lichtblick/suite-base/testing/builders/utilities";
import { OptionalMessageDefinition } from "@lichtblick/suite-base/types/RosDatatypes";

export default class RosDatatypesBuilder {
  public static optionalMessageDefinition(
    props: Partial<OptionalMessageDefinition> = {},
  ): OptionalMessageDefinition {
    return defaults<OptionalMessageDefinition>(props, {
      definitions: MessageDefinitionBuilder.messageDefinitionFields(),
      name: BasicBuilder.string(),
    });
  }
}
