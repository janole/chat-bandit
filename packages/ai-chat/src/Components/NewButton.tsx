import { AddCircleOutline } from '@mui/icons-material';
import { SplitButton } from '@janole/basic-app';
import { useChatStore, useChatClient } from "@janole/ai-core";

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
