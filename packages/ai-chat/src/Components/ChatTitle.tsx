import { IChat,useChatTitle } from "@janole/ai-core";
import { FlexBox } from "@janole/basic-app";
import { Box } from "@mui/material";

export default function ChatTitle(props: { chatId: string, deletedAt?: IChat["deletedAt"] })
{
    const title = useChatTitle(props.chatId);

    return (
        <FlexBox
            gap={1}
            overflow="hidden"
        >
            <Box
                sx={{
                    typography: "subtitle1",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textWrap: "nowrap",
                    minWidth: 0,
                    textDecoration: props.deletedAt ? "line-through" : "none",
                    textDecorationThickness: "2px",
                    color: props.deletedAt ? "error.main" : "text.primary",
                }}
            >
                {title}
            </Box>
        </FlexBox>
    );
}
