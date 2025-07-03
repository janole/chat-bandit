"use client";

import { ReactNode } from "react";
import { Box, Button, Divider, StyledEngineProvider, useTheme, Typography, ThemeOptions, CardHeader, IconButton, CardContent, Grid, BoxProps, Link } from "@mui/material";
import { Brain, Download, Zap, Shield, Cpu, Globe, Settings, Heart, MessageCircle, Sparkles, ShieldCheck, Computer, Bug } from "lucide-react";
import { SiGithub, SiApple, SiX, SiLinux } from "@icons-pack/react-simple-icons";
import { BasicApp, ContentContainer, FlexBox, TernaryDarkModeToggle } from "@janole/basic-app";
import useDownloadInfo, { IDownloadInfo } from "../components/DownloadInfo";
import ColorText, { sxColorTextGradient } from "../components/ColorText";
import BackgroundEffects from "../components/BackgroundEffects";
import { Block, Page, Section, TextBlock } from "../components/Block";
import HeroHeadline from "../components/HeroHeadline";
import Badge from "../components/Badge";
import { FeatureBox, FeatureGrid, WobbleGrid } from "../components/Feature";
import Card from "../components/Card";

const appName = "Chat Bandit";

const themeOptions: ThemeOptions = {
    typography: {
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Ubuntu, Cantarell, 'Helvetica Neue', Arial, Roboto, sans-serif",
    },
};

function WobbleIcon(props: { icon: string, name: string })
{
    const { icon, name } = props;

    return (
        <div className="rotate-3 w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mr-1">
            <img className="w-10 -rotate-3" src={icon} alt={`${name} Icon`} />
        </div>
    );
}

const blocks = [
    {
        icon: "/icon.png",
        name: appName,
        prominent: true,
        href: "#hero",
    },
    {
        name: "Features",
        href: "#features",
    },
    {
        name: "Download",
        href: "#downloads",
    },
];

function NaviButton(props: { name: string, icon?: string, href?: string, prominent?: boolean, display?: BoxProps["display"] })
{
    const { name, icon, href, prominent, display } = props;

    return (
        <Button
            variant="text"
            sx={{
                fontSize: prominent ? "h5.fontSize" : "subtitle1.fontSize",
                color: "text.primary",
                textTransform: "none",
                fontWeight: prominent ? 900 : 500,
                display,
                alignItems: "center",
            }}
            startIcon={icon && <WobbleIcon icon={icon} name={name} />}
            href={href}
        >
            {name}
        </Button>
    );
}

const Header = () =>
{
    return (
        <ContentContainer
            maxWidth="xl"
            px={2}
            py={1}
            sx={{
                display: "flex",
                alignContent: "stretch",
                alignItems: "center",
                gap: 4,
            }}
        >
            {blocks.map((block, index) => (
                <NaviButton
                    key={block.name}
                    name={block.name}
                    icon={block.icon}
                    href={block.href}
                    prominent={block.prominent}
                    display={index > 0 ? { md: "block", sm: "none", xs: "none" } : undefined}
                />
            ))}

            <Box ml="auto" />

            <TernaryDarkModeToggle />
        </ContentContainer>
    );
};

