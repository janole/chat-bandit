import { JSX, ReactNode } from "react";
import { Theme } from "@mui/material";
import { TernaryDarkMode } from "usehooks-ts";

export interface AppProps
{
    children?: ReactNode;
    appBarIcon?: ReactNode;
    appBarButtons?: ReactNode;
    fab?: JSX.Element | false;
    contentTopMargin?: boolean;
    disableTopToolbarDecoration?: boolean;
    contentTop?: ReactNode;
    bottomToolbar?: ReactNode | null;
    contentBottomMargin?: boolean;
    rightDrawer?: ReactNode;
    leftToolbarTop?: ReactNode;
    leftToolbar?: ReactNode;
    handleLeftToolbarVisibilityChange?: (visible: boolean) => void;
    rightToolbarTop?: ReactNode;
    rightToolbar?: ReactNode;
    handleRightToolbarVisibilityChange?: (visible: boolean) => void;

    contentScrollId?: string;

    // TODO: refactor to remove dependency on MUI
    onThemeChange?: (theme: Theme) => void;
    fixedTernaryDarkMode?: TernaryDarkMode;
}
