// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Typography, Card } from "@mui/material";
import { styled } from "@mui/material/styles";
import React from "react";

interface TextCardProps {
  text: string; // 要显示的字符串
  height?: number; // 卡片高度
}
const StyledCard = styled(Card)<{ cardheight: number }>(({ cardheight, theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: cardheight,
  width: 60,
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[3],
}));

const StyledTypography = styled(Typography)({
  fontWeight: "bold",
  textAlign: "center",
});

const TextCard: React.FC<TextCardProps> = ({ text, height }) => {
  const cardHeight = typeof height === "number" && !isNaN(height) && height > 0 ? height : 60;
  return (
    <StyledCard cardheight={cardHeight}>
      <StyledTypography variant="body2">
        {text}
      </StyledTypography>
    </StyledCard>
  );
}

export default TextCard;
