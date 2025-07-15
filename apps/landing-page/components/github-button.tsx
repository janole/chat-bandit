import { SiGithub } from "@icons-pack/react-simple-icons";
import { FlexBox, SplitButton } from "@janole/basic-app";
import { Divider } from "@mui/material";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";

interface GitHubButtonProps
{
    slug: string;
}

export function GitHubButton(props: GitHubButtonProps)
{
    const { slug } = props;

    const [stars, setStars] = useState<number>(0);

    useEffect(() =>
    {
        // simple fetch; if you SSR this page you may want to move this
        fetch(`https://api.github.com/repos/${slug}`)
            .then(res => res.json())
            .then(data => setStars(data.stargazers_count || 0))
            .catch(() => setStars(0));
    }, []);

    return (
        <SplitButton
            color="black"
            size="small"
            style={{ textTransform: "none", fontWeight: "bold", borderRadius: 8 }}
        >
            <FlexBox gap={1}>
                <Star className="icon w-4 h-4 !text-yellow-500 !fill-yellow-500" />
                {stars > 0 && `${stars?.toString()} Stars`}
                <Divider flexItem orientation="vertical" sx={{ borderColor: "inherit" }} />
                GitHub
                <SiGithub className="w-4 h-4" />
            </FlexBox>
        </SplitButton>
    );
}