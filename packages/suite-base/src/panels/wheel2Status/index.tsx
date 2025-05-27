// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Stack, Typography, Card, LinearProgress, CardContent } from "@mui/material";
import { styled } from "@mui/material/styles";
import { use } from "cytoscape";
import React, { useEffect, useState } from "react";

// Assuming this path is correct for your project structure
import { init } from "text-metrics";

import { useMessageDataItem } from "@lichtblick/suite-base/components/MessagePathSyntax/useMessageDataItem";
import Panel from "@lichtblick/suite-base/components/Panel";

// Enums and Types for statuses
enum ControlMode {
  MANUAL = "MANUAL",
  AUTO_NAV = "AUTO_NAV",
  EMERGENCY_STOP = "EMERGENCY_STOP",
  NOT_OPERATED = "NOT_OPERATED",
}

interface ControlModeStyle {
  label: string;
  colorKey: keyof import("@mui/material").PaletteColor | "grey" | "warning" | "success" | "error"; // For theme palette access
  colorShade?: number | string; // e.g., 500 or 'A400'
}

const controlModeStyles: Record<ControlMode, ControlModeStyle> = {
  [ControlMode.MANUAL]: { label: "手动模式", colorKey: "warning", colorShade: "main" },
  [ControlMode.AUTO_NAV]: { label: "自动导航", colorKey: "success", colorShade: "main" },
  [ControlMode.EMERGENCY_STOP]: { label: "急停", colorKey: "error", colorShade: "main" },
  [ControlMode.NOT_OPERATED]: { label: "未操作", colorKey: "grey", colorShade: 500 },
};

enum NavigationStatus {
  NOT_STARTED = "NOT_STARTED",
  STARTED = "STARTED",
}

enum SubTopic {
  BATTERY = "/battery_capacity",
  ODODM = "/odom",
  CURRENT = "/current_mode",
  NAVING = " /navigating",
}

interface NavigationStatusStyle {
  label: string;
  colorKey: keyof import("@mui/material").PaletteColor | "grey" | "warning" | "success" | "error";
  colorShade?: number | string;
}

const navigationStatusStyles: Record<NavigationStatus, NavigationStatusStyle> = {
  [NavigationStatus.NOT_STARTED]: { label: "未开始导航", colorKey: "grey", colorShade: 500 },
  [NavigationStatus.STARTED]: { label: "开始导航", colorKey: "success", colorShade: "main" },
};

// Styled Components
const RootStack = styled(Stack)(({ theme }) => ({
  height: "100%",
  width: "100%",
  padding: theme.spacing(1.5), // Added some padding for better aesthetics
  boxSizing: "border-box",
  backgroundColor: theme.palette.background.paper, // Example background
}));

const SectionStack = styled(Stack)(({ theme }) => ({
  width: "100%",
  justifyContent: "center",
  alignItems: "stretch", // Ensure children stretch
}));

const TopSection = styled(SectionStack)({
  height: "25%",
  marginBottom: "10px", // Spacing between sections
});

const MiddleSection = styled(SectionStack)({
  height: "30%",
  marginBottom: "10px", // Spacing between sections
  overflowY: "auto", // In case content overflows
  padding: "5px 0", // Padding for internal content
});

const BottomSection = styled(SectionStack)({
  height: "45%",
});

interface StatusDisplayCardProps {
  statusColorKey:
    | keyof import("@mui/material").PaletteColor
    | "grey"
    | "warning"
    | "success"
    | "error";
  statusColorShade?: number | string;
}
// Helper to safely get the latest message
const getLatestMessage = (messages: unknown[] | undefined): unknown | undefined => {
  if (Array.isArray(messages) && messages.length > 0) {
    return messages[messages.length - 1];
  }
  return undefined;
};

const StatusDisplayCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== "statusColorKey" && prop !== "statusColorShade",
})<StatusDisplayCardProps>(({ theme, statusColorKey, statusColorShade }) => {
  let backgroundColor;

  // 使用类型断言确保访问的是 palette 的有效属性
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colorPalette = (theme.palette as any)[statusColorKey];

  if (statusColorKey === "grey" && statusColorShade) {
    backgroundColor = theme.palette.grey[statusColorShade as keyof typeof theme.palette.grey];
  } else if (colorPalette?.[statusColorShade as keyof typeof colorPalette]) {
    backgroundColor = colorPalette[statusColorShade as keyof typeof colorPalette];
  } else {
    backgroundColor = theme.palette.grey[500]; // 默认 fallback
  }

  return {
    flexGrow: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor,
    width: "100%",
  };
});

