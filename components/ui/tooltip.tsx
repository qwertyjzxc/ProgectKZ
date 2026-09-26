"use client";

// Заглушки API тултипов: в приложении тултипы нигде не используются
// (только провайдер в layout), base-ui/tooltip выкинут из бандла.
import * as React from "react";

import { cn } from "@/lib/utils";

function TooltipProvider({
  children,
}: {
  delay?: number;
  children?: React.ReactNode;
}) {
  return <>{children}</>;
}

function Tooltip({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function TooltipTrigger({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function TooltipContent({
  className,
  children,
}: {
  className?: string;
  side?: string;
  sideOffset?: number;
  align?: string;
  alignOffset?: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      data-slot="tooltip-content"
      className={cn(
        "z-50 inline-flex w-fit max-w-xs items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background",
        className
      )}
    >
      {children}
    </div>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
