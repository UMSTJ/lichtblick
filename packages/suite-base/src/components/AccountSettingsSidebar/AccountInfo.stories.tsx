// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { StoryObj } from "@storybook/react";

import { User } from "@lichtblick/suite-base/context/CurrentUserContext";

import AccountInfo from "./AccountInfo";

export default {
  title: "AccountSettingsSidebar/AccountInfo",
  component: AccountInfo,
};

export const SignedIn: StoryObj = {
  render: () => {
    const org: User["org"] = {
      id: "fake-orgid",
      slug: "fake-org",
      displayName: "Fake Org",
      isEnterprise: false,
      allowsUploads: false,
      supportsEdgeSites: false,
    };

    const me = {
      id: "fake-userid",
      orgId: org.id,
      orgDisplayName: org.displayName,
      orgSlug: org.slug,
      orgPaid: false,
      email: "foo@example.com",
      org,
    };

    return <AccountInfo currentUser={me} />;
  },
};
