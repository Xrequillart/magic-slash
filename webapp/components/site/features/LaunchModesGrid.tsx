"use client";

import { Eye, Pencil, ShieldCheck, ShieldOff, Zap } from "lucide-react";
import type { MessageKey } from "@/lib/i18n";
import { FeatureLegend, LegendTile } from "./FeatureLegend";

/**
 * The visual under "How far an agent may go": the five launch modes, two to a row, and
 * nothing else — no window, because the setting is one `<select>` in the Claude Code
 * tab and a drawing of a closed select would show one mode out of five.
 *
 * THE FIVE ARE `LAUNCH_MODE_OPTIONS` in `desktop/src/renderer/pages/Config/index.tsx`, in
 * that order — the order is a scale, from the mode that changes nothing to the one that
 * asks nothing — and each description is the app's own help line for that option, from
 * `settings.launchMode.<mode>.help` in `desktop/src/i18n/`. Nothing here is a
 * paraphrase: what the site promises a mode does is what the app says it does.
 *
 * `FeatureLegend` because it is the shape asked for — two to a row, one closed box — and
 * because these ARE a legend of a kind: five states of one control. The glyphs are the
 * scale made visible: an eye that only looks, a shield that asks, a pencil that edits,
 * a bolt that runs, a struck shield that checks nothing.
 *
 * `-mt-8`: the block renderer puts `mt-8` above every visual and the legend carries its
 * own `mt-8` for the drawing it usually sits under. Here there is no drawing, so one of
 * the two margins is cancelled and the grid sits where a picture would have.
 */
const MODES: readonly {
  id: string;
  icon: typeof Eye;
  name: MessageKey;
  description: MessageKey;
}[] = [
  { id: "plan", icon: Eye, name: "site.launchModes.plan", description: "site.launchModes.planHelp" },
  { id: "default", icon: ShieldCheck, name: "site.launchModes.default", description: "site.launchModes.defaultHelp" },
  { id: "acceptEdits", icon: Pencil, name: "site.launchModes.acceptEdits", description: "site.launchModes.acceptEditsHelp" },
  { id: "auto", icon: Zap, name: "site.launchModes.auto", description: "site.launchModes.autoHelp" },
  { id: "bypass", icon: ShieldOff, name: "site.launchModes.bypass", description: "site.launchModes.bypassHelp" },
];

export function LaunchModesGrid() {
  return (
    <div className="-mt-8">
      <FeatureLegend
        items={MODES.map((mode) => ({
          id: mode.id,
          mark: (
            <LegendTile tone="bg-accent/10 text-accent">
              <mode.icon className="h-4 w-4" />
            </LegendTile>
          ),
          name: mode.name,
          description: mode.description,
        }))}
      />
    </div>
  );
}