const StatusCardText = styled(Typography)(({ theme }) => ({
  color: theme.palette.common.white,
  textAlign: "center",
  fontWeight: "bold",
}));

// Using CardContent for padding, or style Typography directly
const StyledCardContent = styled(CardContent)({
  padding: "8px", // Minimal padding
  "&:last-child": {
    // MUI adds extra padding to last CardContent
    paddingBottom: "8px",
  },
  width: "100%", // Ensure content area uses full card width
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
});

const InfoText = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(0.5), // Small space between info items
  fontSize: "0.875rem", // Slightly smaller text for info
}));

interface BatteryProgressBarProps {
  batteryValue: number;
}

const BatteryProgressBar = styled(LinearProgress, {
  shouldForwardProp: (prop) => prop !== "batteryValue",
})<BatteryProgressBarProps>(({ theme, batteryValue }) => ({
  height: 14, // Thicker progress bar
  borderRadius: 7,
  width: "100%", // Ensure progress bar takes full width
  backgroundColor: theme.palette.grey[300], // Background of the track
  "& .MuiLinearProgress-bar": {
    borderRadius: 7,
    backgroundColor: batteryValue > 20 ? theme.palette.success.main : theme.palette.error.main,
  },
}));

const BatteryPercentageText = styled(Typography)(({ theme }) => ({
  textAlign: "right",
  fontSize: "0.75rem",
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
}));

// Props for the WheelPanel
interface WheelPanelProps {
  initialControlMode?: ControlMode;
  initialSpeed?: string;
  initialPositioningMode?: string;
  initialAirbagValidity?: string;
  initialGpsPosition?: string;
  initialBatteryLevel?: number;
  initialNavigationStatus?: NavigationStatus;
}

