import { Circle } from "@mui/icons-material";
import { SxProps } from "@mui/material";
import { Box } from "@mui/system";
import { useState } from "react";
import { useInterval } from "usehooks-ts";

export default function ThinkingIndicator()
{
    const [count, setCount] = useState(0);

    useInterval(() => { setCount(count => count + 1); }, 250);

    const sxCircle: SxProps[] = [
        { p: 0.8, mx: -0.6 },
        { p: 0.6, mx: -0.5 },
        { p: 0.4, mx: -0.3 },
    ];

    const length = count % (sxCircle.length + 1);

    return (
        <Box display="flex" alignItems="top">
            {Array.from({ length: sxCircle.length }, (_, i) => (
                <Box key={i}>
                    <Circle sx={{ ...sxCircle[i], opacity: i < length ? 1 + (i - length) * 0.25 : 0 }} />
                </Box>
            ))}
        </Box>
    );
}
