"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";
import {
  IconHome,
  IconRuler,
  IconTags,
  IconCarrot,
  IconToolsKitchen2,
  IconPackage,
  IconReceipt,
  IconCoin,
  IconSettings,
} from "@tabler/icons-react";

interface SidebarProps {
  workspaceSlug: string;
}

const navigation = [
  { name: "Início", href: "", icon: IconHome },
  { name: "Unidades", href: "/units", icon: IconRuler },
  { name: "Categorias", href: "/categories", icon: IconTags },
  { name: "Ingredientes", href: "/ingredients", icon: IconCarrot },
  { name: "Receitas", href: "/recipes", icon: IconToolsKitchen2 },
  { name: "Produtos", href: "/products", icon: IconPackage },
  { name: "Cardápios", href: "/menus", icon: IconReceipt },
  { name: "Custos Fixos", href: "/fixed-costs", icon: IconCoin },
];

const settingsNav = [
  { name: "Configurações", href: "/settings", icon: IconSettings },
];

export function Sidebar({ workspaceSlug }: SidebarProps) {
  const pathname = usePathname();
  const basePath = `/${workspaceSlug}`;

  return (
    <aside className="w-64 min-h-[calc(100vh-65px)] bg-white border-r">
      <nav className="p-4 space-y-1">
        {navigation.map((item) => {
          const href = `${basePath}${item.href}`;
          const isActive =
            item.href === ""
              ? pathname === basePath
              : pathname.startsWith(href);

          return (
            <Link
              key={item.name}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t">
          {settingsNav.map((item) => {
            const href = `${basePath}${item.href}`;
            const isActive = pathname.startsWith(href);

            return (
              <Link
                key={item.name}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
