import { OBJECT_LIBRARY, ASSET_SPECS } from "../generated/object_library.js";
import {
  PROTOCOLS,
  PROTOCOLS_BY_NAME,
  type ProtocolLaunchMetadata,
} from "../generated/protocol_index.js";
import { SCENES } from "../generated/scenes.js";
import { runPipeline } from "./scene_runtime/layout/index.js";
import { renderScene } from "./scene_runtime/renderer/index.js";

//============================================

type SceneName = keyof typeof SCENES;

//============================================

function main(): void {
  const root = document.getElementById("scene-root");
  if (!root) {
    throw new Error("#scene-root element not found in DOM");
  }

  const selectedProtocolName = getSelectedProtocolName();
  if (!selectedProtocolName) {
    renderProtocolSelector(root, undefined);
    return;
  }

  const protocol = PROTOCOLS_BY_NAME[selectedProtocolName];
  if (!protocol) {
    renderProtocolSelector(root, selectedProtocolName);
    return;
  }

  renderProtocolScene(root, protocol);
}

//============================================

function getSelectedProtocolName(): string | undefined {
  const params = new URLSearchParams(window.location.search);
  const protocolName = params.get("protocol");
  if (!protocolName) {
    return undefined;
  }

  return protocolName;
}

//============================================

function renderProtocolSelector(
  root: HTMLElement,
  invalidProtocolName: string | undefined,
): void {
  root.className = "launcher";
  root.replaceChildren();

  const shell = document.createElement("main");
  shell.className = "launcher__shell";

  const header = buildLauncherHeader(invalidProtocolName);
  const groupedProtocols = groupProtocols(PROTOCOLS);
  const runnerSection = buildProtocolSection(
    "Full sequences",
    groupedProtocols.sequenceRunners,
  );
  const miniSection = buildProtocolSection(
    "Mini-protocols",
    groupedProtocols.miniProtocols,
  );

  shell.append(header, runnerSection, miniSection);
  root.append(shell);
}

//============================================

function buildLauncherHeader(invalidProtocolName: string | undefined): HTMLElement {
  const header = document.createElement("header");
  header.className = "launcher__header";

  const title = document.createElement("h1");
  title.textContent = "Virtual Lab Protocols";

  const summary = document.createElement("p");
  summary.textContent = "Select a protocol to start.";

  header.append(title, summary);

  if (invalidProtocolName) {
    const error = document.createElement("div");
    error.className = "launcher__error";
    error.textContent = `Unknown protocol: ${invalidProtocolName}`;
    header.append(error);
  }

  return header;
}

//============================================

function groupProtocols(protocols: readonly ProtocolLaunchMetadata[]): {
  miniProtocols: ProtocolLaunchMetadata[];
  sequenceRunners: ProtocolLaunchMetadata[];
} {
  const miniProtocols = protocols.filter(
    (protocol) => protocol.protocol_type === "mini_protocol",
  );
  const sequenceRunners = protocols.filter(
    (protocol) => protocol.protocol_type === "sequence_runner",
  );
  const grouped = { miniProtocols, sequenceRunners };
  return grouped;
}

//============================================

function buildProtocolSection(
  titleText: string,
  protocols: ProtocolLaunchMetadata[],
): HTMLElement {
  const section = document.createElement("section");
  section.className = "protocol-section";

  const title = document.createElement("h2");
  title.textContent = titleText;

  const grid = document.createElement("div");
  grid.className = "protocol-grid";

  for (const protocol of protocols) {
    const card = buildProtocolCard(protocol);
    grid.append(card);
  }

  section.append(title, grid);
  return section;
}

//============================================

function buildProtocolCard(protocol: ProtocolLaunchMetadata): HTMLElement {
  const link = document.createElement("a");
  link.className = "protocol-card";
  link.href = `?protocol=${encodeURIComponent(protocol.protocol_name)}`;

  const name = document.createElement("span");
  name.className = "protocol-card__name";
  name.textContent = protocol.title;

  const meta = document.createElement("span");
  meta.className = "protocol-card__meta";
  meta.textContent = protocolMetaText(protocol);

  const code = document.createElement("span");
  code.className = "protocol-card__code";
  code.textContent = protocol.protocol_name;

  link.append(name, meta, code);
  return link;
}

//============================================

function protocolMetaText(protocol: ProtocolLaunchMetadata): string {
  if (protocol.protocol_type === "sequence_runner") {
    const label = protocol.mini_protocol_count === 1 ? "mini" : "minis";
    return `${protocol.mini_protocol_count} ${label}`;
  }

  const label = protocol.step_count === 1 ? "step" : "steps";
  return `${protocol.step_count} ${label}`;
}

//============================================

function renderProtocolScene(
  root: HTMLElement,
  protocol: ProtocolLaunchMetadata,
): void {
  root.className = "scene-page";
  root.replaceChildren();

  const toolbar = buildSceneToolbar(protocol);
  const sceneHost = document.createElement("div");
  sceneHost.id = "active-scene";

  root.append(toolbar, sceneHost);

  if (!isSceneName(protocol.launch_scene)) {
    renderUnavailableScene(sceneHost, protocol);
    return;
  }

  const scene = SCENES[protocol.launch_scene];
  const result = runPipeline(scene, {
    library: OBJECT_LIBRARY,
    assets: ASSET_SPECS,
  });

  renderScene(sceneHost, result);
}

//============================================

function buildSceneToolbar(protocol: ProtocolLaunchMetadata): HTMLElement {
  const toolbar = document.createElement("header");
  toolbar.className = "scene-toolbar";

  const backLink = document.createElement("a");
  backLink.className = "scene-toolbar__back";
  backLink.href = "./";
  backLink.textContent = "Protocols";

  const title = document.createElement("div");
  title.className = "scene-toolbar__title";
  title.textContent = protocol.title;

  const meta = document.createElement("div");
  meta.className = "scene-toolbar__meta";
  meta.textContent = protocolMetaText(protocol);

  toolbar.append(backLink, title, meta);
  return toolbar;
}

//============================================

function isSceneName(value: string): value is SceneName {
  return Object.prototype.hasOwnProperty.call(SCENES, value);
}

//============================================

function renderUnavailableScene(
  sceneHost: HTMLElement,
  protocol: ProtocolLaunchMetadata,
): void {
  const message = document.createElement("section");
  message.className = "scene-unavailable";

  const title = document.createElement("h2");
  title.textContent = "Scene unavailable";

  const detail = document.createElement("p");
  detail.textContent = `${protocol.protocol_name} starts in ${protocol.launch_scene}, which is not in the current generated scene allowlist.`;

  message.append(title, detail);
  sceneHost.append(message);
}

//============================================

main();
