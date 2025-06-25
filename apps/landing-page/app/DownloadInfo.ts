"use client";

import { useEffect, useState } from "react";
import YAML from "yaml";

export interface IDownloadInfo
{
    version: string;
    fileName: string;
    fileSize: number;
    fileData: string;
}

export default function useDownloadInfo()
{
    const [info, setInfo] = useState<IDownloadInfo>();

    useEffect(() =>
    {
        fetch('/downloads/latest-mac.yml')
            .then(res => res.text())
            .then(yaml =>
            {
                console.log(yaml);
                const info = YAML.parse(yaml);
                console.log(info);

                const file: any = info.files.find((f: any) => f.url.endsWith(".dmg"));

                setInfo({
                    version: info.version,
                    fileName: file?.url,
                    fileSize: file?.size,
                    fileData: info.releaseDate,
                });
            })
            .catch(e => console.error(e));
    }, []);

    return info;
}
