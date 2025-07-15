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

export function TextBlock(props: BoxProps)
{
    return (
        <Block gap={{ md: 4, sm: 3, xs: 3 }} component="section" display="block" textAlign="left" {...props} />
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
        <Section
            minHeight="90vh"
            {...props}
            pt={8} mt={-8} // TODO: temporary hack for scroll-to-section and floating navbar
        />
    );
}
