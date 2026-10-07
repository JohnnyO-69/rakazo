import { OPENCLAW_H1 } from "./guide";
import { GROK_ALTERNATIVE_H1, GROK_ALTERNATIVE_PATH } from "./grok-alternative";
import { DOCS_URL, GITHUB_URL, OPENCLAW_ALTERNATIVE_PATH, SITE_URL } from "./site";

/** Public descriptions were read on this date. */
export const COMPARED_ON = "October 7, 2026";

export const GET_STARTED = {
  heading: "Get started",
  copy: "Self-hosting is available now. Hosted Rakazo Cloud is not generally available.",
  docsLabel: "Self-hosting guide",
  githubLabel: "View on GitHub",
} as const;

export const OPEN_SOURCE_REASONS = [
  "The source is Apache-2.0 and public on GitHub.",
  "You can run the published Docker images, or a source checkout, on a machine you control. The desktop app can start that stack locally or connect to a server you already run.",
  "You bring the model credentials. Connector credentials are encrypted on the server and are not returned by the API.",
  "Routines are readable Markdown. A bot can pause for approval at a boundary you set, and actions are recorded in an audit log.",
  "The web app, the Electron desktop app, and the Expo mobile app are clients of the same API.",
] as const;

export type ComparisonRow = {
  topic: string;
  rakazo: string;
  other: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type SourceLink = {
  label: string;
  href: string;
};

export type AlternativeSection = {
  heading: string;
  paragraphs: readonly string[];
};

export type Alternative = {
  /** Path segment. The page is served at `/${slug}/`. */
  slug: string;
  /** Short product name used on the hub. */
  name: string;
  /** One sentence under the hub link. */
  summary: string;
  title: string;
  description: string;
  h1: string;
  /** Column heading for the other product. */
  otherName: string;
  intro: readonly string[];
  /** Optional sections rendered before the comparison table. */
  sections?: readonly AlternativeSection[];
  rows: readonly ComparisonRow[];
  faq: readonly FaqItem[];
  sources: readonly SourceLink[];
};

export const ALTERNATIVES_HUB = {
  title: "Open Source AI Assistant Alternatives – Rakazo",
  description:
    "Open source comparisons of Rakazo with other AI assistants, including Grok Bot, OpenClaw, Hermes Agent, Meta's Muse, OpenAI's Dots, and Instinct.",
  h1: "Open source alternatives",
  intro:
    "Rakazo is an open source platform for persistent AI teammates you can run yourself. These pages compare it with other AI assistants using their public descriptions.",
} as const;

const MUSE_SOURCES = [
  {
    label: "Meta, Introducing Muse (September 8, 2026)",
    href: "https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/",
  },
  {
    label: "Meta, Connect 2026 recap (September 23, 2026)",
    href: "https://www.meta.com/blog/meta-connect-2026-everything-we-announced/",
  },
  {
    label: "Meta, Muse for Small Business (September 29, 2026)",
    href: "https://about.fb.com/news/2026/09/introducing-muse-small-business/",
  },
] as const satisfies readonly SourceLink[];

const DOTS_SOURCES = [
  {
    label: "OpenAI, Introducing dots (September 29, 2026)",
    href: "https://openai.com/index/introducing-dots/",
  },
  {
    label: "OpenAI Help Center, Dots privacy, security, and safety FAQs",
    href: "https://help.openai.com/en/articles/20001529-dots-privacy-security-and-safety-faqs",
  },
] as const satisfies readonly SourceLink[];

const INSTINCT_SOURCES = [
  { label: "Instinct homepage", href: "https://instinct.com/" },
  {
    label: "Instinct privacy policy (revised August 26, 2026)",
    href: "https://instinct.com/privacy-policy",
  },
  {
    label: "Instinct terms of service (revised August 26, 2026)",
    href: "https://instinct.com/terms",
  },
] as const satisfies readonly SourceLink[];

const HERMES_SOURCES = [
  { label: "Hermes Agent", href: "https://hermes-agent.nousresearch.com/" },
  {
    label: "Hermes Agent quickstart",
    href: "https://hermes-agent.nousresearch.com/docs/getting-started/quickstart",
  },
  {
    label: "Hermes Agent configuration",
    href: "https://hermes-agent.nousresearch.com/docs/user-guide/configuration",
  },
  {
    label: "Hermes Agent security",
    href: "https://hermes-agent.nousresearch.com/docs/user-guide/security",
  },
  { label: "Hermes Agent source", href: "https://github.com/NousResearch/hermes-agent" },
] as const satisfies readonly SourceLink[];

/**
 * Comparison pages. Add an entry here to publish `/${slug}/` and a hub card.
 */
export const ALTERNATIVES: readonly Alternative[] = [
  {
    slug: "muse-alternative",
    name: "Muse",
    summary: "Meta's personal AI agent, and what is different when you host Rakazo yourself.",
    title: "Open Source Muse Alternative – Rakazo",
    description:
      "Rakazo is an open source, self-hostable platform for persistent AI teammates. Compare it with Meta's Muse personal agent.",
    h1: "Open source Muse alternative",
    otherName: "Muse",
    intro: [
      "Muse is Meta's personal AI agent, introduced on September 8, 2026. It runs on a virtual machine Meta operates, and you talk to it in the Muse app or WhatsApp. Meta says it can keep working after you close the app.",
      "Rakazo is open source software for persistent AI teammates. You choose the model and the computer, and you can run the stack yourself. This is a comparison of public descriptions, not a measured benchmark.",
    ],
    rows: [
      {
        topic: "Product",
        rakazo: "Open source platform for persistent AI teammates. Rakazo is in beta.",
        other:
          "Meta's personal AI agent. Meta says it takes on tasks and longer-term goals, rather than only answering questions.",
      },
      {
        topic: "Who runs it",
        rakazo:
          "You do. Self-host with Docker, or point the desktop and mobile apps at a server you operate. Hosted Rakazo Cloud is not generally available.",
        other:
          "Meta. Muse runs on Muse Secure VM, a dedicated cloud virtual machine for the agent and for data from services you connect. Meta's September 29, 2026 post describes Muse as available in the US and Canada.",
      },
      {
        topic: "Source",
        rakazo: "Apache-2.0 source on GitHub.",
        other: "Hosted service from Meta.",
      },
      {
        topic: "Model",
        rakazo:
          "Bring your own model credentials. Multiple providers are supported, including a custom model server.",
        other: "Muse Spark, which Meta's launch post describes as the model for this agent.",
      },
      {
        topic: "Computer",
        rakazo:
          "Sandboxed browser, terminal, files, and a graphical desktop, on a shared team computer or an isolated private computer. Docker is the default local computer, with optional E2B, Daytona, CreateOS, Box, or a trusted local computer.",
        other:
          "A browser on Muse Secure VM. Meta says Muse can open that browser, fill out forms, and take on tasks such as email and booking travel. The Connect recap says Muse for Mac can drive apps on that Mac with your permission.",
      },
      {
        topic: "Connected apps",
        rakazo:
          "Composio or Pipedream Connect, or a Treg, remote MCP, or OpenAPI source you install. Connector credentials are encrypted on the server and are not returned by the API.",
        other:
          "You choose which apps Muse can use and how much access each one gets. Meta publishes connectors, including work and shopping tools, and custom connectors.",
      },
      {
        topic: "Ongoing work",
        rakazo:
          "Each bot keeps its own conversations, memory, routines, and history. Routines are readable Markdown and can run on a schedule. A bot can delegate to a peer bot or a short-lived subagent.",
        other:
          "Meta says Muse keeps working after you close the app and comes back when something changes or it needs approval.",
      },
      {
        topic: "Approval",
        rakazo:
          "A bot can pause for approval when a task crosses a boundary you set. Actions are recorded in an audit log.",
        other:
          "Meta says Muse checks with you before sensitive actions such as sending an email or paying, and shows an audit trail. The small-business post says nothing publishes, sends, or spends without your approval. You can opt out of using interactions to train Meta's models. Meta says conversations and VM data are not shared with Meta's ad systems, and that stored credentials can be used without Muse seeing the passwords.",
      },
      {
        topic: "Where you use it",
        rakazo:
          "Web app, Electron desktop app, and Expo mobile app. Voice can speak replies, take dictation, and call a bot, with your own ElevenLabs, OpenAI, Cartesia, or Fish Audio key.",
        other:
          "Muse app on iOS and Android, WhatsApp, and muse.ai, per the launch. The Connect recap adds the Mac app, a voice mode you can shape, and Muse on AI glasses in the coming months.",
      },
    ],
    faq: [
      {
        question: "Is Rakazo a replacement for Muse?",
        answer:
          "No. Muse is Meta's hosted personal agent, with the Muse app, WhatsApp, and a virtual machine Meta operates. Rakazo is open source software for persistent AI teammates on infrastructure you control. Both can keep working beyond a single chat. They differ on hosting, model choice, and which products are built in.",
      },
      {
        question: "Can I self-host Rakazo?",
        answer:
          "Yes. Self-hosting is available now with published Docker images or a source checkout. Hosted Rakazo Cloud is not generally available.",
      },
      {
        question: "Does Rakazo include Muse on WhatsApp, shopping checkout, or AI glasses?",
        answer:
          "No. Those are Muse surfaces Meta describes. Rakazo's clients are the web app, the Electron desktop app, and the Expo mobile app. Voice in Rakazo uses a key you bring for ElevenLabs, OpenAI, Cartesia, or Fish Audio.",
      },
      {
        question: "Where do the Muse details come from?",
        answer:
          "The Muse column summarizes Meta's September 8, 2026 launch, the September 23, 2026 Connect recap, and the September 29, 2026 small-business post. Check those posts before you rely on a specific capability.",
      },
    ],
    sources: MUSE_SOURCES,
  },
  {
    slug: "dots-alternative",
    name: "Dots",
    summary: "OpenAI's always-on agents, in a shorter comparison.",
    title: "Open Source Dots Alternative – Rakazo",
    description:
      "Rakazo is an open source, self-hostable platform for persistent AI teammates. Compare it with OpenAI's Dots agents.",
    h1: "Open source Dots alternative",
    otherName: "Dots",
    intro: [
      "Dots are OpenAI's always-on agents, announced on September 29, 2026. OpenAI says they use GPT-6 Astra, have their own cloud computer, and are rolling out on eligible Pro, Business Premium, and Enterprise plans.",
      "Rakazo is separate software: open source AI teammates you can host yourself, with model credentials you bring.",
    ],
    rows: [
      {
        topic: "Product",
        rakazo: "Open source platform for persistent AI teammates. Rakazo is in beta.",
        other:
          "Always-on agents from OpenAI. OpenAI says a dot learns from feedback and can work toward your goals continuously.",
      },
      {
        topic: "Who runs it",
        rakazo:
          "You do. Self-host with Docker, or point the desktop and mobile apps at a server you operate. Hosted Rakazo Cloud is not generally available.",
        other: "OpenAI. The announcement says each dot has its own cloud computer.",
      },
      {
        topic: "Source",
        rakazo: "Apache-2.0 source on GitHub.",
        other: "Hosted product from OpenAI.",
      },
      {
        topic: "Model",
        rakazo:
          "Bring your own model credentials. Multiple providers are supported, including a custom model server.",
        other: "GPT-6 Astra, according to OpenAI's announcement.",
      },
      {
        topic: "Connections",
        rakazo:
          "Composio or Pipedream Connect, or a Treg, remote MCP, or OpenAPI source you install. Bots also get a sandboxed browser, terminal, files, and a graphical desktop.",
        other:
          "OpenAI says plugins connect a dot to more than 4,000 apps, and those permissions are shared with ChatGPT. The help center says you can also give a dot its own Slack account.",
      },
      {
        topic: "Ongoing work",
        rakazo:
          "Each bot keeps conversations, memory, routines, and history. Routines are readable Markdown and can run on a schedule. A bot can delegate to a peer bot or a short-lived subagent.",
        other:
          "OpenAI says a dot can keep working in the background. Proactive research can read permitted sources and save private notes. The help center says that research cannot send messages, change content through plugins, or control a browser or computer.",
      },
      {
        topic: "Control and availability",
        rakazo:
          "A bot can pause for approval at a boundary you set, and actions are recorded in an audit log. The web, desktop, and mobile clients are available with self-hosting now.",
        other:
          "Built-in rules and Custom Rules say what a dot may do, must ask about, or must not do. Custom Rules cannot turn off core safety checks. The help center says changing a password or transferring money requires you to take over, and Activity View shows ongoing work. The first dot is included with Pro and Business Premium. Dots are not available to users under 18. OpenAI is also previewing specialist dots for organizations.",
      },
    ],
    faq: [
      {
        question: "Is Rakazo a replacement for a dot?",
        answer:
          "No. A dot is an OpenAI agent on an eligible ChatGPT plan. Rakazo is open source software you run yourself, with your own model credentials.",
      },
      {
        question: "Do I need an OpenAI account to use Rakazo?",
        answer:
          "No. OpenAI is one supported model connection, not a requirement. You bring credentials for a provider you choose.",
      },
      {
        question: "Where do the Dots details come from?",
        answer:
          "The Dots column summarizes OpenAI's September 29, 2026 announcement and OpenAI's Dots privacy, security, and safety FAQ. Check those pages before you rely on a specific capability.",
      },
    ],
    sources: DOTS_SOURCES,
  },
  {
    slug: "instinct-alternative",
    name: "Instinct",
    summary: "A hosted personal assistant you text or call, and what is different when you host Rakazo yourself.",
    title: "Open Source Instinct Alternative – Rakazo",
    description:
      "Rakazo is an open source, self-hostable platform for persistent AI teammates. Compare it with Instinct, the personal assistant you text or call.",
    h1: "Open source Instinct alternative",
    otherName: "Instinct",
    intro: [
      "Instinct is a personal assistant operated by Spear Street Technology, Inc. The homepage says there are no new interfaces: you text or call it, and it can use a phone and a computer the way a person does. Examples on that page include disputing a bill, sending gifts, ordering groceries, scheduling a doctor's appointment, and planning a trip.",
      "Rakazo is open source software for persistent AI teammates. You choose the model and the computer, and you can run the stack yourself. This is a comparison of public descriptions, not a measured benchmark.",
    ],
    rows: [
      {
        topic: "Product",
        rakazo: "Open source platform for persistent AI teammates. Rakazo is in beta.",
        other:
          "A personal assistant. The privacy policy, revised August 26, 2026, calls it an autonomous assistant that thinks, plans, and acts on everyday tasks.",
      },
      {
        topic: "Who runs it",
        rakazo:
          "You do. Self-host with Docker, or point the desktop and mobile apps at a server you operate. Hosted Rakazo Cloud is not generally available.",
        other:
          "Spear Street Technology, Inc., under the Instinct name. The privacy policy describes a hosted service, including third-party hosting. It does not describe installing Instinct on a server you operate.",
      },
      {
        topic: "Source",
        rakazo: "Apache-2.0 source on GitHub.",
        other: "Hosted service. The terms say the company owns the service and the technology that produces its actions.",
      },
      {
        topic: "Model",
        rakazo:
          "Bring your own model credentials. Multiple providers are supported, including a custom model server.",
        other:
          "The privacy policy and terms do not name a public model. They say Instinct may use what you submit to train the models behind the service. You can opt out at app.instinct.com/settings. The opt-out is forward-looking, material flagged for safety review can still be used, and models already trained stay trained. Materials you put in the Vault feature are not used for training. Information received from Google Workspace APIs is excluded from model training.",
      },
      {
        topic: "Computer",
        rakazo:
          "Sandboxed browser, terminal, files, and a graphical desktop, on a shared team computer or an isolated private computer. Docker is the default local computer, with optional E2B, Daytona, CreateOS, Box, or a trusted local computer.",
        other:
          "The homepage says Instinct can use a phone and a computer the way a person does. The privacy policy's examples include booking a ride, signing into an account with credentials you provide, and booking a medical appointment.",
      },
      {
        topic: "Connected apps",
        rakazo:
          "Composio or Pipedream Connect, or a Treg, remote MCP, or OpenAPI source you install. Connector credentials are encrypted on the server and are not returned by the API.",
        other:
          "The terms authorize Instinct to access connected services and take actions there, including sharing a payment method when a purchase is part of the action. Linking Google Workspace grants Calendar, Gmail, Drive, Docs, Sheets, Slides, and Tasks. Precise location is collected only if you choose to share it. Payment details for Instinct's own fees go through a third-party payment processor.",
      },
      {
        topic: "Ongoing work",
        rakazo:
          "Each bot keeps its own conversations, memory, routines, and history. Routines are readable Markdown and can run on a schedule. A bot can delegate to a peer bot or a short-lived subagent.",
        other:
          "The privacy policy says the assistant is designed to be available when you engage it, and that it plans and completes tasks from the permissions you grant.",
      },
      {
        topic: "Approval",
        rakazo:
          "A bot can pause for approval when a task crosses a boundary you set. Actions are recorded in an audit log.",
        other:
          "The terms say you authorize Instinct to take actions it treats as responsive to what you send, including purchases, and that you remain responsible for them. They say safeguards or confirmation steps may exist, and they do not promise those steps will prevent an unintended action. The privacy policy says the assistant can act on its own within the permissions you grant, and it asks you to review actions because an unintended payment or message is possible. You must be 18 or older.",
      },
      {
        topic: "Where you use it",
        rakazo:
          "Web app, Electron desktop app, and Expo mobile app. Voice can speak replies, take dictation, and call a bot, with your own ElevenLabs, OpenAI, Cartesia, or Fish Audio key.",
        other:
          "The homepage says you text or call it. The privacy policy and terms also describe the Instinct website, Mac apps, and mobile apps.",
      },
    ],
    faq: [
      {
        question: "Is Rakazo a replacement for Instinct?",
        answer:
          "No. Instinct is a hosted personal assistant you text or call, operated by Spear Street Technology, Inc. Rakazo is open source software for persistent AI teammates on infrastructure you control. Both can take on tasks beyond a single reply. They differ on hosting, model choice, and who operates the computer.",
      },
      {
        question: "Can I self-host Rakazo?",
        answer:
          "Yes. Self-hosting is available now with published Docker images or a source checkout. Hosted Rakazo Cloud is not generally available.",
      },
      {
        question: "Does Rakazo text, call, or buy things the way Instinct describes?",
        answer:
          "No. Those are Instinct behaviors described on its homepage, privacy policy, and terms. Rakazo's clients are the web app, the Electron desktop app, and the Expo mobile app. A bot can use a browser, terminal, files, and a desktop you run, and it can pause for approval at a boundary you set.",
      },
      {
        question: "Where do the Instinct details come from?",
        answer:
          "The Instinct column summarizes the Instinct homepage, the privacy policy revised August 26, 2026, and the terms of service revised the same day. This page is about the personal assistant at instinct.com. Check those pages before you rely on a specific capability.",
      },
    ],
    sources: INSTINCT_SOURCES,
  },
  {
    slug: "hermes-alternative",
    name: "Hermes Agent",
    summary: "Nous Research's open source agent. Rakazo keeps setup and daily use in chat.",
    title: "Open Source Hermes Alternative – Rakazo",
    description:
      "Rakazo is an open source, self-hosted AI agent with a chat interface. Compare its setup with Hermes Agent, the MIT-licensed agent from Nous Research.",
    h1: "Open source Hermes alternative",
    otherName: "Hermes Agent",
    intro: [
      "Hermes Agent is Nous Research's open source AI agent, released under the MIT license. You can run it on your own machine. The project site also offers optional Nous Portal credits and cloud hosting.",
      "The main difference is simplicity. Rakazo follows the same shape as Grok Bot: after the app is running, it is a chat, and you set up a bot and manage its work there. Hermes's quickstart is a command-line setup: an installer, a setup wizard, a model command, config files, and a separate messaging gateway when you want the agent always on.",
      "Both are open source and can run on hardware you control. This comparison uses each project's public docs. It is not a measured benchmark.",
    ],
    sections: [
      {
        heading: "Setup",
        paragraphs: [
          "Rakazo's self-host path is the published Docker installer, or the desktop app starting that stack on this computer. You create an account and connect a model. From there the web, desktop, and mobile apps are a chat. A new bot interviews you about the work. Routines are readable Markdown.",
          "Hermes's quickstart starts with the Hermes Desktop installer on macOS or Windows, or a shell install (`install.sh` on Linux, macOS, and WSL2; a PowerShell script on Windows). `hermes setup` then offers Quick Setup (Nous Portal, one OAuth login), Full Setup (every provider, tool, and option), or Blank Slate (a minimal agent you opt into). The guide calls `hermes model` the important next step. Secrets go in `~/.hermes/.env` and other settings in `~/.hermes/config.yaml`, edited with `hermes config`. The first chat is `hermes` or `hermes --tui`. An always-on bot is another step: `hermes gateway setup` for Telegram, Discord, Slack, WhatsApp, Signal, Email, and other platforms, then a gateway process you start or install as a service.",
        ],
      },
      {
        heading: "Day-to-day management",
        paragraphs: [
          "In Rakazo you keep talking to the bot in the same app. Schedules, memory, and approval boundaries stay with that bot. Optional connectors can attach Slack, WhatsApp, Telegram, iMessage via Sendblue, and Feishu/Lark. They are not required to use the product.",
          "Hermes's quickstart sends a broken or changing setup through `hermes doctor`, `hermes model`, `hermes setup`, `hermes sessions list`, and `hermes gateway status`. Tool access is `hermes tools`. Cron, skills, and MCP servers are further configuration on top of the CLI and the gateway.",
        ],
      },
    ],
    rows: [
      {
        topic: "Setup",
        rakazo:
          "Docker installer or the desktop app's local stack, then an account and a model. After that the product is a chat: a new bot interviews you, and you manage it there.",
        other:
          "Desktop installer or a shell script, then `hermes setup` (Quick Setup, Full Setup, or Blank Slate) and `hermes model`. Config is `~/.hermes/config.yaml` and `~/.hermes/.env`. A terminal chat comes before `hermes gateway setup` for messaging platforms.",
      },
      {
        topic: "Day-to-day management",
        rakazo:
          "The same chat on the web, desktop, and mobile apps. Routines are readable Markdown and can run on a schedule. A bot can pause for approval at a boundary you set.",
        other:
          "The quickstart's recovery commands are `hermes doctor`, `hermes model`, `hermes setup`, and `hermes gateway status`. `hermes tools` changes tool access. The gateway is a process you keep running for chat apps.",
      },
      {
        topic: "Product",
        rakazo: "Open source platform for persistent AI teammates. Rakazo is in beta.",
        other:
          "Nous Research describes a self-improving agent: it creates skills from experience, keeps memory across sessions, and can run scheduled jobs. The README also documents a terminal UI and a messaging gateway.",
      },
      {
        topic: "Source",
        rakazo: "Apache-2.0 source on GitHub.",
        other: "MIT source on GitHub, built by Nous Research.",
      },
      {
        topic: "Model",
        rakazo:
          "Bring your own model credentials. Multiple providers are supported, including a custom model server. Each bot can use a different model.",
        other:
          "You choose a provider with `hermes model`. The quickstart lists many, including Nous Portal, OpenAI, Anthropic, OpenRouter, Google, a custom OpenAI-compatible endpoint, and local servers such as Ollama and LM Studio. It says a model needs at least 64,000 tokens of context.",
      },
      {
        topic: "Computer",
        rakazo:
          "Sandboxed browser, terminal, files, and a graphical desktop. Docker is the default local computer, with optional E2B, Daytona, CreateOS, Box, or a trusted local computer.",
        other:
          "The README lists seven terminal backends: local, Docker, SSH, Singularity, Modal, Daytona, and Vercel Sandbox. The quickstart shows `hermes config set terminal.backend` for Docker or SSH. The security guide says dangerous-command checks are skipped inside Docker, Singularity, Modal, Daytona, and Vercel Sandbox, because the container is the boundary.",
      },
      {
        topic: "Connections",
        rakazo:
          "Composio or Pipedream Connect, or a Treg, remote MCP, or OpenAPI source you install. Connector credentials are encrypted on the server and are not returned by the API.",
        other:
          "MCP servers are configured in `config.yaml`. The project site also describes web search, browser automation, vision, image generation, and text-to-speech, including a Nous Portal Tool Gateway that bundles several of those.",
      },
      {
        topic: "Where you talk to it",
        rakazo:
          "The Rakazo web, desktop, and mobile apps are the main surface. Optional connectors can attach Slack, WhatsApp, Telegram, iMessage via Sendblue, and Feishu/Lark.",
        other:
          "The CLI is the first surface in the quickstart. The gateway adds Telegram, Discord, Slack, WhatsApp, Signal, Email, and other platforms from one process. Hermes Desktop is the recommended installer on macOS and Windows.",
      },
      {
        topic: "Ongoing work",
        rakazo:
          "Each bot keeps conversations, memory, routines, and history. A bot can delegate to a peer bot or a short-lived subagent.",
        other:
          "The README describes agent-curated memory, skills that can be created after a task, a built-in cron scheduler, and isolated subagents. Scheduled jobs can be delivered back to a connected platform.",
      },
      {
        topic: "Approval",
        rakazo:
          "A bot can pause for approval when a task crosses a boundary you set. Actions are recorded in an audit log.",
        other:
          "The security guide documents approval for dangerous shell commands (`approvals.mode` defaults to smart), file-write checks, and allowlists for who can message the gateway. Container backends skip the dangerous-command check. Cron and other unattended sessions deny those commands unless you change that setting.",
      },
    ],
    faq: [
      {
        question: "Is Rakazo simpler to set up than Hermes Agent?",
        answer:
          "The documented paths are different. Rakazo's self-host guide is a Docker installer, or the desktop app starting that stack, then an account and a model. After that you work in chat. Hermes's quickstart is an installer, `hermes setup`, `hermes model`, config files under `~/.hermes/`, a terminal chat, and `hermes gateway setup` if you want messaging apps. Hermes can be a short path when you use Quick Setup with Nous Portal. The ongoing surface is still the CLI, the config files, and the gateway.",
      },
      {
        question: "Is Rakazo a drop-in replacement for Hermes Agent?",
        answer:
          "No. Rakazo does not import Hermes config, skills, or gateway sessions. Both are open source agents you can run yourself. They differ in license, interface, and how much of the setup lives in a chat versus a CLI.",
      },
      {
        question: "Do both keep the software on my machine?",
        answer:
          "Yes for the software you run. A Rakazo deployment stores its database and bot data on your host. Hermes stores config, memory, and skills on the machine where you install it, by default under `~/.hermes/`. In both cases, prompts go to the model provider you configure. Hermes's site also offers optional Nous Portal and cloud hosting.",
      },
      {
        question: "Where do the Hermes details come from?",
        answer:
          "The Hermes column summarizes the Hermes Agent site, the quickstart, the configuration guide, the security guide, and the project README on GitHub. This is Nous Research's Hermes Agent, not a different product with the same name. Check those pages before you rely on a specific command.",
      },
    ],
    sources: HERMES_SOURCES,
  },
];

export function alternativePath(alternative: Pick<Alternative, "slug">): string {
  return `/${alternative.slug}/`;
}

export type HubCard = {
  href: string;
  name: string;
  h1: string;
  summary: string;
};

/** Pages that already have their own route. They stay out of `ALTERNATIVES` so `[slug]` does not publish them again. */
const DEDICATED_HUB_CARDS: readonly HubCard[] = [
  {
    href: GROK_ALTERNATIVE_PATH,
    name: "Grok Bot",
    h1: GROK_ALTERNATIVE_H1,
    summary: "xAI's hosted bots, and what is different when you host Rakazo yourself.",
  },
  {
    href: OPENCLAW_ALTERNATIVE_PATH,
    name: "OpenClaw",
    h1: OPENCLAW_H1,
    summary: "An open source agent you run yourself. Rakazo stays in chat; OpenClaw's docs add a gateway and a config file.",
  },
];

export const HUB_CARDS: readonly HubCard[] = [
  ...ALTERNATIVES.map((page) => ({
    href: alternativePath(page),
    name: page.name,
    h1: page.h1,
    summary: page.summary,
  })),
  ...DEDICATED_HUB_CARDS,
];

export function faqPageSchema(faq: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

function cell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function alternativeMarkdown(alternative: Alternative): string {
  const lines = [
    `# ${alternative.h1}`,
    "",
    ...alternative.intro.flatMap((paragraph) => [paragraph, ""]),
    ...(alternative.sections ?? []).flatMap((section) => [
      `## ${section.heading}`,
      "",
      ...section.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ]),
    `Public descriptions as of ${COMPARED_ON}.`,
    "",
    "## Comparison",
    "",
    `| Topic | Rakazo | ${alternative.otherName} |`,
    "| --- | --- | --- |",
    ...alternative.rows.map(
      (row) => `| ${cell(row.topic)} | ${cell(row.rakazo)} | ${cell(row.other)} |`,
    ),
    "",
    "## Why open source and self-hosted",
    "",
    ...OPEN_SOURCE_REASONS.map((reason) => `- ${reason}`),
    "",
    `## ${GET_STARTED.heading}`,
    "",
    GET_STARTED.copy,
    "",
    `- [${GET_STARTED.docsLabel}](${DOCS_URL})`,
    `- [${GET_STARTED.githubLabel}](${GITHUB_URL})`,
    "",
    "## FAQ",
    "",
    ...alternative.faq.flatMap((item) => [`### ${item.question}`, "", item.answer, ""]),
    "## Sources",
    "",
    ...alternative.sources.map((source) => `- [${source.label}](${source.href})`),
    "",
  ];
  return lines.join("\n");
}

export function alternativesIndexMarkdown(): string {
  const pages = HUB_CARDS.map(
    (card) => `- [${card.h1}](${SITE_URL}${card.href}) — ${card.name}`,
  );
  return [
    `# ${ALTERNATIVES_HUB.h1}`,
    "",
    ALTERNATIVES_HUB.intro,
    "",
    `Public descriptions as of ${COMPARED_ON}.`,
    "",
    "## Pages",
    "",
    ...pages,
    "",
    `## ${GET_STARTED.heading}`,
    "",
    GET_STARTED.copy,
    "",
    `- [${GET_STARTED.docsLabel}](${DOCS_URL})`,
    `- [${GET_STARTED.githubLabel}](${GITHUB_URL})`,
    "",
  ].join("\n");
}
