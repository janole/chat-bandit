import { useEffect, useMemo, useState } from 'react';
import { alpha, Breakpoint, createTheme, darken, lighten, PaletteColor, PaletteMode, responsiveFontSizes, Shadows, SimplePaletteColorOptions, Theme, ThemeOptions, ThemeProvider, useMediaQuery, useTheme } from '@mui/material';
import { deepmerge } from '@mui/utils';
import { TernaryDarkMode } from 'usehooks-ts';
import { IUseDarkModeToggleResult, TernaryDarkModeProvider, useDarkModeToggle } from './Components/TernaryDarkMode';

const defaultTheme = createTheme();

declare module "@mui/material/styles"
{
    interface Palette
    {
        primaryLight: PaletteColor;
        secondaryLight: PaletteColor;
        successLight: PaletteColor;
        neutral: PaletteColor;
        neutralLight: PaletteColor;
        black: PaletteColor;
    }

    interface PaletteOptions
    {
        primaryLight: SimplePaletteColorOptions;
        secondaryLight: SimplePaletteColorOptions;
        successLight: SimplePaletteColorOptions;
        neutral?: SimplePaletteColorOptions;
        neutralLight?: SimplePaletteColorOptions;
        black?: SimplePaletteColorOptions;
    }

    interface TypeBackground
    {
        header: string;
        footer: string;
        panel: string;
        contentTopBar: string;
    }
}

declare module '@mui/material/Button'
{
    interface ButtonPropsColorOverrides
    {
        primaryLight: true;
        secondaryLight: true;
        successLight: true;
        neutral: true;
        neutralLight: true;
        black: true;
    }
}

declare module '@mui/material/IconButton'
{
    interface IconButtonPropsColorOverrides
    {
        primaryLight: true;
        secondaryLight: true;
        successLight: true;
        neutral: true;
        neutralLight: true;
        black: true;
    }
}

declare module '@mui/material/Chip'
{
    interface ChipPropsColorOverrides
    {
        primaryLight: true;
        secondaryLight: true;
        successLight: true;
        neutral: true;
        neutralLight: true;
        black: true;
    }
}

declare module '@mui/material/CircularProgress'
{
    interface CircularProgressPropsColorOverrides
    {
        primaryLight: true;
        secondaryLight: true;
        successLight: true;
        neutral: true;
        neutralLight: true;
        black: true;
    }
}

declare module '@mui/material/Slider'
{
    interface SliderPropsColorOverrides
    {
        primaryLight: true;
        secondaryLight: true;
        successLight: true;
        neutral: true;
        neutralLight: true;
        black: true;
    }
}

const SHADOWS = [
    "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    "0 0px 8px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    "0 0px 8px -1px rgb(0 0 0 / 0.2), 0 2px 4px -2px rgb(0 0 0 / 0.2)",
    // "0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.2)",
    // "0 25px 50px -12px rgb(0 0 0 / 0.25), 0 0 12px 0 rgb(0 0 0 / 0.25)",
];

