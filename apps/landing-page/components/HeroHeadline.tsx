import { Box, BoxProps } from "@mui/material";

export default function HeroHeadline(props: BoxProps & { size?: "xl" | "md" | "sm" })
{
    const { size, ...boxProps } = props;

    const params = {
        xl: { fontSize: { md: "4.50rem", sm: "2.5rem", xs: "2.5rem" }, fontWeight: 800, lineHeight: { md: 1.0, sm: 1.1, xs: 1.1 }, color: "text.primary", sx: { textShadow: "1px 1px 2px #0001" } },
        md: { fontSize: { md: "3.00rem", sm: "1.5rem", xs: "1.5rem" }, fontWeight: 700, lineHeight: 1.1, color: "text.primary" },
        sm: { fontSize: { md: "1.25rem" }, fontWeight: 400, lineHeight: 1.75, color: "text.secondary", maxWidth: { lg: "50%", md: "75%", xs: "100%" } },
        xs: { fontSize: { md: "0.85rem" }, fontWeight: 400, lineHeight: 1.75, color: "text.secondary", maxWidth: { lg: "50%", md: "75%", xs: "100%" } },
    }

    return (
        <Box {...boxProps} {...params[props.size ?? "xl"]}>
            {props.children}
        </Box>
    );
}
