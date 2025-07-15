import { alpha, Box, Chip, ChipProps, Theme } from "@mui/material";

import { WobbleGrid } from "./feature";

export function Badge(props: ChipProps)
{
    const { icon, ...chipProps } = props;

    return (
        <WobbleGrid>
            <Chip
                {...chipProps}
                icon={icon && <Box className="icon">{icon}</Box>}
                sx={{
                    p: { xs: 0.5, sm: 1, md: 2 },
                    fontWeight: 500,
                    color: "text.secondary",
                    background: (theme: Theme) => alpha(theme.palette.primary.main, 0.05),
                    border: "1px solid",
                    borderColor: (theme: Theme) => alpha(theme.palette.primary.main, 0.1),
                    boxShadow: 1,
                }}
            />
        </WobbleGrid>
    );
}
