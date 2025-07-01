import React, { memo } from "react";
import { alpha, Box, Collapse, Link, Paper, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Theme } from "@mui/material";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import ReactMarkdown, { Components, Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { marked } from "marked";
import ThinkingIndicator from "./ThinkingIndicator";
import TerminalWindow from "./TerminalWindow";

const preprocessLaTeX = (content: string) =>
{
    // Replace block-level LaTeX delimiters \[ \] with $$ $$
    const blockProcessedContent = content.replace(
        /\\\[(.*?)\\\]/gs,
        (_, equation) => `$$${equation}$$`,
    );

    // Replace inline LaTeX delimiters \( \) with $ $
    const inlineProcessedContent = blockProcessedContent.replace(
        /\\\((.*?)\\\)/gs,
        (_, equation) => `$$${equation}$$`,
    );

    return inlineProcessedContent;
};

const preprocessThinking = (content: string) =>
{
    for (let tagPair of [["think"], ["thinking"], ["thought"], ["|begin_of_thought|", "|end_of_thought|"]])
    {
        const startTag = tagPair[0], endTag = tagPair.length > 1 ? tagPair[1] : "/" + startTag;

        if (content.length >= startTag.length + 2
            && /\p{S}/u.test(content[0]) // heuristic: if the first character is a symbol, then it is a thinking tag
            && content.substring(1, startTag.length + 1) === startTag)
        {
            const end = content.indexOf(content[0] + endTag + content[1 + startTag.length]);

            return {
                thinking: content.substring(2 + startTag.length, end > 0 ? end : undefined).trim(),
                content: end > 0 ? content.substring(end + 2 + endTag.length).trim() : undefined,
            }
        }
    }

    return {
        content,
    };
};

export const htmlEncode = (html: string) => String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // .replace(/^[ \t]+/gm, '') // remove leading whitespace on each line
    ;

export function removeLeadingIndentation(code: string): string
{
    const leadingWhiteSpace = code.match(/^[ \t]+/);

    if (!leadingWhiteSpace || !leadingWhiteSpace[0].length)
    {
        return code;
    }

    const leadingWhiteSpaceLength = leadingWhiteSpace[0].length;

    return code.split("\n")
        .map(line => line.startsWith(leadingWhiteSpace[0]) ? line.substring(leadingWhiteSpaceLength) : line)
        .join("\n");
};

interface ThinkingWrapperProps
{
    thinkingInProgress?: boolean;
    children?: React.ReactNode;
    showThinking?: boolean;
    toggleShowThinking?: () => void;
}

function ThinkingWrapper(props: ThinkingWrapperProps)
{
    return (
        <Box>
            <Box
                sx={{
                    pt: 2,
                    color: "secondary.main",
                    display: "flex",
                    gap: 2,
                }}
                onClick={props.toggleShowThinking}
            >
                Thinking
                {props.thinkingInProgress && <ThinkingIndicator />}
                {props.children && props.showThinking ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </Box>
            <Collapse in={props.showThinking}>
                <Box
                    sx={{
                        ml: 0.5,
                        px: 2,
                        borderLeft: (theme: Theme) => `2px dotted ${theme.palette.text.disabled}`,
                        "& > p:last-child": { mb: 0 },
                    }}
                >
                    {props.children}
                </Box>
            </Collapse>
        </Box>
    );
}

export const markdownComponents = {
    a: ({ href, children }) => (
        <Link
            children={children}
            href={href}
            rel="noopener noreferrer"
            target="_blank"
        />
    ),
    p: ({ children }) => (
        <Box
            children={children}
            component="p"
            whiteSpace="pre-wrap"
        />
    ),
    hr: ({ node }) => (
        <Box
            sx={{
                borderBottom: (node!.position!.end.offset! - node!.position!.start.offset!) > 3 ? "1px dashed" : "1px solid",
                borderColor: "divider",
                py: 1,
            }}
        />
    ),
    blockquote: ({ children }) => (
        <Box
            children={children}
            component="div"
            sx={{
                pl: "1.25rem",
                color: "text.secondary",
                borderLeft: "0.25rem solid",
                borderLeftColor: "divider",
            }}
        />
    ),
    pre: (props) => (
        <TerminalWindow {...props} />
    ),
    code: ({ children }) => (
        <Box
            component="code"
            sx={{
                fontSize: "body2.fontSize",
                color: "text.primary",
                backgroundColor: "action.hover",
                borderRadius: 1,
                px: 0.5,
                py: 0.2,
                overflowX: "scroll",
            }}
        >
            {children}
        </Box>
    ),
    table: ({ children }) => 
    {
        return (
            <Paper
                className="cb-Markdown-table keep-together"
                sx={{
                    width: "100%",
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: (theme: Theme) => `0 0 ${theme.spacing(1)} 0 ${alpha(theme.palette.text.primary, 0.1)}`,
                    overflow: "hidden",
                    borderRadius: 2,
                    "& th": {
                        typography: "subtitle2",
                        whiteSpace: "nowrap",
                        px: 1.5,
                        py: 1,
                        bgcolor: "divider",
                        textAlign: "left",
                    },
                    "& td": {
                        whiteSpace: "nowrap",
                        p: 1.5,
                    },
                    "& tbody tr:last-child td": { borderBottom: "none" },
                }}
            >
                <TableContainer>
                    <Table children={children} />
                </TableContainer>
            </Paper>
        );
    },
    thead: ({ children }) => (
        <TableHead children={children} />
    ),
    tbody: ({ children }) => (
        <TableBody children={children} />
    ),
    tr: ({ children }) => (
        <TableRow children={children} />
    ),
    td: ({ children }) => (
        <TableCell children={children} />
    ),
} satisfies Components;

function createMarkdownProps({ withHtml }: { withHtml?: boolean }): Options
{
    return {
        remarkPlugins: [
            [remarkMath, { singleDollarTextMath: false }],
            remarkGfm,
        ],
        rehypePlugins: [
            rehypeKatex,
            // TODO: check security ...
            ...(withHtml ? [rehypeRaw, rehypeSanitize] : []),
        ],
        components: markdownComponents,
    };
}

const markdownProps = createMarkdownProps({});

const MemoReactMarkdown = memo(ReactMarkdown);

export function MarkdownWrapper(props: { markdown: string })
{
    // TODO: better use remark?
    const blocks = marked.lexer(props.markdown).map(token => token.raw);

    return blocks.map((block, index) => (
        <MemoReactMarkdown key={index} {...markdownProps}>{block}</MemoReactMarkdown>
    ));
}

const markdownPropsWithHtml = createMarkdownProps({ withHtml: true });

function MarkdownWithHtml(props: Options)
{
    return (
        <ReactMarkdown
            {...markdownPropsWithHtml}
            {...props}
        />
    );
}

const MemoMarkdownWithHtml = memo(MarkdownWithHtml);

export { MemoMarkdownWithHtml as MarkdownWithHtml };

interface MarkdownProps
{
    markdown: string;
    inProgress?: boolean;
    showThinking?: boolean;
    toggleShowThinking?: () => void;
}

export default function Markdown(props: MarkdownProps)
{
    const { markdown, inProgress } = props;

    const { thinking, content } =
        preprocessThinking(
            preprocessLaTeX(
                markdown + ((inProgress && markdown.length) ? " \u23FA" : "")
            )
        );

    return (<>
        {thinking &&
            <ThinkingWrapper
                thinkingInProgress={inProgress && !content?.length}
                showThinking={props.showThinking}
                toggleShowThinking={props.toggleShowThinking}
            >
                <MarkdownWrapper markdown={thinking} />
            </ThinkingWrapper>
        }

        {content &&
            <MarkdownWrapper markdown={content} />
        }

        {(!thinking?.length && !content?.length && inProgress) &&
            <Box sx={{ transform: "translateY(16px)", mb: 3 }}>
                <ThinkingIndicator />
            </Box>
        }

        {(!content?.length && inProgress) &&
            <Box sx={{ pt: thinking?.length && props.showThinking ? 2 : 0, pb: 2 }}>
                <Skeleton />
                <Skeleton width="60%" />
            </Box>
        }
    </>);
}

export const MemoMarkdown = memo(Markdown);
