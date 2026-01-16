"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconRuler,
  IconTags,
  IconBox,
  IconToolsKitchen2,
  IconPackage,
  IconReceipt,
  IconCoin,
  IconTruck,
  IconSettings,
} from "@tabler/icons-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { NavUser } from "./nav-user";

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface AppSidebarProps {
  workspaceSlug: string;
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  user: User;
}

const mainNav = [
  { name: "Início", href: "", icon: IconHome },
  { name: "Insumos", href: "/ingredients", icon: IconBox },
  { name: "Receitas", href: "/recipes", icon: IconToolsKitchen2 },
  { name: "Produtos", href: "/products", icon: IconPackage },
  { name: "Custos Fixos", href: "/fixed-costs", icon: IconCoin },
  { name: "Cardápios", href: "/menus", icon: IconReceipt },
];

const settingsNav = [
  { name: "Fornecedores", href: "/suppliers", icon: IconTruck },
  { name: "Unidades", href: "/units", icon: IconRuler },
  { name: "Categorias", href: "/categories", icon: IconTags },
  { name: "Configurações", href: "/settings", icon: IconSettings },
];

export function AppSidebar({
  workspaceSlug,
  workspaces,
  currentWorkspace,
  user,
}: AppSidebarProps) {
  const pathname = usePathname();
  const basePath = `/${workspaceSlug}`;
  const { setOpenMobile } = useSidebar();

  const handleNavigate = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => {
                const href = `${basePath}${item.href}`;
                const isActive =
                  item.href === ""
                    ? pathname === basePath
                    : pathname.startsWith(href);

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      onClick={handleNavigate}
                      tooltip={item.name}
                    >
                      <Link href={href}>
                        <item.icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Configurações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNav.map((item) => {
                const href = `${basePath}${item.href}`;
                const isActive = pathname.startsWith(href);

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      onClick={handleNavigate}
                      tooltip={item.name}
                    >
                      <Link href={href}>
                        <item.icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
