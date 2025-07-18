// SPDX-FileCopyrightText: Copyright (C) 2024-2025  UMS , Inc.
// SPDX-License-Identifier: MPL-2.0

import { Box, Typography, Checkbox } from "@mui/material";
import { PIDParameterPath } from "./config";
import { t } from "i18next";

type NewPIDPLOTLegendProps = {
  paths: PIDParameterPath[];
  onClickPath: (index: number) => void;
  focusedPath: string[] | undefined;
  hoveredValuesBySeriesIndex: Record<number, string>;
  colorsByDatasetIndex: Record<string, string>;
  labelsByDatasetIndex: Record<string, string>;
};

export const NewPIDPLOTLegend = ({
  paths,
  onClickPath,
  hoveredValuesBySeriesIndex,
  colorsByDatasetIndex,
  labelsByDatasetIndex,
}: NewPIDPLOTLegendProps) => {

  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        {t("legend.title", "PID参数曲线")}
      </Typography>

      {paths.map((path, index) => (
        <Box
          key={index}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 0.5,
            cursor: "pointer",
            "&:hover": {
              backgroundColor: "action.hover",
            },
          }}
          onClick={() => onClickPath(index)}
        >
          <Checkbox
            checked={path.enabled}
            size="small"
            sx={{
              color: colorsByDatasetIndex[index] || "#666",
              "&.Mui-checked": {
                color: colorsByDatasetIndex[index] || "#666",
              },
            }}
          />
          <Box
            sx={{
              width: 12,
              height: 2,
              backgroundColor: colorsByDatasetIndex[index] || "#666",
              borderRadius: 1,
            }}
          />
          <Typography variant="body2" sx={{ flex: 1 }}>
            {labelsByDatasetIndex[index]}
          </Typography>
          {hoveredValuesBySeriesIndex[index] && (
            <Typography variant="caption" color="text.secondary">
              {hoveredValuesBySeriesIndex[index]}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
};
