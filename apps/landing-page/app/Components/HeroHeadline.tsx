import { Box, BoxProps } from "@mui/material";

export default function HeroHeadline(props: BoxProps & { size?: "xl" | "md" | "sm" })
{
    const { size, ...boxProps } = props;

    const params = {
        xl: { fontSize: "4.50rem", fontWeight: 800, lineHeight: 1.0, color: "text.primary", pb: 3, sx: { textShadow: "1px 1px 2px #0001" } },
        md: { fontSize: "3.00rem", fontWeight: 700, lineHeight: 1.1, color: "text.primary" },
        sm: { fontSize: "1.25rem", fontWeight: 400, lineHeight: 1.75, color: "text.secondary", maxWidth: { lg: "50%", md: "75%", xs: "100%" } },
        xs: { fontSize: "0.85rem", fontWeight: 400, lineHeight: 1.75, color: "text.secondary", maxWidth: { lg: "50%", md: "75%", xs: "100%" } },
    }

    return (
        <Box {...boxProps} {...params[props.size ?? "xl"]}>
            {props.children}
        </Box>
    );
}
