import { memo, useMemo } from "react";
import ReactCodeMirror from "@uiw/react-codemirror";
import { langs as defaultLangs } from "@uiw/codemirror-extensions-langs";
import { githubLight, githubDark } from "@uiw/codemirror-theme-github";

const langs = {
    ...defaultLangs,
    js: defaultLangs.javascript,
    ts: defaultLangs.typescript,
    bash: defaultLangs.shell,
};

interface SyntaxHighlighterProps
{
    code: string;
    lang: keyof typeof langs;
    mode: "dark" | "light";
}

function SyntaxHighlighter(props: SyntaxHighlighterProps)
{
    const { code, lang, mode } = props;

    const extensions = useMemo(() => langs[lang] ? [langs[lang]()] : undefined, [lang]);

    return (
        <ReactCodeMirror
            value={code}
            readOnly
            theme={mode === "light" ? githubLight : githubDark}
            extensions={extensions}
        />
    );
}

const MemoSyntaxHighlighter = memo(SyntaxHighlighter);

export { MemoSyntaxHighlighter as SyntaxHighlighter };