const handleDownload = (fileName: string) =>
{
    if (!fileName)
    {
        return;
    }

    const link = document.createElement('a');
    link.href = `/downloads/${fileName}`;
    link.setAttribute("download", fileName);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const Hero = () =>
{
    const info = useDownloadInfo("mac");

    return (
        <Page id="hero">
            <BackgroundEffects />

            <Block>
                <Badge
                    icon={<Sparkles className="w-4 h-4 !text-orange-500" />}
                    label="All-in-One AI Chatbot"
                />
            </Block>

            <Block>
                <HeroHeadline>
                    Chat with <ColorText variant="v2"> Local</ColorText>
                    <br />
                    and <ColorText variant="v1">Cloud AI</ColorText>
                </HeroHeadline>
            </Block>

            <Block>
                <HeroHeadline size="sm">
                    The ultimate desktop AI companion. Run local models with Ollama & llama.cpp,
                    or connect to OpenAI, OpenRouter, Google AI and many more. Privacy-focused, lightning-fast, and infinitely customizable.
                </HeroHeadline>
            </Block>

            <Block flexWrap="wrap">
                <Badge
                    icon={<Cpu className="w-4 h-4 !text-green-400" />}
                    label="Local LLMs"
                />
                <Badge
                    icon={<ShieldCheck className="w-4 h-4 !text-blue-400" />}
                    label="Privacy First"
                />
                <Badge
                    icon={<Zap className="w-4 h-4 !text-yellow-400" />}
                    label="Lightning Fast"
                />
            </Block>

            <Block flexDirection="column" gap={1}>
                <Button
                    startIcon={<Download size="1.25rem" className="mr-1" />}
                    endIcon={
                        <Block display={{ md: "flex", sm: "none", xs: "none" }} pl={1} gap={2} textTransform="none" fontSize="1.0rem!important">
                            <Divider flexItem orientation="vertical" sx={{ borderWidth: 1, borderColor: "inherit", opacity: 0.5 }} />
                            <Block sx={{ gap: 1 }}>
                                <SiApple size="1.0rem" />
                                MacOS (Apple Silicon)
                            </Block>
                        </Block>
                    }
                    variant="contained"
                    size="large"
                    sx={{ boxShadow: 4, borderRadius: 2, px: 3, py: 1.5, fontSize: "1.1rem", ...sxColorTextGradient.v2, color: "white", textTransform: "none" }}
                    onClick={() => info?.fileName && handleDownload(info.fileName)}
                >
                    Download {appName} for free
                </Button>

                {!!info &&
                    <Typography variant="caption" color="textSecondary">
                        {info.fileName}, {(info.fileSize / 1024 / 1000).toFixed(0)} MB
                        —
                        Version: {info.version} / {new Date(info.fileDate).toLocaleDateString()}
                    </Typography>
                }
            </Block>

            <Box sx={{ position: "sticky", bottom: "-75%", pointerEvents: "none" }}>
                <Screenshot />
            </Box>
        </Page>
    );
};

const Screenshot = () =>
{
    const theme = useTheme();

    const screenshot = `/screenshot-${theme.palette.mode}.png`;

    return (
        <Box component="img" maxWidth="80vw" maxHeight="90vh" src={screenshot} alt={`Screenshot`} />
    );
};

const Features = () =>
{
    const features = [
        {
            icon: <Brain />,
            title: "Local LLM Support",
            description: "Run Ollama and llama.cpp models locally for complete privacy and offline functionality.",
            color: "from-green-500 to-emerald-500"
        },
        {
            icon: <Globe />,
            title: "Cloud AI Integration",
            description: "Connect seamlessly to OpenAI GPT models and OpenRouter for access to hundreds of AI models.",
            color: "from-blue-500 to-cyan-500"
        },
        {
            icon: <Shield />,
            title: "Privacy First",
            description: "Your conversations stay on your device with local models. Full control over your data.",
            color: "from-purple-500 to-pink-500"
        },
        {
            icon: <Zap />,
            title: "Lightning Fast",
            description: "Optimized performance with GPU acceleration and efficient model loading.",
            color: "from-yellow-500 to-orange-500"
        },
        {
            icon: <Settings />,
            title: "Highly Customizable",
            description: "Fine-tune model parameters, create custom prompts, and personalize your AI experience.",
            color: "from-indigo-500 to-purple-500"
        },
        {
            icon: <Cpu />,
            title: "System Optimization",
            description: "Smart resource management ensures smooth performance on any hardware configuration.",
            color: "from-red-500 to-pink-500"
        }
    ];

    return (
        <Page id="features">
            <Block>
                <HeroHeadline size="md">
                    Powerful Features for
                    <ColorText variant="v2"> Everyone</ColorText>
                </HeroHeadline>
            </Block>

            <Block>
                <HeroHeadline size="sm">
                    Whether you're a developer, researcher, or AI enthusiast, our app provides everything you need for seamless AI interactions.
                </HeroHeadline>
            </Block>

            <Block>
                <FeatureGrid>
                    {features.map((feature, index) => (
                        <FeatureBox key={index} {...feature} />
                    ))}
                </FeatureGrid>
            </Block>
        </Page>
    );
};

interface DownloadInfoBoxProps
{
    name: string;
    description: string;
    icon: ReactNode;
    info?: IDownloadInfo;

    color?: string;
    align?: "left" | "right" | "center";
}

function DownloadInfoBox(props: DownloadInfoBoxProps)
{
    const { name, description, icon, info, color, align } = props;

    return (
        <WobbleGrid disabled={!info}>
            <Card sx={{ width: "100%", height: "100%" }}>
                <CardHeader
                    sx={{ textAlign: align, p: { xs: 1, sm: 1, md: 2 } }}
                    title={
                        <IconButton className={`icon bg-gradient-to-r ${color}`} sx={{ borderRadius: 3, p: 1.5, color: "#fff", alignItems: "flex-start" }}>
                            {icon}
                        </IconButton>
                    }
                />
                <CardContent sx={{ p: { xs: 1, sm: 1, md: 2 } }}>
                    <Section gap={1}>
                        <Block sx={{ justifySelf: align }}>
                            <Box width="100%" typography="h6" fontWeight={600} textAlign={align}>
                                {name}
                            </Box>
                        </Block>
                        <Block sx={{ justifySelf: align }}>
                            <Box width="100%" typography="subtitle1" fontWeight={400} color="text.secondary" textAlign={align}>
                                {description}
                            </Box>
                        </Block>
                        {!info &&
                            <Block sx={{ justifySelf: align }} py={3}>
                                <Box width="100%" typography="h6" fontWeight={600} textAlign={align}>
                                    Coming soon ...
                                </Box>
                            </Block>
                        }

                        {!!info &&
                            <Block sx={{ justifySelf: align }}>
                                <Button
                                    startIcon={<Download size="1.25rem" className="mr-1" />}
                                    endIcon={
                                        <Block display={{ md: "flex", sm: "none", xs: "none" }} pl={1} gap={2}>
                                            <Divider flexItem orientation="vertical" sx={{ borderWidth: 1, borderColor: "inherit", opacity: 0.5 }} />
                                            <TextBlock sx={{ gap: 1 }} typography="body2" fontWeight={500}>
                                                ~{(info.fileSize / 1024 / 1000).toFixed(0)} MB
                                            </TextBlock>
                                        </Block>
                                    }
                                    variant="contained"
                                    size="large"
                                    sx={{ width: "100%", boxShadow: 4, borderRadius: 2, p: 1, fontSize: "1.1rem", ...sxColorTextGradient.v2, color: "white", textTransform: "none" }}
                                    onClick={() => handleDownload(info.fileName)}
                                    disabled={!info}
                                >
                                    Download
                                </Button>
                            </Block>
                        }
                        {!!info &&
                            <Block sx={{ justifySelf: align }}>
                                <Box width="100%" typography="caption" fontWeight={400} color="text.secondary" textAlign={align}>
                                    {info.fileName}
                                    {', '}
                                    {new Date(info.fileDate).toLocaleDateString()}
                                </Box>
                            </Block>
                        }
                    </Section>
                </CardContent>
            </Card>
        </WobbleGrid>
    );
}

const DownloadSection = () =>
{
    const mac = useDownloadInfo("mac");

    return (
        <Page id="downloads">
            <BackgroundEffects />

            <Block py={2}>
                <HeroHeadline size="md">
                    Ready to Get <ColorText variant="v1"> Started?</ColorText>
                </HeroHeadline>
            </Block>

            <Block py={2}>
                <HeroHeadline size="sm">
                    Download <ColorText variant="v3" fontWeight={700}>{appName}</ColorText> for your platform and start chatting with AI in minutes.
                    No setup complexity, just pure AI power.
                </HeroHeadline>
            </Block>

            <Block px={2} py={2}>
                <FeatureGrid>
                    <DownloadInfoBox
                        icon={<SiApple size="2.0rem" />}
                        color="from-blue-500 to-cyan-500"
                        name="Apple macOS"
                        description="macOS 10.15+ (Apple Silicon)"
                        info={mac}
                    />
                    <DownloadInfoBox
                        icon={<SiLinux size="2.0rem" />}
                        color="from-blue-500 to-cyan-500"
                        name="Linux"
                        description="Ubuntu 18.04+ / Debian 10+"
                    />
                    <DownloadInfoBox
                        icon={<Computer size="2.0rem" />}
                        color="from-blue-500 to-cyan-500"
                        name="Windows"
                        description="Windows 10/11 (64-bit)"
                    />
                </FeatureGrid>
            </Block>
        </Page>
    );
};

const Footer = () =>
{
    const links = {
        product: [
            { name: "Features", href: "#features" },
            { name: "Download", href: "#download" },
            { name: "Changelog", },
            { name: "Roadmap", },
        ],
        support: [
            { name: "Documentation" },
            { name: "Community", href: "https://github.com/janole/chat-bandit/discussions" },
            { name: "Discord", },
            { name: "GitHub Issues", href: "https://github.com/janole/chat-bandit/issues" }
        ],
        company: [
            { name: "About", href: undefined },
            { name: "Privacy" },
            { name: "Terms" },
            { name: "Contact" }
        ]
    };

    return (
        <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 12, md: 6, lg: 6, xl: 6 }} pr={4}>
                <Section alignItems="left" textAlign="left" gap={1} height="100%">
                    <Block>
                        <NaviButton name={appName} icon="/icon.png" prominent />
                        <Box ml="auto" />
                    </Block>

                    <TextBlock typography="body2">
                        The friendly and powerful desktop AI chatbot supporting both local and cloud models.
                        Built for privacy, performance, and flexibility.
                    </TextBlock>

                    <Box flexGrow={1} />

                    <Block>
                        <Link href="https://github.com/janole/chat-bandit" color="neutral">
                            <SiGithub size="1.25rem" />
                        </Link>

                        <Link href="https://x.com/ChatBanditApp" color="neutral">
                            <SiX size="1.25rem" />
                        </Link>

                        <Link href="https://github.com/janole/chat-bandit/discussions" color="neutral">
                            <MessageCircle size="1.25rem" />
                        </Link>

                        <Link href="https://github.com/janole/chat-bandit/issues" color="neutral">
                            <Bug size="1.25rem" />
                        </Link>

                        <Box ml="auto" />
                    </Block>
                </Section>
            </Grid>

            <Grid container size={{ xs: 12, sm: 12, md: 6, lg: 6, xl: 6 }} spacing={2}>
                <Grid size={{ xs: 4 }} textAlign="left">
                    <h4 className="font-semibold mb-4">Product</h4>
                    <ul className="space-y-2">
                        {links.product.map((link, index) => (
                            <li key={index}>
                                <Link component={link.href ? "a" : "button"} href={link.href} underline="hover" disabled={!link.href}>
                                    {link.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Grid>

                <Grid size={{ xs: 4 }} textAlign="right">
                    <h4 className="font-semibold mb-4">Support</h4>
                    <ul className="space-y-2">
                        {links.support.map((link, index) => (
                            <li key={index}>
                                <Link component={link.href ? "a" : "button"} href={link.href} underline="hover" disabled={!link.href}>
                                    {link.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Grid>

                <Grid size={{ xs: 4 }} textAlign="right">
                    <h4 className="font-semibold mb-4">Company</h4>
                    <ul className="space-y-2">
                        {links.company.map((link, index) => (
                            <li key={index}>
                                <Link component={link.href ? "a" : "button"} href={link.href} underline="hover" disabled={!link.href}>
                                    {link.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default function LandingPage()
{
    return (
        <BasicApp
            themeOptions={themeOptions}
            contentTop={
                <Header />
            }
            bottomToolbar={
                <ContentContainer maxWidth="md">
                    <FlexBox pt={5} typography="body2">
                        <FlexBox>
                            © {(new Date()).getFullYear()} {appName}. All rights reserved.
                        </FlexBox>
                        <FlexBox ml="auto">
                            Made with <Heart className="w-4 h-4 text-red-500 mx-1" /> in Berlin
                        </FlexBox>
                    </FlexBox>
                </ContentContainer>
            }
        >
            <StyledEngineProvider injectFirst>
                <ContentContainer maxWidth="xl" px={4} py={2} sx={{ overflow: "hidden" }}>
                    <Hero />

                    <Box pb={{ xs: 4, sm: 4, md: 10 }} />

                    <Features />

                    <Box pb={{ xs: 4, sm: 4, md: 10 }} />

                    <DownloadSection />

                    <Box pb={2} />
                </ContentContainer>
                <Box bgcolor="background.panel" pt={4} pb={8} mb={-8} borderTop="1px dashed" borderColor="divider">
                    <ContentContainer maxWidth="md">
                        <Footer />
                    </ContentContainer>
                </Box>
            </StyledEngineProvider>
        </BasicApp>
    );
}
