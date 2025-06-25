import { Box, BoxProps } from "@mui/material";

export function Block(props: BoxProps)
{
    return (
        <Box
            position="relative"
            display="flex"
            width="100%"
            gap={2}
            textAlign="center"
            alignItems="center"
            justifySelf="center"
            justifyContent="center"
            justifyItems="center"
            {...props}
        />
    );
}

export function Section(props: BoxProps)
{
    return (
        <Block {...props} component="section" minHeight="90vh" flexDirection="column" />
    );
}
