import { useChatClient,useChatStore } from "@janole/ai-core";
import { SplitButton } from "@janole/basic-app";
import { AddCircleOutline } from "@mui/icons-material";

export default function NewButton()
{
    const { newChat } = useChatClient();

    const modelCount = useChatStore(state => state.models.filter(model => model.state.ready).length);

    if (modelCount === 0)
    {
        return null;
    }

    return (
        <SplitButton
            size="small"
            splitComponent={
                <AddCircleOutline fontSize="small" />
            }
            variant="contained"
            onClick={newChat}
        >
            New
        </SplitButton>
    );
}
