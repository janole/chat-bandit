import { TextField as MuiTextField, TextFieldProps as MuiTextFieldProps } from "@mui/material";
import { forwardRef, useCallback } from "react";

type TextFieldProps = MuiTextFieldProps;

const TextField = forwardRef<HTMLInputElement, TextFieldProps>((props, outerRef) =>
{
    const innerRef = useCallback((current: HTMLInputElement | null) =>
    {
        if (typeof outerRef === "function")
        {
            outerRef(current);
        }
        else if (outerRef !== null && typeof outerRef === "object")
        {
            outerRef.current = current;
        }
    }, [
        outerRef,
    ]);

    return <MuiTextField {...props} ref={innerRef} />;
});

export default TextField;
