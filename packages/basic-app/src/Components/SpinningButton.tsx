import { Cancel } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";

import FlexBox from "./FlexBox";

interface SpinningButtonProps
{
    size?: "small" | "medium" | "large";
    Icon?: any;
    iconColor?: string;
    progressColor?: string;
    onClick?: () => void;
    disabled?: boolean;
}

export default function SpinningButton(props: SpinningButtonProps)
{
    const { size, Icon, iconColor, onClick, disabled } = props;

    const iconSize = size;
    const progressSize = size === "small" ? 22 : size === "medium" ? 28 : 38;
    const thickness = size === "small" ? 4 : undefined;
    const progressOffsetLeft = size === "small" ? -1 : size === "medium" ? -2 : undefined;

    const Wrapper = onClick ? IconButton : FlexBox;

    return (
        <Wrapper onClick={onClick} style={{ position: "relative" }} disabled={disabled}>
            {Icon && <Icon color={iconColor} fontSize={iconSize} />}
            <CircularProgress
                size={progressSize}
                thickness={thickness}
                color={"neutral"}
                sx={{
                    position: "absolute",
                    left: progressOffsetLeft,
                }}
            />
        </Wrapper>
    );
}

export function CancelButton(props: { size?: SpinningButtonProps["size"], onClick?: SpinningButtonProps["onClick"] })
{
    return (
        <SpinningButton
            {...props}
            Icon={Cancel}
            iconColor="error"
        />
    );
}
