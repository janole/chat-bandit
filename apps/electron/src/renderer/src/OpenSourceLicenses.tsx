import { htmlEncode, markdownComponents, MarkdownWithHtml, useChatStore } from "@janole/ai-chat";
import { ElectronChatProvider } from "@janole/ai-electron";
import { ContentContainer, FlexBox } from "@janole/basic-app";
import { Typography } from "@mui/material";
import App from "@renderer/App";
import { Options } from "react-markdown";

import license from "../../../resources/license.json";

const licenseMarkdown = `

## ${import.meta.env.VITE_APP_NAME} - Version v${import.meta.env.VITE_APP_VERSION}

**Copyright © 2024-${new Date().getFullYear()}** Jan Ole Suhr / mobileways.de (chatbandit@mobileways.de)

## Open-Source Libraries And Resources

| Library | Version | License | URL | Description |
| ------- | ------- | ------- | --- | ----------- |
${license.map(item => `[${item.installedName}](https://www.npmjs.com/package/${item.name}) | ${item.installedVersion} | ${item.license} | ${item.homepage ?? item.repository?.url ?? item.repository} | ${item.description}`).join("\n")}

<br />

### Full licenses of open-source libraries and resources used by ${import.meta.env.VITE_APP_NAME}:

${license.filter(item => !!item.licenseText).map((item, index) => `

### ${index + 1}. **[${item.installedName}](https://www.npmjs.com/package/${item.name})** (${item.installedVersion})

> ${htmlEncode(item.description)}

\`\`\`markdown
${item.licenseText}
\`\`\`

---- 

`).join("\n")}

`;

function OpenSourceLicenses()
{
    return (
        <App
            contentTop={
                <ContentContainer maxWidth="xl" px={1} py={0}>
                    <FlexBox gap={1}>
                        <Typography variant="subtitle1" component="span" sx={{ fontWeight: "medium" }}>
                            Open-Source Licenses used in {import.meta.env.VITE_APP_NAME} v{import.meta.env.VITE_APP_VERSION}
                        </Typography>
                    </FlexBox>
                </ContentContainer>
            }
        >
            <ContentContainer maxWidth="md" px={4} py={0}>
                <MarkdownWithHtml
                    components={{
                        ...markdownComponents,
                        img: props => props.alt
                    } satisfies Options["components"]}
                >
                    {licenseMarkdown}
                </MarkdownWithHtml>
            </ContentContainer>
        </App>
    );
}

function Component()
{
    return (
        <ElectronChatProvider>
            <OpenSourceLicenses />
        </ElectronChatProvider>
    );
}

export { Component };
