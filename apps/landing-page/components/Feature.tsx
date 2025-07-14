import { Box, CardContent, CardHeader, Grid, GridProps, IconButton } from "@mui/material";

import { Block, Section } from "./Block";
import Card from "./Card";

export function FeatureGrid(props: GridProps)
{
    return (
        <Grid width="100%" {...props} container spacing={{ xs: 2, sm: 2, md: 4 }} />
    );
}

export function WobbleGrid(props: GridProps & { disabled?: boolean })
{
    const { disabled, ...gridProps } = props;

    return (
        <Grid
            size={{ xs: 12, sm: 12, md: 6, lg: 4 }}
            sx={{
                "&:hover": disabled ? undefined : {
                    transform: {
                        md: "scale(1.05) rotate(0.1deg) translateY(-2px)",
                    },
                    "& .icon": {
                        transform: {
                            md: "scale(1.2) rotate(-2deg) translate(-2px, -2px)",
                        },
                    },
                    "& .card": {
                        borderRadius: 5,
                    },
                },
                transition: "all 0.2s",
                "& .icon, & .card": {
                    transition: "all 0.2s",
                },
                opacity: disabled ? 0.8 : undefined,
                filter: disabled ? "grayscale(1)" : undefined,
            }}
            {...gridProps}
        />
    );
}

interface FeatureBoxProps
{
    icon?: React.ReactNode;
    title?: React.ReactNode;
    description?: React.ReactNode;
    color?: string;
    align?: "left" | "right" | "center";
}

export function FeatureBox(props: FeatureBoxProps)
{
    const { icon, title, description, color, align = "left" } = props;

    return (
        <WobbleGrid>
            <Card sx={{ width: "100%", height: "100%" }}>
                <CardHeader
                    sx={{ textAlign: align, p: { xs: 1, sm: 1, md: 2 } }}
                    title={
                        <IconButton className={`icon bg-gradient-to-r ${color}`} sx={{ borderRadius: 3, p: 1.5, color: "#fff", alignItems: "flex-start" }}>
                            {icon}
                        </IconButton>
                    }
                />
                <CardContent sx={{ p: { xs: 1, sm: 1, md: 2 } }}>
                    <Section gap={1}>
                        <Block sx={{ justifySelf: align }}>
                            <Box width="100%" typography="h6" fontWeight={600} textAlign={align}>
                                {title}
                            </Box>
                        </Block>
                        <Block sx={{ justifySelf: align }}>
                            <Box width="100%" typography="subtitle1" fontWeight={400} color="text.secondary" textAlign={align}>
                                {description}
                            </Box>
                        </Block>
                    </Section>
                </CardContent>
            </Card>
        </WobbleGrid>
    );
}