const WheelPanel: React.FC<WheelPanelProps> = ({
  initialControlMode = ControlMode.MANUAL,
  initialSpeed = "0 km/h",
  initialPositioningMode = "RTK 固定", // RTK Fixed in Chinese
  initialAirbagValidity = "2025-12-31",
  initialGpsPosition = "31.2304° N, 121.4737° E",
  initialBatteryLevel = 75,
  initialNavigationStatus = NavigationStatus.NOT_STARTED,
}) => {
  // In a real app, these states might be managed by a global store or passed as props more dynamically
  const [controlMode, setControlMode] = useState<ControlMode>(initialControlMode);
  const [currentSpeed] = useState<string>(initialSpeed);
  const [positioningMode] = useState<string>(initialPositioningMode);
  const [airbagValidity] = useState<string>(initialAirbagValidity);
  const [gpsPosition] = useState<string>(initialGpsPosition);
  const [batteryLevel, setBatteryLevel] = useState<number>(initialBatteryLevel);
  const [navigationStatus, setNavigationStatus] =
    useState<NavigationStatus>(initialNavigationStatus);

  const batteryMessages = useMessageDataItem(SubTopic.BATTERY);
  const odomMessages = useMessageDataItem(SubTopic.ODODM);
  const currentModeMessages = useMessageDataItem(SubTopic.CURRENT); // Renamed for clarity
  const navigationMessages = useMessageDataItem(SubTopic.NAVING);

  const latestBatteryMsg = getLatestMessage(batteryMessages) as
    | { queriedData?: { value?: { data?: number } }[] }
    | undefined;
  const latestOdomMsg = getLatestMessage(odomMessages) as  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | { queriedData?: { value?: { data?: any } }[] }
    | undefined;
  const latestCurrentModeMsg = getLatestMessage(currentModeMessages) as
    | { queriedData?: { value?: { data?: string } }[] }
    | undefined;
  const latestNavigationMsg = getLatestMessage(navigationMessages) as
    | { queriedData?: { value?: { data?: boolean } }[] }
    | undefined;

  useEffect(() => {
    if (latestBatteryMsg?.queriedData && latestBatteryMsg.queriedData.length > 0) {
      const batteryData = latestBatteryMsg.queriedData[0]?.value?.data;
      if (typeof batteryData === "number") {
        setBatteryLevel(Math.round(batteryData)); // Ensure it's an integer
      } else {
        setBatteryLevel(initialBatteryLevel);
      }
    } else {
      setBatteryLevel(initialBatteryLevel);
    }
  }, [latestBatteryMsg, initialBatteryLevel, setBatteryLevel]);

  useEffect(() => {
    if (latestCurrentModeMsg?.queriedData && latestCurrentModeMsg.queriedData.length > 0) {
      const modeData = latestCurrentModeMsg.queriedData[0]?.value?.data;
      if (modeData === "auto") {
        setControlMode(ControlMode.AUTO_NAV);
      } else if (modeData === "manual") {
        setControlMode(ControlMode.MANUAL);
      } else if (modeData === "emergency_stop") {
        // Added hypothetical value for emergency stop
        setControlMode(ControlMode.EMERGENCY_STOP);
      } else {
        setControlMode(initialControlMode); // Fallback to initial or NOT_OPERATED
      }
    } else {
      setControlMode(initialControlMode);
    }
  }, [latestCurrentModeMsg, initialControlMode, setControlMode]);

  // useEffect(() => {
  //   if (latestOdomMsg && latestOdomMsg.queriedData && latestOdomMsg.queriedData.length > 0) {
  //     const speedData = latestOdomMsg.queriedData[0]?.value?.data;
  //     if (typeof speedData === "number") {
  //       setCurrentSpeed(`${speedData.toFixed(1)} km/h`); // Format to 1 decimal place
  //     } else {
  //       setCurrentSpeed(initialSpeed);
  //     }
  //   } else {
  //     setCurrentSpeed(initialSpeed);
  //   }
  // }, [latestOdomMsg, initialSpeed, setCurrentSpeed]);

  useEffect(() => {
    if (latestNavigationMsg?.queriedData && latestNavigationMsg.queriedData.length > 0) {
      const navData = latestNavigationMsg.queriedData[0]?.value?.data;
      if (typeof navData === "boolean") {
        setNavigationStatus(navData ? NavigationStatus.STARTED : NavigationStatus.NOT_STARTED);
      } else {
        setNavigationStatus(initialNavigationStatus);
      }
    } else {
      setNavigationStatus(initialNavigationStatus);
    }
  }, [latestNavigationMsg, initialNavigationStatus, setNavigationStatus]);
  const currentControlStyle = controlModeStyles[controlMode];
  const currentNavigationStyle = navigationStatusStyles[navigationStatus];

  return (
    <RootStack direction="column">
      {/* Top Section: Control Mode */}
      <TopSection direction="column">
        <Typography variant="overline" gutterBottom align="center" color="textSecondary">
          控制模式
        </Typography>
        <StatusDisplayCard
          statusColorKey={currentControlStyle.colorKey}
          statusColorShade={currentControlStyle.colorShade}
        >
          <StyledCardContent>
            <StatusCardText variant="h6">{currentControlStyle.label}</StatusCardText>
          </StyledCardContent>
        </StatusDisplayCard>
      </TopSection>

      {/* Middle Section: Vehicle Info */}
      <MiddleSection direction="column" alignItems="flex-start">
        <InfoText>
          速度: <strong>{currentSpeed}</strong>
        </InfoText>
        <InfoText>
          定位模式: <strong>{positioningMode}</strong>
        </InfoText>
        <InfoText>
          安全气囊有效期: <strong>{airbagValidity}</strong>
        </InfoText>
        <InfoText>
          GPS位置: <strong>{gpsPosition}</strong>
        </InfoText>
      </MiddleSection>

      {/* Bottom Section: Battery and Navigation Status */}
      <BottomSection direction="column" justifyContent="space-around">
        {/* Battery */}
        <Stack direction="column" alignItems="stretch" style={{ marginBottom: "10px" }}>
          <Typography variant="overline" gutterBottom align="center" color="textSecondary">
            电量
          </Typography>
          <BatteryProgressBar
            variant="determinate"
            value={batteryLevel}
            batteryValue={batteryLevel}
          />
          <BatteryPercentageText>{batteryLevel}%</BatteryPercentageText>
        </Stack>

        {/* Navigation Status */}
        <Stack direction="column" alignItems="stretch" style={{ flexGrow: 1 }}>
          <Typography variant="overline" gutterBottom align="center" color="textSecondary">
            导航状态
          </Typography>
          <StatusDisplayCard
            statusColorKey={currentNavigationStyle.colorKey}
            statusColorShade={currentNavigationStyle.colorShade}
          >
            <StyledCardContent>
              <StatusCardText variant="h6">{currentNavigationStyle.label}</StatusCardText>
            </StyledCardContent>
          </StatusDisplayCard>
        </Stack>
      </BottomSection>
    </RootStack>
  );
};

// Wrapping the component as per the original request
export default Panel(
  Object.assign(React.memo(WheelPanel), {
    panelType: "wheel2status",
    defaultConfig: {
      // Example: Default props that the Panel HOC might use
      // initialControlMode: ControlMode.AUTO_NAV,
      // initialBatteryLevel: 100,
    },
  }),
);
