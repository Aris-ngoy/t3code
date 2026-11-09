import type { EnvironmentId, GitStash } from "@t3tools/contracts";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Spinner } from "~/components/ui/spinner";
import { toastManager } from "~/components/ui/toast";
import { useEnvironmentQuery } from "~/state/query";
import { useGitStashAction } from "~/state/sourceControlActions";
import { vcsEnvironment } from "~/state/vcs";
import { formatRelativeTimeLabel } from "~/timestampFormat";

interface GitStashesDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly environmentId: EnvironmentId | null;
  readonly gitCwd: string;
}

function filterStashes(stashes: ReadonlyArray<GitStash>, query: string) {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return stashes;
  return stashes.filter(
    (stash) =>
      stash.message.toLowerCase().includes(needle) ||
      (stash.refName?.toLowerCase().includes(needle) ?? false),
  );
}

export function GitStashesDialog(props: GitStashesDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Git stashes</DialogTitle>
          <DialogDescription>
            Stashes are shared by every worktree of this repository.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so each opening reads the list and starts a fresh search. */}
        {props.open ? <GitStashesPanel {...props} /> : null}
      </DialogPopup>
    </Dialog>
  );
}

function GitStashesPanel(props: GitStashesDialogProps) {
  const stashesQuery = useEnvironmentQuery(
    props.environmentId === null
      ? null
      : vcsEnvironment.stashes({
          environmentId: props.environmentId,
          input: { cwd: props.gitCwd },
        }),
  );
  const stashAction = useGitStashAction({ environmentId: props.environmentId, cwd: props.gitCwd });
  const [query, setQuery] = useState("");
  const [pendingDrop, setPendingDrop] = useState<GitStash | null>(null);
  const stashes = stashesQuery.data?.stashes ?? null;
  const visible = stashes === null ? [] : filterStashes(stashes, query);
  const busy = !stashAction.isAllowed || stashAction.isPending;

  const run = async (stash: GitStash, action: "apply" | "drop") => {
    const result = await stashAction.run({ action, sha: stash.sha });
    if (result._tag === "Success") {
      if (action === "apply") {
        toastManager.add({ type: "success", title: "Stash applied", description: stash.message });
        props.onOpenChange(false);
      } else {
        stashesQuery.refresh();
      }
      return;
    }
    if (isAtomCommandInterrupted(result)) return;
    const error = squashAtomCommandFailure(result);
    toastManager.add({
      type: "error",
      title: action === "apply" ? "Could not apply stash" : "Could not drop stash",
      description: error instanceof Error ? error.message : "An error occurred.",
    });
  };

  return (
    <DialogPanel>
      <Input
        aria-label="Search stashes"
        placeholder="Search by message or branch"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="mt-3 h-64 rounded-lg bg-card ring-1 ring-black/5 dark:bg-white/[0.025] dark:ring-white/5">
        {stashesQuery.error ? (
          <p className="p-3 text-sm text-destructive">{stashesQuery.error}</p>
        ) : stashes === null ? (
          <div className="flex h-full items-center justify-center">
            <Spinner aria-label="Loading stashes" />
          </div>
        ) : visible.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            {stashes.length === 0 ? "No stashes." : "No stashes match."}
          </p>
        ) : (
          <ScrollArea>
            <ul className="space-y-1 p-1">
              {visible.map((stash) => (
                <li
                  key={stash.sha}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{stash.message || "(no message)"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {stash.refName ?? "detached HEAD"} ·{" "}
                      {formatRelativeTimeLabel(stash.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={busy}
                    onClick={() => setPendingDrop(stash)}
                  >
                    Drop
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={busy}
                    onClick={() => void run(stash, "apply")}
                  >
                    Apply
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </div>
      <AlertDialog
        open={pendingDrop !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDrop(null);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Drop this stash?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDrop?.message || "This stash"} will be deleted. Git can only recover it from
              its reflog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" size="sm" />}>
              Cancel
            </AlertDialogClose>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (pendingDrop === null) return;
                setPendingDrop(null);
                void run(pendingDrop, "drop");
              }}
            >
              Drop
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </DialogPanel>
  );
}
