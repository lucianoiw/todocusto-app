import Link from "next/link";
import { getMenus } from "@/actions/menus";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { IconPlus, IconClipboardList } from "@tabler/icons-react";
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
          <CardContent className="py-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconClipboardList className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Nenhum cardápio cadastrado</EmptyTitle>
                <EmptyDescription>
                  Cardápios reúnem seus produtos com preços de venda. Aqui você configura
                  taxas (maquininha, iFood, impostos), custos de embalagem, rateio de
                  custos fixos e margem de lucro. A margem pode ser personalizada por produto.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild>
                  <Link href={`/${workspaceSlug}/menus/new`}>
                    <IconPlus className="w-4 h-4" />
                    Criar primeiro cardápio
                  </Link>
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : menus.length === 0 && hasFilters ? (
        <Card>
          <CardContent className="py-8">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nenhum cardápio encontrado</EmptyTitle>
                <EmptyDescription>
                  Tente ajustar os filtros para encontrar o que procura.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
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
