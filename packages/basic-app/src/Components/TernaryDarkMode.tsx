import { createContext, useContext } from 'react';
import { IconButton } from '@mui/material';
import { DarkMode, InsertLink, LightMode } from '@mui/icons-material';
import { TernaryDarkMode, useTernaryDarkMode } from 'usehooks-ts';

const DarkModeContext = createContext<IUseDarkModeToggleResult>({});

export interface IUseDarkModeToggleResult
{
    isDarkMode?: boolean;
    ternaryDarkMode?: TernaryDarkMode;
    setTernaryDarkMode?: React.Dispatch<React.SetStateAction<TernaryDarkMode>>;
    toggleTernaryDarkMode?: () => void;
}

export function useDarkModeToggle(fixedTernaryDarkMode?: TernaryDarkMode): IUseDarkModeToggleResult
{
    const { isDarkMode, ternaryDarkMode, setTernaryDarkMode, toggleTernaryDarkMode } = useTernaryDarkMode({
        defaultValue: fixedTernaryDarkMode ?? "system",
        initializeWithValue: true,
        localStorageKey: fixedTernaryDarkMode ? "fixed-dark-mode-" + fixedTernaryDarkMode : "dark-mode",
    });

    return {
        isDarkMode,
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
