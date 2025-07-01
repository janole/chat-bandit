import * as React from 'react';
import { Box, BoxProps, Button, Divider, InputAdornment, Switch, TextField, Slider, Typography } from "@mui/material";
import { ArrowLeft, ArrowRight, HighlightOff } from "@mui/icons-material";
import { useChatModelConfigStore, useChatStore } from "@janole/ai-core";
import { Grid, GridAutoWidth } from "@janole/basic-app";
import { ChatModelSelectForm } from './ChatModelSelect';

function FormBlock(props: BoxProps)
{
    return (
        <Box
            {...props}
            sx={{
                ...props.sx,
                p: 2,
            }}
        />
    );
}

function Header(props: { children: React.ReactNode, prominent?: boolean })
{
    return (
        <Grid size={12} sx={{ typography: "button", color: props.prominent ? "primary.main" : "text.primary" }}>
            {props.children}
        </Grid>
    );
}

interface InputSliderProps
{
    label: string;
    number: number | undefined;
    setNumber: (number: number | undefined) => void;
    min: number;
    max: number;
    step: number;
    marks?: boolean;
    disabled?: boolean;
}

function InputSlider(props: InputSliderProps)
{
    const { label, number, setNumber, min, max, step, marks, disabled } = props;

    const handleSliderChange = (_event: Event, newValue: number | number[]) =>
    {
        typeof newValue === 'number' && setNumber(newValue === min - step ? undefined : newValue);
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    {
        setNumber(event.target.value.length ? (Number(event.target.value) || 0) : undefined);
    };

    const handleBlur = () =>
    {
        if (number !== undefined)
        {
            if (number === min - step)
            {
                setNumber(undefined);
            }
            else if (number < min)
            {
                setNumber(min);
            }
            else if (number > max)
            {
                setNumber(max);
            }
        }
    };

    const f = 1 / step;

    return (
        <Grid container spacing={1} sx={{ alignItems: "center" }}>
            <Header prominent={number !== undefined}>
                {label}
            </Header>
            <Grid size={12}>
                <TextField
                    disabled={disabled}
                    placeholder="Unset"
                    fullWidth
                    variant="outlined"
                    value={number !== undefined ? number.toString() : ""}
                    size="small"
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    inputProps={{
                        step,
                        min,
                        max,
                    }}
                    slotProps={{
                        input: {
                            type: "number",
                            startAdornment:
                                <InputAdornment position="start">
                                    <Button disabled={disabled} sx={{ minWidth: 0, px: 0 }} onClick={() => setNumber(number !== undefined ? Math.max(min, (number * f - step * f) / f) : min)}>
                                        <ArrowLeft />
                                    </Button>
                                </InputAdornment>,
                            endAdornment:
                                <InputAdornment position="end" sx={{ display: "flex" }}>
                                    <Button disabled={disabled} sx={{ minWidth: 0, px: 0 }} onClick={() => setNumber(number !== undefined ? Math.min(max, (number * f + step * f) / f) : min)}>
                                        <ArrowRight />
                                    </Button>
                                    <Divider orientation="vertical" flexItem />
                                    <Button disabled={disabled} sx={{ minWidth: 0, px: 1 }} onClick={() => setNumber(undefined)}>
                                        <HighlightOff fontSize="small" color={number === undefined ? "disabled" : "error"} />
                                    </Button>
                                </InputAdornment>
                        }
                    }}
                    sx={{
                        color: "neutral.main",
                        "& .MuiInputBase-root": {
                            px: 0,
                        },
                        "& input": {
                            px: 0,
                            textAlign: "center",
                            "&::-webkit-inner-spin-button": {
                                display: "none",
                            },

                            // Hide the placeholder text when the input is focused, as a centered placeholder can look awkward during editing.
                            "&:focus::placeholder": {
                                opacity: 0,
                            },
                        },
                    }}
                />
            </Grid>
            <Grid size={{ xs: 12 }} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box typography="caption" color="text.secondary">
                    {min}
                </Box>
                <Slider
                    disabled={disabled}
                    color={number === undefined ? "neutral" : "primary"}
                    value={number ?? 0}
                    marks={marks}
                    min={min}
                    max={max}
                    step={step}
                    onChange={handleSliderChange}
                />
                <Box typography="caption" color="text.secondary">
                    {max}
                </Box>
            </Grid>
        </Grid>
    );
}

interface InputSwitchProps
{
    label: string;
    value: boolean | undefined;
    setValue: (value: boolean | undefined) => void;
    disabled?: boolean;
}

function InputSwitch(props: InputSwitchProps)
{
    const { label, value, setValue, disabled } = props;

    return (
        <Grid container spacing={1} sx={{ alignItems: "center" }}>
            <Header prominent={!!value}>
                {label}
            </Header>
            <Grid size={12} onClick={(event) => { event.stopPropagation(); event.preventDefault(); setValue(!value); }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    value={""}
                    size="small"
                    disabled
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start" sx={{ display: "flex" }}>
                                    <Typography color={value ? "text.primary" : "text.disabled"}>
                                        {value ? "Enabled" : "Disabled"}
                                    </Typography>
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end" sx={{ display: "flex" }}>
                                    <Divider orientation="vertical" flexItem />
                                    <Switch
                                        disabled={disabled}
                                        checked={!!value}
                                        onChange={(event) => setValue(!event.target.checked)}
                                        color={value ? "primary" : "default"}
                                        sx={{ mr: -2 }}
                                    />
                                </InputAdornment>
                            ),
                        },
                    }}
                />
            </Grid>
        </Grid>
    );
}

