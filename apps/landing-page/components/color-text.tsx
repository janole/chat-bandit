import { Box, BoxProps, Theme } from "@mui/material";

export const sxColorTextGradient = {
    v1: {
        backgroundImage: (theme: Theme) => `linear-gradient(to right, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
        "&:hover": {
            backgroundImage: (theme: Theme) => `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
        },
    },
    v2: {
        backgroundImage: (theme: Theme) => `linear-gradient(to left, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
        "&:hover": {
            backgroundImage: (theme: Theme) => `linear-gradient(to left, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
        },
    },
    v3: {
        backgroundImage: (theme: Theme) => `linear-gradient(to right, ${theme.palette.text.primary}, ${theme.palette.text.primary})`,
    },
}

export function ColorText(props: BoxProps & { variant: keyof typeof sxColorTextGradient })
{
    return (
        <Box
            component="span"
            {...props}
            sx={{
                ...sxColorTextGradient[props.variant ?? "v1"],
                backgroundClip: "text",
                color: "transparent",
            }}
        />
    );
}
