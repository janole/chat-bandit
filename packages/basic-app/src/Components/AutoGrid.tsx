"use client";

import { Box,Grid as MuiGrid, GridProps as MuiGridProps } from "@mui/material";
import { createContext, ReactNode, useContext, useMemo, useRef } from "react";
import { useResizeObserver } from "usehooks-ts";

type TBreakpointName = "xs" | "sm" | "md" | "lg" | "xl" | "xxl" | undefined;

export const MaxWidthContext = createContext<TBreakpointName>(undefined);

const MaxWidthFilter = {
    xs: { sm: undefined, md: undefined, lg: undefined, xl: undefined, xxl: undefined },
    sm: { md: undefined, lg: undefined, xl: undefined, xxl: undefined },
    md: { lg: undefined, xl: undefined, xxl: undefined },
    lg: { xl: undefined, xxl: undefined },
    xl: { xxl: undefined },
    xxl: undefined,
};

export function Grid(props: MuiGridProps)
{
    const { size, ...gridProps } = props;

    const maxWidth = useContext(MaxWidthContext);

    const filteredSize = useMemo(() => 
    {
        return maxWidth && typeof size === "object" ? { ...size, ...(MaxWidthFilter[maxWidth]) } : size;
    }, [
        maxWidth,
        // TODO: refactor / test
        ...Object.keys(size ?? {}),
        ...Object.values(size ?? {}),
    ]);

    return (
        <MuiGrid {...gridProps} size={filteredSize} />
    );
}

interface GridProps extends MuiGridProps
{
    maxWidth?: TBreakpointName;
    breakpoints?: { [key: string]: number };
    children?: ReactNode;
}

export default function AutoGrid(props: GridProps)
{
    const { maxWidth, ...remain } = props;

    if (!maxWidth)
    {
        return <MuiGrid {...remain} />;
    }

    return (
        <MaxWidthContext.Provider value={maxWidth}>
            <Grid {...remain} />
        </MaxWidthContext.Provider>
    );
}

interface GridMaxWidthProps
{
    maxWidth: TBreakpointName;
    children?: ReactNode;
}

export function GridMaxWidth(props: GridMaxWidthProps)
{
    return (
        <MaxWidthContext.Provider value={props.maxWidth} children={props.children} />
    );
}

const defaultBreakpoints = { xl: 1200, lg: 960, md: 768, sm: 576, xs: 0 };

export function GridAutoWidth(props: GridProps)
{
    const { maxWidth, breakpoints = defaultBreakpoints, ...remain } = props;

    const ref = useRef<HTMLElement>(null!);
    const { width = 0 } = useResizeObserver({
        ref,
        box: "border-box",
    });

    const localMaxWidth = Object.entries(breakpoints).find(([_, w]) => width > w)?.[0];

    return (
        <Box width="100%" ref={ref}>
            <GridMaxWidth maxWidth={localMaxWidth as TBreakpointName} {...remain} />
        </Box>
    );
}
