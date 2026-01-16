"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

interface HeaderProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

const pageNames: Record<string, string> = {
  "": "Início",
  "ingredients": "Insumos",
  "recipes": "Receitas",
  "products": "Produtos",
  "menus": "Cardápios",
  "suppliers": "Fornecedores",
  "units": "Unidades",
  "categories": "Categorias",
  "fixed-costs": "Custos Fixos",
  "settings": "Configurações",
  "new": "Novo",
  "edit": "Editar",
};

export function Header({ workspace }: HeaderProps) {
  const pathname = usePathname();
  const pathParts = pathname.split("/").filter(Boolean);

  // Remove workspace slug from path
  const relevantParts = pathParts.slice(1);

  // Get the current page name
  const currentPage = relevantParts[0] || "";
  const pageName = pageNames[currentPage] || currentPage;

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{pageName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
