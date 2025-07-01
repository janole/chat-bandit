import { useNavigate } from "react-router-dom";
import { Box, Link } from "@mui/material";
import { ArrowRightAlt } from "@mui/icons-material";
import { ulid } from "ulid";
import App from "@renderer/App";
import { ContentContainer, FlexBox, SplitButton } from "@renderer/BasicApp";
import { IChatModelLlamaCpp, normalizeModelUri } from "@libraries/ai/types";
import { useChatStore } from "@libraries/ai/ChatStore";
import { DownloadableModelCard } from "./Components/DownloadableModelCard";

const defaultModels: IChatModelLlamaCpp[] = [
    {
        id: ulid(),
        name: "Llama 3.2 1B Instruct",
        description: "A compact, instruction-tuned language model with 1 billion parameters, optimized for fast, on-device use and helpful responses in chat and task-based scenarios.",
        provider: "node-llama-cpp",
        account: { id: "", name: "" },
        modelUri: normalizeModelUri("unsloth/Llama-3.2-1B-Instruct-GGUF:Q4_K_M"),
        state: { ready: false, downloadable: true },
        contextLength: 131072,
        parameterSize: "1B",
        quantizationLevel: "Q4_K_M",
        size: 807693984,
    },
];

const ollamaLink = <Link href="https://ollama.com/download" target="_blank">Ollama</Link>;

export function OnboardingView()
{
    const finished = useChatStore(state => !!state.models.find(m => m.state.ready));
    const ollama = useChatStore(state => !!state.models.find(m => m.provider === "ollama"));

    const model = useChatStore(state => state.models.find(m => m.modelUri === defaultModels[0].modelUri) as IChatModelLlamaCpp) ?? defaultModels[0];

    return (
        <FlexBox gap={1} flexDirection="column" height="80vh">
            <FlexBox justifyContent="center" typography="h1" fontFamily="Instrument Serif">
                Hello!
            </FlexBox>

            {!finished && <>
                <FlexBox flexGrow={1} />

                <FlexBox justifyContent="center" typography="h5" color="text.secondary">
                    Download a model to begin ...
                </FlexBox>
            </>}

            <FlexBox flexGrow={2} />

            <FlexBox justifyContent="center">
                {model &&
                    <DownloadableModelCard
                        description={defaultModels[0].description}
                        model={model}
                        width="72%"
                        elevation={15}
                    />
                }
            </FlexBox>

            <FlexBox flexGrow={1} />

            <FlexBox justifyContent="center">

                <FlexBox style={ollama ? { textDecoration: "line-through" } : undefined}>
                    or install&nbsp;{ollamaLink}.
                </FlexBox>

                {ollama &&
                    <FlexBox>
                        &nbsp;Found&nbsp;{ollamaLink}!
                    </FlexBox>
                }

            </FlexBox>

            <FlexBox flexGrow={5} />

            {finished && <>
                <FlexBox justifyContent="center" typography="h5">

                    Your first model is available!

                </FlexBox>

                <FlexBox flexGrow={2} />
            </>}
        </FlexBox>
    );
}

export default function Onboarding()
{
    const navigate = useNavigate();

    const finished = useChatStore(state => !!state.models.find(m => m.state.ready));

    const handleOnClose = () =>
    {
        navigate("/chat", { replace: true });
    };

    return (
        <App
            bottomToolbar={
                <FlexBox
                    padding={2}
                    gap={2}
                >
                    <FlexBox flexGrow={1} />

                    {finished &&
                        <FlexBox gap={2}>
                            <Box
                                sx={{
                                    typography: "h4",
                                    fontFamily: "Instrument Serif",
                                    fontWeight: 900,
                                    transform: "rotate(-4deg)",
                                    background: "#0001",
                                    px: 2,
                                    py: 1,
                                    borderRadius: 2,
                                    backgroundColor: "black.dark",
                                    color: "black.contrastText",
                                }}
                            >
                                Yay!&nbsp;
                            </Box>

                            Your first model is available!

                            <ArrowRightAlt />

                        </FlexBox>
                    }

                    <SplitButton
                        size="large"
                        onClick={handleOnClose}
                    >
                        {finished ? "Continue" : "Skip"}
                    </SplitButton>
                </FlexBox>
            }
        >
            <ContentContainer maxWidth="lg" px={4}>
                <OnboardingView />
            </ContentContainer>
        </App>
    );
}

export const Component = Onboarding;
