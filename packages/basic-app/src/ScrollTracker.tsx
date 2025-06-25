import { useEffect, useRef } from "react";
import { create } from "zustand";

type TScrollTop = { [key: string]: number };

interface IScrollTop
{
    scrollTop: TScrollTop;
    setScrollTop: (id: string, scrollTop: number) => void;
    getScrollTop: (id: string) => number | undefined;
}

export const useScrollTopStore = create<IScrollTop>()(
    (set, get) => ({
        scrollTop: {},
        setScrollTop: (id, scrollTop) => set(state => ({ ...state, scrollTop: { ...state.scrollTop, [id]: scrollTop } })),
        getScrollTop: (id) => get().scrollTop[id],
    })
);

interface UseScrollTrackerProps
{
    scrollId?: string;
}

export function useScrollTracker(props: UseScrollTrackerProps)
{
    const { scrollId } = props;

    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollIdRef = useRef<string>();
    scrollIdRef.current = scrollId;

    const getScrollTop = useScrollTopStore(state => state.getScrollTop);
    const setScrollTop = useScrollTopStore(state => state.setScrollTop);

    useEffect(() =>
    {
        if (scrollRef.current)
        {
            const handleScroll = () =>
            {
                if (scrollRef.current && scrollIdRef.current)
                {
                    setScrollTop(scrollIdRef.current, scrollRef.current.scrollTop);
                }
            };

            scrollRef.current.addEventListener("scroll", handleScroll);

            // Clean up the event listener on component unmount
            return () =>
            {
                scrollRef.current?.removeEventListener("scroll", handleScroll);
            };
        }

        return;
    }, [
        scrollRef,
        scrollIdRef,
        setScrollTop,
    ]);

    useEffect(() =>
    {
        if (scrollId)
        {
            const scrollTop = getScrollTop(scrollId);

            if (scrollTop != undefined && scrollRef.current)
            {
                scrollRef.current.scrollTop = scrollTop;
            }
        }
    }, [
        scrollId,
        getScrollTop,
        scrollRef,
    ]);

    return {
        scrollRef,
    };
};