const createThemedComponents = (theme: Theme): Theme =>
{
    const shadows: Shadows = [...theme.shadows];
    SHADOWS.forEach((shadow, index) => shadows[index + 1] = shadow);

    return createTheme({
        ...theme,
        shadows,
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        backgroundColor: theme.palette.background.default,
                    },
                    mark: {
                        display: "inline-block!important",
                        borderRadius: "2px",
                        backgroundColor: theme.palette.error.main,
                        color: theme.palette.error.contrastText,
                        borderLeft: "1px solid transparent",
                        borderRight: "1px solid transparent",
                        padding: "0 1px",
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        borderRadius: theme.spacing(1),
                    }
                },
            },
            MuiButton: {
                defaultProps:
                {
                    sx: {
                        // borderRadius: theme.spacing(0.75),
                    },
                },
            },
            MuiLink: {
                styleOverrides: {
                    root: {
                        textDecorationColor: alpha(theme.palette.primary.main, 0.15),
                        textUnderlineOffset: "4px",
                        "&:hover": {
                            textDecorationColor: theme.palette.primary.main,
                            textUnderlineThickness: "2px",
                        },
                        '&[disabled]': {
                            color: theme.palette.action.disabled,
                            pointerEvents: 'none',
                        },
                    },
                },
            },
            MuiSwitch: {
                styleOverrides: {
                    thumb: {
                        boxShadow: defaultTheme.shadows[2],
                    },
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        color: theme.palette.text.secondary,
                        background: alpha(theme.palette.background.default, 0.9),
                        "& .MuiBottomNavigation-root": {
                            background: "none",
                        },
                    },
                },
            },
            MuiListSubheader: {
                styleOverrides: {
                    root: {
                        lineHeight: "unset",
                        paddingTop: theme.spacing(1),
                        paddingBottom: theme.spacing(1),
                        ...theme.typography.button,
                    },
                },
            },
            MuiListItemButton: {
                styleOverrides: {
                    root: {
                        borderRadius: theme.spacing(1),
                        color: theme.palette.text.secondary,
                        "&.Mui-selected": {
                            color: theme.palette.primary.main,
                            backgroundColor: "unset",
                            "& span": {
                                fontWeight: 500,
                            },
                        },
                    },
                },
            },
            MuiTextField: {
                styleOverrides: {
                    root: {
                        "& .MuiOutlinedInput-root": {
                            "&:not(.Mui-focused):hover fieldset": {
                                boxShadow: `0 0 4px 0 ${alpha(theme.palette.primary.dark, 0.5)}`,
                                border: `solid 1px ${theme.palette.primary.dark}`,
                            },
                            "&.Mui-focused": {
                                background: theme.palette.background.default,
                            },
                        },
                    },
                },
            },
            MuiAutocomplete: {
                styleOverrides: {
                    option: {
                        '&[aria-selected="true"], &[aria-selected="true"] svg': {
                            color: theme.palette.primary.main,
                            backgroundColor: "unset",
                        },
                    },
                    popper: {
                        "& .MuiPaper-root": {
                            borderRadius: theme.spacing(1),
                            boxShadow: "0 2px 8px -1px rgb(0, 0, 0, 0.1), 0 2px 4px -2px rgb(0, 0, 0, 0.1)",
                        },
                    },
                },
            },
            MuiPopover: {
                styleOverrides: {
                    paper: {
                        borderRadius: theme.spacing(1),
                        boxShadow: "0 2px 8px -1px rgb(0, 0, 0, 0.1), 0 2px 4px -2px rgb(0, 0, 0, 0.1)",
                    },
                },
            },
            MuiCardHeader: {
                styleOverrides: {
                    title: {
                        ...theme.typography.h6,
                    },
                },
            },
            MuiDialog:
            {
                defaultProps: {
                    slotProps: {
                        paper: {
                            sx: {
                                borderRadius: 2,
                                boxShadow: "0 25px 45px #0008, 0 0 2px #0008",
                            },
                            elevation: 0,
                        },
                    },
                },
                styleOverrides: {
                    root: {
                        "& .MuiBackdrop-root": {
                            background: theme.palette.mode !== "dark" ? `
                                radial-gradient(#0002, #0002),
                                radial-gradient(#FFF8, #FFF8)
                            ` : `
                                radial-gradient(#0008, #0008),
                                radial-gradient(#FFF2, #FFF2)
                            `,
                        },
                    },
                },
            },
        },
    });
};

