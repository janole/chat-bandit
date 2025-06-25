import { Box, CardContent, CardHeader, Grid, GridProps, IconButton } from "@mui/material";
import { Block } from "./Block";
import Card from "./Card";

export function FeatureGrid(props: GridProps)
{
    return (
        <Grid {...props} container spacing={4} />
    );
}

export function WobbleGrid(props: GridProps)
{
    return (
        <Grid
            size={{ xs: 12, sm: 12, md: 6, lg: 4 }}
            sx={{
                "&:hover": {
                    transform: "scale(1.05) rotate(0.1deg) translateY(-2px)",
                    "& .icon": {
                        transform: "scale(1.2) rotate(-2deg) translate(-2px, -2px)",
                    },
                    "& .card": {
                        borderRadius: 5,
                    },
                },
                transition: "all 0.2s",
                "& .icon, & .card": {
                    transition: "all 0.2s",
                },
            }}
            {...props}
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
            <Card>
                <CardHeader
                    sx={{ textAlign: align, pl: 2, pt: 2, pb: 0 }}
                    title={
                        <IconButton className={`icon bg-gradient-to-r ${color}`} sx={{ borderRadius: 3, p: 1.5, color: "#fff", alignItems: "flex-start" }}>
                            {icon}
                        </IconButton>
                    }
                />
                <CardContent>
                    <Block py={1} sx={{ justifySelf: align }}>
                        <Box width="100%" typography="h6" fontWeight={600} textAlign={align}>
                            {title}
                        </Box>
                    </Block>
                    <Block py={1} sx={{ justifySelf: align }}>
                        <Box width="100%" typography="subtitle1" fontWeight={400} color="text.secondary" textAlign={align}>
                            {description}
                        </Box>
                    </Block>
                </CardContent>
            </Card>
        </WobbleGrid>
    );
}
