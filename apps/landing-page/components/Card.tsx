import { alpha, Card as MuiCard, CardProps, useTheme } from "@mui/material";

import BackgroundEffects from "./BackgroundEffects";

export default function Card(props: CardProps)
{
    const { children, sx, className, ...cardProps } = props;

    const theme = useTheme();

    return (
        <MuiCard
            {...cardProps}
            className={`card ${className}`}
            sx={{
                position: "relative",
                background: alpha(theme.palette.primary.main, 0.025),
                outline: "1px solid",
                outlineColor: alpha(theme.palette.primary.main, 0.1),
                pt: 2,
                px: 2,
                borderRadius: 3,
                overflow: "hidden",
                ...sx,
            }}
        >
            <BackgroundEffects style={{ opacity: 0.5 }} />

            {children}
        </MuiCard>
    );
}
