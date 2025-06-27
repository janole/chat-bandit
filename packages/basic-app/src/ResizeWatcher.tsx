"use client";

import { useEffect, RefObject, useRef, useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type TSizes = { [key: string]: { width: number, height: number } };
type TPanelState = "collapsed" | "expanded" | "hidden";

interface ILayout
{
    sizes: TSizes;
    setSizes: (sizes: TSizes) => void;

    panels: { [key: string]: TPanelState };
    setPanelState: (name: string, state: TPanelState) => void;
}

export const useLayoutStore = create<ILayout>()(
    persist(
        (set) => ({
            sizes: {},
            setSizes: (sizes) => set(state => ({ ...state, sizes: { ...state.sizes, ...sizes } })),

            panels: {},
            setPanelState: (name, panelState) => set(state => ({ ...state, panels: { ...state.panels, [name]: panelState } })),
        }),
        {
            name: "layout-storage",
        }
    )
);

interface UseResizeWatcherProps
{
    refs: { [key: string]: RefObject<HTMLElement | null>; };
}

export default function useResizeWatcher(props: UseResizeWatcherProps)
{
    const { refs } = props;

    const initRef = useRef<boolean>(false);
    const setSizes = useLayoutStore(state => state.setSizes);

    const updateSizes = useCallback(() =>
    {
        const newSizes: TSizes = {};

        Object.keys(refs).forEach(name => 
        {
            const width = refs[name].current?.clientWidth || 0;
            const height = refs[name].current?.clientHeight || 0;

            newSizes[name] = { width, height };
        });

        setSizes(newSizes);
    }, [
        // TODO: refactor or good?
        ...Object.values(refs).map(ref => ref.current),
    ]);

    useEffect(() =>
    {
        let observer: ResizeObserver;

        const initObserver = () => 
        {
            updateSizes();

            observer = new ResizeObserver(updateSizes);

            const elements = Object.values(refs).map(ref => ref.current).filter(e => e) as HTMLElement[];

            elements.forEach(element => observer.observe(element));
        };

        const id = requestAnimationFrame(initObserver);

        return () => { cancelAnimationFrame(id); observer?.disconnect(); };
    }, [
        updateSizes,
    ]);

    return { init: initRef.current };
}
