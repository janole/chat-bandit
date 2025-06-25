import { Container, ContainerProps } from "@mui/material";

export interface ContentContainerProps extends ContainerProps
{
    p?: number | string;
    px?: number | string;
    py?: number | string;
    transition?: string;
}

export default function ContentContainer(props: ContentContainerProps)
{
    const { p = 1.5, px, py, sx, transition, ...containerProps } = props;

    return (
        <Container
            maxWidth="sm"
            {...containerProps}
            sx={{
                "&.MuiContainer-root": { p, px, py },
                transition,
                ...sx,
            }}
        />
    );
}
