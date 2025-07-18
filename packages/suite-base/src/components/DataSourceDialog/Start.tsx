// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { List, ListItem, ListItemButton, Typography } from "@mui/material";
// import { ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";

// import LichtblickLogoText from "@lichtblick/suite-base/components/LichtblickLogoText";
import { useStyles } from "@lichtblick/suite-base/components/DataSourceDialog/index.style";
import LichtblickLogoText from "@lichtblick/suite-base/components/LichtblickLogoText";
import Stack from "@lichtblick/suite-base/components/Stack";
import TextMiddleTruncate from "@lichtblick/suite-base/components/TextMiddleTruncate";
import { usePlayerSelection } from "@lichtblick/suite-base/context/PlayerSelectionContext";
// import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";
// import { AppEvent } from "@lichtblick/suite-base/services/IAnalytics";
// import LichtblickLogoText from "@lichtblick/suite-base/components/LichtblickLogoText";
// import { useAnalytics } from "@lichtblick/suite-base/context/AnalyticsContext";

// type DataSourceOptionProps = {
//   text: string;
//   secondaryText: string;
//   icon: React.JSX.Element;
//   onClick: () => void;
//   href?: string;
//   target: "_blank";
// };
export function isRunningInElectron() {
  return typeof window !== "undefined" && typeof window.electron !== "undefined";
}

// function SidebarItems(props: {
//   onSelectView: (newValue: DataSourceDialogItem) => void;
// }): React.JSX.Element {
//   const { onSelectView } = props;
//   const { currentUser } = useCurrentUser();
//   const analytics = useAnalytics();
//   const { classes } = useStyles();
//   const { t } = useTranslation("openDialog");

//   const { freeUser, teamOrEnterpriseUser } = useMemo(() => {
//     const demoItem = {
//       id: "new",
//       title: t("newToFoxgloveStudio"),
//       text: t("newToFoxgloveStudioDescription"),
//       actions: (
//         <>
//           <Button
//             onClick={() => {
//               onSelectView("demo");
//               void analytics.logEvent(AppEvent.DIALOG_SELECT_VIEW, { type: "demo" });
//               void analytics.logEvent(AppEvent.DIALOG_CLICK_CTA, {
//                 user: currentUser,
//                 cta: "demo",
//               });
//             }}
//             className={classes.button}
//             variant="outlined"
//           >
//             {t("exploreSampleData")}
//           </Button>
//         </>
//       ),
//     };
//     return {
//       freeUser: [demoItem],
//       teamOrEnterpriseUser: [
//         demoItem,
//         {
//           id: "need-help",
//           title: t("needHelp"),
//           text: t("needHelpDescription"),
//           actions: (
//             <>
//               <Button
//                 href="https://foxglove.dev/tutorials"
//                 target="_blank"
//                 className={classes.button}
//                 onClick={() => {
//                   void analytics.logEvent(AppEvent.DIALOG_CLICK_CTA, {
//                     user: currentUser,
//                     cta: "tutorials",
//                   });
//                 }}
//               >
//                 {t("seeTutorials")}
//               </Button>
//             </>
//           ),
//         },
//       ],
//     };
//   }, [analytics, classes.button, currentUser, onSelectView, t]);

//   const sidebarItems: SidebarItem[] = useMemo(() => {
//     switch (currentUser) {
//       case "unauthenticated":
//         return [];
//       case "authenticated-free":
//         return [
//           {
//             id: "start-collaborating",
//             title: t("startCollaborating"),
//             text: t("startCollaboratingDescription"),
//             actions: (
//               <>
//                 <Button
//                   href="https://console.foxglove.dev/recordings"
//                   target="_blank"
//                   variant="outlined"
//                   className={classes.button}
//                   onClick={() => {
//                     void analytics.logEvent(AppEvent.DIALOG_CLICK_CTA, {
//                       user: currentUserType,
//                       cta: "upload-to-dp",
//                     });
//                   }}
//                 >
//                   {t("uploadToDataPlatform")}
//                 </Button>
//                 <Button
//                   href="https://docs.foxglove.dev/docs/visualization/layouts#team-layouts"
//                   target="_blank"
//                   className={classes.button}
//                 >
//                   {t("shareLayouts")}
//                 </Button>
//               </>
//             ),
//           },
//           ...freeUser,
//         ];
//       case "authenticated-team":
//         return teamOrEnterpriseUser;
//       case "authenticated-enterprise":
//         return teamOrEnterpriseUser;
//     }
//   }, [analytics, classes.button, currentUserType, freeUser, teamOrEnterpriseUser, t]);

//   return (
//     <>
//       {sidebarItems.map((item) => (
//         <Stack key={item.id}>
//           <Typography variant="h5" gutterBottom>
//             {item.title}
//           </Typography>
//           <Typography variant="body2" color="text.secondary">
//             {item.text}
//           </Typography>
//           {item.actions != undefined && (
//             <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1} paddingTop={1.5}>
//               {item.actions}
//             </Stack>
//           )}
//         </Stack>
//       ))}
//     </>
//   );
// }
export default function Start(): React.JSX.Element {
  const { recentSources, selectRecent } = usePlayerSelection();
  const { classes } = useStyles();
  // const analytics = useAnalytics();
  const { t } = useTranslation("openDialog");
  // const { dialogActions } = useWorkspaceActions();

  return (
    <Stack className={classes.grid}>
      <header className={classes.header}>
        <LichtblickLogoText color="primary" className={classes.logo} />
      </header>
      <Stack className={classes.content}>
        <Stack gap={4}>
          <Stack gap={1}>
            <Typography variant="h5" gutterBottom>
              {t("openDataSource")}
            </Typography>
            {/* {startItems.map((item) => (
              <DataSourceOption
                key={item.key}
                text={item.text}
                secondaryText={item.secondaryText}
                icon={item.icon}
                onClick={item.onClick}
                target="_blank"
              />
            ))} */}
          </Stack>
          {recentSources.length > 0 && (
            <Stack gap={1}>
              <Typography variant="h5" gutterBottom>
                {t("recentDataSources")}
              </Typography>
              <List disablePadding>
                {recentSources.slice(0, 5).map((recent) => (
                  <ListItem disablePadding key={recent.id} id={recent.id}>
                    <ListItemButton
                      disableGutters
                      onClick={() => {
                        selectRecent(recent.id);
                      }}
                      className={classes.recentListItemButton}
                    >
                      <TextMiddleTruncate
                        className={classes.recentSourceSecondary}
                        text={recent.title}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Stack>
          )}
        </Stack>
      </Stack>
      <div className={classes.spacer} />
      <Stack gap={4} className={classes.sidebar}>
        {/* <SidebarItems onSelectView={dialogActions.dataSource.open} /> */}
      </Stack>
    </Stack>
  );
}
