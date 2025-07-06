import { BoxProps, CardContent, CardActions, Card, CardHeader, Divider, LinearProgress } from "@mui/material";
import FlexBox from "./FlexBox";
import AutoGrid, { Grid } from "./AutoGrid";

interface SettingsCardProps
{
    state?: "pending" | "completed" | "failed";
    progress?: number;

    title: JSX.Element | string;
    titleIcon?: JSX.Element;
    titleColor?: "primaryLight" | "secondaryLight";

    actions?: JSX.Element;

    children?: BoxProps["children"];
}

export function SettingsCard(props: SettingsCardProps)
{
    const {
        state,
        progress,

        title,
        titleIcon,
        titleColor = "primaryLight",

        actions,

        children,
    } = props;

    return (
        <Card
            sx={{ borderRadius: 1, position: "relative" }}
        >
            <CardHeader
                title={
                    <FlexBox gap={2}>
                        {titleIcon}
                        {title && titleIcon &&
                            <Divider orientation="vertical" flexItem variant="fullWidth" />
                        }
                        {title}
                    </FlexBox>
                }
                sx={{
                    bgcolor: `${titleColor}.main`,
                    color: `${titleColor}.contrastText`,
                }}
            />
            {state === "pending" &&
                <LinearProgress
                    value={progress}
                    variant={progress !== undefined ? "determinate" : "indeterminate"}
                    sx={{ position: "absolute", left: 0, right: 0, zIndex: 6 }}
                />
            }
            {children}
            {actions}
        </Card>
    );
}

interface SettingsCardContentProps
{
    children?: BoxProps["children"];
    variant?: "settings" | "notice";
}

const sxCardContent = {
    settings: { pt: 4, pb: 1 },
    notice: { p: 3, pb: 2 },
};

export function SettingsCardContent(props: SettingsCardContentProps)
{
    return (
        <CardContent sx={sxCardContent[props.variant ?? "settings"]}>
            <AutoGrid>
                <Grid container gap={2}>
                    {props.children}
                </Grid>
            </AutoGrid>
        </CardContent>
    );
}

interface SettingsCardActionsProps
{
    left?: BoxProps["children"];
    children?: BoxProps["children"];
}

export function SettingsCardActions(props: SettingsCardActionsProps)
{
    return (
        <CardActions>
            {props.left}
            <FlexBox flexGrow={1} />
            {props.children}
        </CardActions>
    );
}
