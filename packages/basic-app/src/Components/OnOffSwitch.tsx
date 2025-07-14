import { Divider, InputAdornment, Switch, TextField } from "@mui/material";

import FlexBox from "./FlexBox";

interface OnOffSwitchProps
{
    label: string;
    value: boolean;
    setValue: ((value: boolean) => void);
    disabled?: boolean;
}

export default function OnOffSwitch(props: OnOffSwitchProps)
{
    const { label, value, disabled } = props;

    const toggleValue = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLDivElement, MouseEvent>) => 
    {
        e.preventDefault();
        e.stopPropagation();

        console.log(e, !value);

        props.setValue(!value);
    };

    return (
        <TextField
            disabled={disabled}
            value={label}
            fullWidth
            onClick={toggleValue}
            slotProps={{
                input: {
                    readOnly: true,
                    endAdornment:
                        <InputAdornment position="end">
                            <FlexBox>
                                <Divider flexItem orientation="vertical" />
                                <Switch
                                    color="primary"
                                    checked={!!value}
                                    onChange={toggleValue}
                                    slotProps={{
                                        input: {
                                            "aria-label": "controlled",
                                        },
                                    }}
                                />
                            </FlexBox>
                        </InputAdornment>
                },
                inputLabel: {
                    shrink: true,
                },
            }}
        />
    );
}
