"use client";

import { useEffect, useState } from "react";
import YAML from "yaml";

const fileExtension = {
    mac: ".dmg",
};

export interface IDownloadInfo
{
    variant: keyof typeof fileExtension;
    version: string;
    fileName: string;
    fileSize: number;
    fileDate: string;
}

export default function useDownloadInfo(variant: keyof typeof fileExtension)
{
    const [info, setInfo] = useState<IDownloadInfo>();

    useEffect(() =>
    {
        fetch(`/downloads/latest-${variant}.yml`)
            .then(res => res.text())
            .then(yaml =>
            {
                const info = YAML.parse(yaml);

                const file: any = info.files.find((f: any) => f.url.endsWith(fileExtension[variant]));

                setInfo({
                    variant,
                    version: info.version,
                    fileName: file?.url,
                    fileSize: file?.size,
                    fileDate: info.releaseDate,
                });
            })
            .catch(e => console.error(e));
    }, [
        variant,
    ]);

    return info;
}