interface ChatOptionsProps
{
    chatId: string;
}

export default function ChatOptions(props: ChatOptionsProps)
{
    const model = useChatStore(state => state.chats[props.chatId]?.model) ?? {};
    const config = useChatModelConfigStore(state => state.config[model.id]);
    const options = config?.options ?? {};
    const setChatModelOptions = useChatModelConfigStore(state => state.setOptions);

    return (
        <GridAutoWidth>
            <FormBlock>
                <Grid container spacing={1}>
                    <Header>
                        Model
                    </Header>
                    <Grid size={12}>
                        <ChatModelSelectForm chatId={props.chatId} />
                    </Grid>
                    <Grid size={12}>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                            Provider: {model?.account?.name || model?.provider}
                        </Typography>
                    </Grid>
                </Grid>
            </FormBlock>
            <FormBlock>
                <Grid container spacing={2}>
                    {!!model.features?.options?.num_ctx &&
                        <Grid size={{ xs: 12 }}>
                            <InputSlider
                                label="Context Length"
                                number={options.num_ctx}
                                setNumber={num_ctx => setChatModelOptions(model.id, { ...options, num_ctx })}
                                min={1024}
                                max={model.contextLength ?? 16384}
                                step={1024}
                            />
                        </Grid>
                    }
                    {!!model.features?.options?.temperature &&
                        <Grid size={{ xs: 12 }}>
                            <InputSlider
                                label="Temperature"
                                number={options.temperature}
                                setNumber={temperature => setChatModelOptions(model.id, { ...options, temperature })}
                                min={0}
                                max={2}
                                step={0.1}
                            />
                        </Grid>
                    }
                    {!!model.features?.options?.top_k &&

                        <Grid size={{ xs: 12 }}>
                            <InputSlider
                                label="Top K"
                                number={options.top_k}
                                setNumber={top_k => setChatModelOptions(model.id, { ...options, top_k })}
                                min={1}
                                max={100}
                                step={1}
                            />
                        </Grid>
                    }
                    {!!model.features?.options?.top_p &&
                        <Grid size={{ xs: 12 }}>
                            <InputSlider
                                label="Top P"
                                number={options.top_p}
                                setNumber={top_p => setChatModelOptions(model.id, { ...options, top_p })}
                                min={0}
                                max={1}
                                step={0.05}
                            />
                        </Grid>
                    }
                    {!!model.features?.options?.min_p &&
                        <Grid size={{ xs: 12 }}>
                            <InputSlider
                                label="Min P"
                                number={options.min_p}
                                setNumber={min_p => setChatModelOptions(model.id, { ...options, min_p })}
                                min={0}
                                max={1}
                                step={0.01}
                            />
                        </Grid>
                    }
                    {!!model.features?.options?.integratedWebSearch &&
                        <Grid size={{ xs: 12 }}>
                            <InputSwitch
                                label="Web Search"
                                value={options.integratedWebSearch ?? false}
                                setValue={integratedWebSearch => setChatModelOptions(model.id, { ...options, integratedWebSearch })}
                            />
                        </Grid>
                    }
                </Grid>
            </FormBlock>
        </GridAutoWidth>
    );
}
