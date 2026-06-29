"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Video, Pencil, X, Users } from "lucide-react";
import VideoCallPanel from "./video-call-panel";
import Whiteboard from "./whiteboard";
import CollaboratorsPresence from "./collaborators-presence";
import type { Collaborator } from "../types";

interface CollaborationPanelProps {
  roomId: string;
  open: boolean;
  onClose: () => void;
  enabled: boolean;
  collaborators: Collaborator[];
  isConnected: boolean;
}

/**
 * Slide-over drawer that houses the real-time collaboration tools (video call
 * and shared whiteboard) plus a presence summary. Kept out of the resizable
 * editor/preview layout so it never disrupts the coding surface.
 */
export default function CollaborationPanel({
  roomId,
  open,
  onClose,
  enabled,
  collaborators,
  isConnected,
}: CollaborationPanelProps) {
  if (!open) return null;

  return (
    <div className="absolute right-0 top-0 z-40 flex h-full w-[360px] flex-col border-l bg-background shadow-xl">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Users className="h-4 w-4" />
        <span className="text-sm font-medium">Collaborate</span>
        <div className="ml-auto flex items-center gap-2">
          <CollaboratorsPresence
            collaborators={collaborators}
            isConnected={isConnected}
            max={4}
          />
          <Button size="icon" variant="ghost" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="call" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="m-2 grid grid-cols-2">
          <TabsTrigger value="call">
            <Video className="mr-2 h-4 w-4" /> Call
          </TabsTrigger>
          <TabsTrigger value="board">
            <Pencil className="mr-2 h-4 w-4" /> Board
          </TabsTrigger>
        </TabsList>
        <TabsContent value="call" className="flex-1 overflow-hidden">
          <VideoCallPanel roomId={roomId} enabled={enabled} />
        </TabsContent>
        <TabsContent value="board" className="flex-1 overflow-hidden">
          <Whiteboard roomId={roomId} enabled={enabled} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
