export default function formatBytes(size: number, trim?: boolean)
{
    const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
    const v = (size / Math.pow(1024, i)).toFixed(2);
    return (trim ? +v * 1 : v) + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}
