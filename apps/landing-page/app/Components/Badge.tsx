import { alpha, Chip, ChipProps, Theme } from "@mui/material";

export default function Badge(props: ChipProps)
{
    const { ...chipProps } = props;

    return (
        <Chip
            {...chipProps}
            sx={{
                p: 2,
                color: "text.secondary",
                background: (theme: Theme) => alpha(theme.palette.primary.main, 0.05),
                border: "1px solid",
                borderColor: (theme: Theme) => alpha(theme.palette.primary.main, 0.1),
                boxShadow: 1,
            }}
        />
    );
}
