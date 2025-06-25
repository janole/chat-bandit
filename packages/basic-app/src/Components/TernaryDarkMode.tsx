"use client";

import { createContext, useContext } from 'react';
import { IconButton } from '@mui/material';
import { DarkMode, InsertLink, LightMode } from '@mui/icons-material';
import { TernaryDarkMode, useMediaQuery, useTernaryDarkMode } from 'usehooks-ts';

const DarkModeContext = createContext<IUseDarkModeToggleResult>({ isDarkMode: false, mode: "light" });

export interface IUseDarkModeToggleResult
{
    mode: "dark" | "light";
    isDarkMode: boolean;
    ternaryDarkMode?: TernaryDarkMode;
    setTernaryDarkMode?: React.Dispatch<React.SetStateAction<TernaryDarkMode>>;
    toggleTernaryDarkMode?: () => void;
}

export function useDarkModeToggle(): IUseDarkModeToggleResult
{
    const mode = useMediaQuery("(prefers-color-scheme: dark)") ? "dark" : "light";

    const { isDarkMode, ternaryDarkMode, setTernaryDarkMode, toggleTernaryDarkMode } = useTernaryDarkMode({
        defaultValue: "system",
        initializeWithValue: true,
        localStorageKey: "dark-mode",
    });

    return {
        mode: ternaryDarkMode === "system" ? mode : ternaryDarkMode,
        isDarkMode: ternaryDarkMode === "system" ? mode === "dark" : isDarkMode,
        ternaryDarkMode,
        setTernaryDarkMode,
        toggleTernaryDarkMode,
    };
}

interface TernaryDarkModeProviderProps extends IUseDarkModeToggleResult
{
    children?: any;
}

export function TernaryDarkModeProvider(props: TernaryDarkModeProviderProps)
{
    const { children, ...providerProps } = props;

    return (
        <DarkModeContext.Provider value={providerProps}>
            {children}
        </DarkModeContext.Provider>
    );
}

export function TernaryDarkModeToggle()
{
    const { ternaryDarkMode, toggleTernaryDarkMode } = useContext(DarkModeContext);

    return (
        <IconButton onClick={toggleTernaryDarkMode}>
            {ternaryDarkMode === 'dark' ? <DarkMode />
                : ternaryDarkMode === 'light' ? <LightMode />
                    : <InsertLink />
            }
        </IconButton>
    );
}
