import { ReactNode, RefObject } from "react";
import { Box, BoxProps } from "@mui/material";

interface FlexBoxProps
{
    resizeRef?: RefObject<HTMLDivElement> | null;
    animate?: string;

    children?: ReactNode;
    gap?: number;
    backgroundColor?: string;
    borderRadius?: string | number;
    width?: string | number;
    height?: string | number;
    minWidth?: string | number;
    maxWidth?: string | number;
    minHeight?: BoxProps["minHeight"];
    flexGrow?: number;
    flexShrink?: number;
    flexDirection?: BoxProps["flexDirection"];
    justifyContent?: BoxProps["justifyContent"];
    overflow?: BoxProps["overflow"];
    position?: BoxProps["position"];
    padding?: BoxProps["padding"];
    fontFamily?: BoxProps["fontFamily"];
    fontSize?: BoxProps["fontSize"];
    fontWeight?: BoxProps["fontWeight"];
    style?: BoxProps["style"];
    typography?: BoxProps["typography"];
    alignItems?: BoxProps["alignItems"];
    opacity?: number;
    color?: BoxProps["color"];

    ml?: BoxProps["ml"];
    mr?: BoxProps["mr"];
    pt?: BoxProps["pt"];
    pl?: BoxProps["pl"];
    pr?: BoxProps["pr"];

    className?: BoxProps["className"];
}

export default function FlexBox(props: FlexBoxProps)
{
    const { resizeRef, animate, style, opacity, ...boxProps } = props;

    return (
        <Box
            display="flex"
            alignItems={boxProps.flexDirection !== "column" ? "center" : undefined}
            {...boxProps}
            style={{ transition: animate, opacity, ...style }}
            ref={resizeRef}
        />
    );
}

interface SpacerProps
{
    height?: "small" | "medium" | "large";
}

const SPACING = {
    small: 1,
    medium: 2,
    large: 3,
};

export function Spacer(props: SpacerProps)
{
    return (
        <Box
            pt={props.height ? SPACING[props.height] : SPACING.medium}
        />
    );
}
