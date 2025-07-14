import { BoxProps, Chip, ChipProps } from "@mui/material";
import { ReactNode } from "react";

const sxDisabled = {
    opacity: 0.5,
    outline: "1px dashed",
    outlineColor: "action.focus",
    bgcolor: "action.hover",
    boxShadow: undefined,
};

interface TagButtonProps
{
    color?: "primary" | "secondary" | "error" | "info" | "success" | "warning" | "neutral" | "black" | "neutralLight";
    size?: "small" | "medium";
    label?: ReactNode;
    rightIcon?: ChipProps["deleteIcon"];
    fullWidth?: boolean;
    width?: string | number;
    align?: "left" | "right" | "center";
    position?: BoxProps["position"];
    disablePadding?: boolean;
    textOverflow?: "clip" | "ellipsis";

    className?: BoxProps["className"];

    onClick?: () => void;
    onRightIconClick?: () => void;

    disabled?: boolean;

    style?: BoxProps["style"];
}

export default function TagButton(props: TagButtonProps)
{
    return (
        <Chip
            className={props.className}
            color={props.color}
            label={props.label}
            onClick={props.onClick}
            onDelete={props.onRightIconClick}
            deleteIcon={props.rightIcon}
            size={props.size ?? "small"}
            sx={{
                position: props.position,
                borderRadius: 1,
                "& .MuiChip-label": { fontWeight: "medium", textOverflow: props.textOverflow, px: props.disablePadding ? 0 : undefined },
                width: props.fullWidth ? "100%" : props.width,
                justifyContent: props.align,
                ...(props.disabled ? sxDisabled : undefined),
                ...props.style,
            }}
        />
    );
}
