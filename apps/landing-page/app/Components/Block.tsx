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
        <Block gap={{ md: 4, sm: 3, xs: 3 }} component="section" flexDirection="column" {...props} />
    );
}

export function Page(props: BoxProps)
{
    return (
        <Section minHeight="90vh" {...props} />
    );
}
