import { create } from 'zustand';
import { TDownloadStatusMap } from './types-electron';

export interface IDownloadStore
{
    status: TDownloadStatusMap;
    setStatus: (status: TDownloadStatusMap) => void;
};

export const useDownloadStore = create<IDownloadStore>()(
    (set) => ({
        status: {},
        setStatus: (status: TDownloadStatusMap) => 
        {
            set({ status });
        },
    }),
);
