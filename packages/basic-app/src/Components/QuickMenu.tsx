import { useRef, useState } from "react";
import { Box, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, SxProps } from "@mui/material";
import { MoreHoriz } from "@mui/icons-material";

interface IQuickMenuLink
{
    type?: "link";
    title?: JSX.Element | string;
    icon?: JSX.Element;
    onClick?: () => void;
    href?: string;

    hidden?: boolean;
}

interface IQuickMenuDivider
{
    type: "divider";
}

export type TQuickMenuItem = IQuickMenuLink | IQuickMenuDivider;

interface QuickMenuProps
{
    items: TQuickMenuItem[];
    button?: JSX.Element;
    icon?: JSX.Element;
    sxIconContainer?: SxProps;
    disabled?: boolean;
    onMenuVisibilityChange?: (visible: boolean) => void;
}

export function QuickMenu(props: QuickMenuProps)
{
    const { items, button, icon, sxIconContainer, onMenuVisibilityChange } = props;

    const ref = useRef<HTMLElement>(null);
    const [showMenu, _setShowMenu] = useState(false);

    const setShowMenu = (showMenu: boolean) =>
    {
        _setShowMenu(showMenu);
        onMenuVisibilityChange?.(showMenu);
    };

    const handleOnItemClick = (event: React.UIEvent, item: IQuickMenuLink) =>
    {
        event.stopPropagation();
        event.preventDefault();

        item.href && window.open(item.href, '_self');
        item.onClick?.();
        setShowMenu(false);
    };

    const handleOnClick = (event: React.UIEvent) =>
    {
        event.stopPropagation();
        event.preventDefault();

        !props.disabled && setShowMenu(true);
    };

    const handleOnClose = (event: React.UIEvent) =>
    {
        event.stopPropagation();
        event.preventDefault();

        setShowMenu(false);
    };

    return (
        <>
            <Box
                ref={ref}
                display="inline-block"
                sx={sxIconContainer}
                onClick={handleOnClick}
            >
                {button}
                {!button &&
                    <IconButton
                        disabled={props.disabled}
                    >
                        {icon || <MoreHoriz />}
                    </IconButton>
                }
            </Box>
            <Menu
                anchorEl={ref.current}
                open={showMenu}
                onClose={handleOnClose}
            >
                {items.map((item, index) => 
                {
                    if (item.type === "divider")
                    {
                        return <Divider key={index} />;
                    }

                    if (item.hidden)
                    {
                        return null;
                    }

                    return (
                        <MenuItem
                            key={index}
                            onClick={e => handleOnItemClick(e, item)}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText>{item.title}</ListItemText>
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
    );
}
