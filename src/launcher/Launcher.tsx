// Launcher component: displays a two-tier navigable list of protocols
// read from the slim protocol index.
//
// Tier 1: "Full protocols" -- sequence_runner entries, prominent cards.
// Tier 2: "Mini-protocols" -- mini_protocol entries grouped by cluster.
//
// Pure presentation. No state. Renders each index entry as an anchor
// element so middle-click and right-click-open-in-new-tab work. The
// display_title is provided by the slim index (authoritative source);
// the cluster label is derived from the snake_case cluster key with
// known acronyms preserved (SDS-PAGE, MTT, PBS, DMSO, HEPES).
//
// Color hooks: each cluster section carries data-cluster=<key>; CSS owns
// the accent color per cluster. Sequence runner cards carry
// data-protocol-type="sequence_runner" for distinct treatment.
//
// Props: { index: ReadonlyArray<ProtocolIndexSlimEntry> }
// Returns: JSXElement (Solid.js component)

import { For, Show } from "solid-js";
import type { ProtocolIndexSlimEntry } from "../shell/adapter/types.js";
import type { JSXElement } from "solid-js";

export interface LauncherProps {
  readonly index: ReadonlyArray<ProtocolIndexSlimEntry>;
}

// Known acronyms that must remain upper-cased in cluster labels.
const ACRONYMS: Readonly<Record<string, string>> = {
  sdspage: "SDS-PAGE",
  mtt: "MTT",
  pbs: "PBS",
  dmso: "DMSO",
  hepes: "HEPES",
};

function formatToken(token: string): string {
  const lower = token.toLowerCase();
  if (ACRONYMS[lower]) {
    return ACRONYMS[lower];
  }
  if (token.length === 0) {
    return token;
  }
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function deriveClusterLabel(cluster: string): string {
  const tokens = cluster.split("_");
  const formatted = tokens.map(formatToken);
  const joined = formatted.join(" ");
  return joined;
}

interface ClusterGroup {
  readonly cluster_key: string;
  readonly cluster_label: string;
  readonly entries: ReadonlyArray<ProtocolIndexSlimEntry>;
}

function groupByCluster(index: ReadonlyArray<ProtocolIndexSlimEntry>): ReadonlyArray<ClusterGroup> {
  const buckets = new Map<string, ProtocolIndexSlimEntry[]>();
  for (const entry of index) {
    const key = entry.cluster;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(entry);
    } else {
      buckets.set(key, [entry]);
    }
  }
  const sorted_keys = Array.from(buckets.keys()).sort();
  const groups: ClusterGroup[] = [];
  for (const key of sorted_keys) {
    const bucket = buckets.get(key);
    if (!bucket) {
      continue;
    }
    const sorted_entries = bucket
      .slice()
      .sort((a, b) => a.protocol_name.localeCompare(b.protocol_name));
    groups.push({
      cluster_key: key,
      cluster_label: deriveClusterLabel(key),
      entries: sorted_entries,
    });
  }
  return groups;
}

function renderEntry(entry: ProtocolIndexSlimEntry): JSXElement {
  const protocol_name = entry.protocol_name;
  const display_title = entry.display_title;
  const learning_goal_hook = entry.learning_goal_hook;
  const protocol_type = entry.protocol_type;
  const step_count = entry.step_count;
  const estimated_seconds = entry.estimated_seconds;
  const href = protocol_name + ".html";

  return (
    <a
      class="protocol-card"
      data-protocol-id={protocol_name}
      data-protocol-type={protocol_type}
      data-cluster={entry.cluster}
      data-launcher-link
      href={href}
      aria-label={display_title}
    >
      <div class="protocol-card-header">
        <span class="protocol-card-title" data-launcher-link-name>
          {display_title}
        </span>
        <span class="protocol-card-id" aria-hidden="true">
          {protocol_name}
        </span>
      </div>
      <Show when={learning_goal_hook}>
        <p class="protocol-card-hook" data-launcher-link-description>
          {learning_goal_hook}
        </p>
      </Show>
      <div class="protocol-card-meta">
        <span class="protocol-card-steps" data-launcher-step-count>
          {step_count} steps
        </span>
        <Show when={estimated_seconds !== undefined}>
          <span class="protocol-card-eta" data-launcher-eta>
            ~{estimated_seconds}s
          </span>
        </Show>
      </div>
    </a>
  );
}

function renderCluster(group: ClusterGroup): JSXElement {
  return (
    <section class="cluster-section" data-cluster={group.cluster_key}>
      <h3 class="cluster-heading">{group.cluster_label}</h3>
      <div class="protocol-card-grid" data-launcher-list>
        <For each={group.entries}>{renderEntry}</For>
      </div>
    </section>
  );
}

export function Launcher(props: LauncherProps): JSXElement {
  // Partition into sequence runners (top) and mini-protocols (bottom).
  const runners: ProtocolIndexSlimEntry[] = [];
  const minis: ProtocolIndexSlimEntry[] = [];
  for (const entry of props.index) {
    if (entry.protocol_type === "sequence_runner") {
      runners.push(entry);
    } else if (entry.protocol_type === "mini_protocol") {
      minis.push(entry);
    }
    // dev_smoke not in slim index; ignore silently.
  }
  const runners_sorted = runners
    .slice()
    .sort((a, b) => a.protocol_name.localeCompare(b.protocol_name));
  const mini_groups = groupByCluster(minis);

  return (
    <div class="launcher-root" data-launcher-root>
      <header class="launcher-header">
        <h1 class="launcher-title" data-launcher-title>
          Virtual Lab Protocols
        </h1>
        <p class="launcher-subtitle">Interactive mini-protocols and full sequence runners.</p>
      </header>
      <main class="launcher-main">
        <Show when={runners_sorted.length > 0}>
          <section class="launcher-tier launcher-tier-runners" data-launcher-tier="runners">
            <h2 class="tier-heading">Full protocols</h2>
            <div class="protocol-card-grid protocol-card-grid-runners" data-launcher-list="runners">
              <For each={runners_sorted}>{renderEntry}</For>
            </div>
          </section>
        </Show>
        <Show when={mini_groups.length > 0}>
          <section class="launcher-tier launcher-tier-minis" data-launcher-tier="minis">
            <h2 class="tier-heading">Mini-protocols</h2>
            <For each={mini_groups}>{renderCluster}</For>
          </section>
        </Show>
      </main>
    </div>
  );
}
