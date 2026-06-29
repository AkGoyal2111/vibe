"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Collaborator } from "../types";

interface CollaboratorsPresenceProps {
  collaborators: Collaborator[];
  isConnected: boolean;
  /** Cap how many avatars are shown before collapsing into a "+N" badge. */
  max?: number;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Overlapping avatar stack showing who is currently in the playground, with a
 * live connection dot and per-user colour rings.
 */
export default function CollaboratorsPresence({
  collaborators,
  isConnected,
  max = 5,
}: CollaboratorsPresenceProps) {
  if (!collaborators.length) return null;

  const visible = collaborators.slice(0, max);
  const overflow = collaborators.length - visible.length;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2 w-2 rounded-full ${
          isConnected ? "bg-green-500" : "bg-gray-400"
        }`}
        title={isConnected ? "Live" : "Disconnected"}
      />
      <TooltipProvider delayDuration={150}>
        <div className="flex -space-x-2">
          {visible.map((c) => (
            <Tooltip key={c.socketId}>
              <TooltipTrigger asChild>
                <Avatar
                  className="h-7 w-7 border-2"
                  style={{ borderColor: c.color }}
                >
                  {c.image ? (
                    <AvatarImage src={c.image} alt={c.name} />
                  ) : null}
                  <AvatarFallback
                    className="text-xs font-medium text-white"
                    style={{ backgroundColor: c.color }}
                  >
                    {initials(c.name || "?")}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{c.name}</p>
                {c.activeFileName ? (
                  <p className="text-xs text-muted-foreground">
                    editing {c.activeFileName}
                  </p>
                ) : null}
              </TooltipContent>
            </Tooltip>
          ))}
          {overflow > 0 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
              +{overflow}
            </div>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