const createBaseTheme = (mode: PaletteMode, variant?: ThemeOptions) => createTheme(
    deepmerge({
        palette: {
            mode,
            primaryLight: {
                main: mode === "dark" ? darken(defaultTheme.palette.primary.main, 0.6) : lighten(defaultTheme.palette.primary.main, 0.8),
                dark: mode === "dark" ? darken(defaultTheme.palette.primary.dark, 0.6) : lighten(defaultTheme.palette.primary.dark, 0.8),
                light: mode === "dark" ? darken(defaultTheme.palette.primary.light, 0.8) : lighten(defaultTheme.palette.primary.main, 0.9),
                contrastText: mode === "dark" ? lighten(defaultTheme.palette.primary.main, 0.6) : darken(defaultTheme.palette.primary.main, 0.5),
            },
            secondaryLight: {
                main: mode === "dark" ? darken(defaultTheme.palette.secondary.main, 0.6) : lighten(defaultTheme.palette.secondary.main, 0.8),
                dark: mode === "dark" ? darken(defaultTheme.palette.secondary.dark, 0.6) : lighten(defaultTheme.palette.secondary.dark, 0.8),
                light: mode === "dark" ? darken(defaultTheme.palette.secondary.light, 0.6) : lighten(defaultTheme.palette.secondary.light, 0.8),
                contrastText: mode === "dark" ? lighten(defaultTheme.palette.secondary.main, 0.6) : darken(defaultTheme.palette.secondary.main, 0.5),
            },
            successLight: {
                main: mode === "dark" ? darken(defaultTheme.palette.success.main, 0.6) : lighten(defaultTheme.palette.success.main, 0.8),
                dark: mode === "dark" ? darken(defaultTheme.palette.success.dark, 0.6) : lighten(defaultTheme.palette.success.dark, 0.8),
                light: mode === "dark" ? darken(defaultTheme.palette.success.light, 0.6) : lighten(defaultTheme.palette.success.light, 0.8),
                contrastText: mode === "dark" ? lighten(defaultTheme.palette.success.main, 0.6) : darken(defaultTheme.palette.success.main, 0.5),
            },
            neutral: {
                main: mode === "dark" ? "#AAA" : "#666",
                light: mode === "dark" ? "#888" : "#777",
                dark: mode === "dark" ? "#777" : "#555",
                contrastText: "#FFF",
            },
            neutralLight: {
                main: mode === "dark" ? "#333" : "#EEE",
                light: mode === "dark" ? "#444" : "#FCFCFC",
                dark: mode === "dark" ? "#222" : "#DDD",
                contrastText: mode === "dark" ? "#CCC" : "#333",
            },
            black: {
                main: mode === "dark" ? "#EEE" : "#111",
                light: mode === "dark" ? "#FFF" : "#222",
                dark: mode === "dark" ? "#DDD" : "#333",
                contrastText: mode === "dark" ? "#333" : "#EEE",
            },
            background: {
                default: mode === "dark" ? "#222" : "#FFF",
                paper: mode === "dark" ? "#282828" : "#FFF",
                header: mode === "dark" ? "#000" : "#FFF",
                footer: mode === "dark" ? "#222" : "#FAFAFA",
                panel: mode === "dark" ? "#181818" : "#FAFAFA",
                contentTopBar: mode === "dark" ? alpha("#222", 0.9) : alpha("#FFF", 0.9),
            },
        },
        typography: {
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Ubuntu, Cantarell, 'Helvetica Neue', Arial, Roboto, sans-serif",
        },
        colorSchemes: {
        },
    }, variant),
);

interface UseAppThemeProps
{
    onThemeChange?: (theme: Theme) => void;
    themeOptions?: ThemeOptions;
    fixedTernaryDarkMode?: TernaryDarkMode;
}

interface UseAppThemeResult
{
    theme: Theme;
    darkMode: IUseDarkModeToggleResult;
}

export function useAppTheme(props: UseAppThemeProps): UseAppThemeResult
{
    const darkMode = useDarkModeToggle();

    const theme = useMemo(() => 
    {
        const baseTheme = createBaseTheme(darkMode.mode, props.themeOptions);
        const theme = responsiveFontSizes(createThemedComponents(baseTheme));

        props.onThemeChange?.(theme);

        return theme;
    }, [
        darkMode.mode,
        props.themeOptions,
        props.onThemeChange,
    ]);

    return {
        theme,
        darkMode,
    };
}

interface AppThemeProviderProps extends UseAppThemeResult
{
    children?: any;
}

export function AppThemeProvider(props: AppThemeProviderProps)
{
    return (
        <ThemeProvider theme={props.theme}>
            <TernaryDarkModeProvider {...props.darkMode}>
                {props.children}
            </TernaryDarkModeProvider>
        </ThemeProvider>
    );
}

// taken from MUI documentation
export function useWidth()
{
    const theme: Theme = useTheme();
    const keys: readonly Breakpoint[] = [...theme.breakpoints.keys].reverse();
    return (
        keys.reduce((output: Breakpoint | null, key: Breakpoint) =>
        {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const matches = useMediaQuery(theme.breakpoints.up(key));
            return !output && matches ? key : output;
        }, null) || 'xs'
    );
}
