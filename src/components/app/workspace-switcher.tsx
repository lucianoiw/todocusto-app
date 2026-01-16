"use client";

import * as React from "react";
import Link from "next/link";
import { IconBuilding, IconChevronDown, IconPlus, IconCheck } from "@tabler/icons-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace;
}

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspace,
}: WorkspaceSwitcherProps) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <IconBuilding className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {currentWorkspace.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">Negócio</span>
              </div>
              <IconChevronDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Negócios
            </DropdownMenuLabel>
            {workspaces.map((workspace, index) => (
              <DropdownMenuItem
                key={workspace.id}
                asChild
                className="gap-2 p-2"
                onClick={() => setOpenMobile(false)}
              >
                <Link href={`/${workspace.slug}`}>
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    <IconBuilding className="size-4 shrink-0" />
                  </div>
                  <span className="flex-1">{workspace.name}</span>
                  {workspace.id === currentWorkspace.id && (
                    <IconCheck className="size-4 ml-auto" />
                  )}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 p-2">
              <Link href="/new" onClick={() => setOpenMobile(false)}>
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <IconPlus className="size-4" />
                </div>
                <span className="font-medium text-muted-foreground">
                  Criar negócio
                </span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
