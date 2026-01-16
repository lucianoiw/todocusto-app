import Link from "next/link";
import { getMenus } from "@/actions/menus";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconPlus } from "@tabler/icons-react";
import { MenusTable } from "./menus-table";
import { MenusFilters } from "./menus-filters";
import { MenusPagination } from "./menus-pagination";

interface MenusPageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function MenusPage({ params, searchParams }: MenusPageProps) {
  const { workspaceSlug } = await params;
  const search = await searchParams;

  const result = await getMenus(workspaceSlug, {
    search: search.search,
    status: search.status as "active" | "inactive" | undefined,
    page: search.page ? parseInt(search.page) : 1,
    perPage: 15,
  });

  const { menus, pagination } = result;
  const hasFilters = search.search || search.status;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cardápios</h1>
          <p className="text-muted-foreground">
            Gerencie seus cardápios com preços de venda e margens
          </p>
        </div>
        <Button asChild>
          <Link href={`/${workspaceSlug}/menus/new`}>
            <IconPlus className="w-4 h-4 mr-2" />
            Novo Cardápio
          </Link>
        </Button>
      </div>

      <div className="mb-4">
        <MenusFilters workspaceSlug={workspaceSlug} />
      </div>

      {menus.length === 0 && !hasFilters ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum cardápio cadastrado ainda.
            </p>
            <Button asChild>
              <Link href={`/${workspaceSlug}/menus/new`}>
                <IconPlus className="w-4 h-4 mr-2" />
                Criar primeiro cardápio
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : menus.length === 0 && hasFilters ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum cardápio encontrado com os filtros aplicados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <MenusTable
            workspaceSlug={workspaceSlug}
            menus={menus}
          />
          <MenusPagination
            workspaceSlug={workspaceSlug}
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            perPage={pagination.perPage}
          />
        </>
      )}
    </div>
  );
}
