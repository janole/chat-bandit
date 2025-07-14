import { Box, BoxProps, Button, ButtonProps, Divider } from "@mui/material";

import FlexBox from "./FlexBox";

interface SplitButtonProps
{
    buttonRef?: ButtonProps["ref"];
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onMouseDown?: ButtonProps["onMouseDown"];
    href?: ButtonProps["href"];
    size?: "small" | "medium" | "large";
    icon?: React.ReactNode;
    splitComponent?: React.ReactNode;
    children?: React.ReactNode;
    color?: ButtonProps["color"];
    variant?: "contained" | "outlined" | "text";
    hideDivider?: boolean;
    disabled?: boolean;
    style?: ButtonProps["style"];
    disableElevation?: boolean;
    fullWidth?: boolean;
}

export default function SplitButton(props: SplitButtonProps)
{
    return (
        <Button
            ref={props.buttonRef}
            color={props.color ?? "primary"}
            variant={props.variant ?? "contained"}
            size={props.size}
            style={{
                minWidth: 0,
                transition: "all 0.2s",
                width: props.fullWidth ? "100%" : undefined,
                ...props.style,
            }}
            startIcon={props.icon}
            endIcon={props.splitComponent &&
                <FlexBox gap={1}>
                    {!props.hideDivider &&
                        <Divider sx={{ bgcolor: `${props.color ?? "primary"}.contrastText` }} flexItem orientation="vertical" />
                    }
                    <FlexBox typography="button">
                        {props.splitComponent}
                    </FlexBox>
                </FlexBox>
            }
            onClick={props.onClick}
            onMouseDown={props.onMouseDown}
            href={props.href}
            children={props.children}
            disabled={props.disabled}
            disableElevation={props.disableElevation}
        />
    );
}

// TODO: refactor ...
export function NavBar(props: BoxProps)
{
    return (
        <Box
            {...props}
            sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                typography: "button",
                p: 1,
                bgcolor: "secondaryLight.main",
                borderRadius: 1.5,
                ...props.sx,
            }}
        />
    );
}
