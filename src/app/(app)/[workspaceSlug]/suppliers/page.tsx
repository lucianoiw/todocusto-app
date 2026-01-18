import Link from "next/link";
import { getSuppliers } from "@/actions/suppliers";
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
import { IconPlus, IconTruck } from "@tabler/icons-react";
import { SuppliersTable } from "./suppliers-table";
import { SuppliersFilters } from "./suppliers-filters";
import { SuppliersPagination } from "./suppliers-pagination";

interface SuppliersPageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function SuppliersPage({ params, searchParams }: SuppliersPageProps) {
  const { workspaceSlug } = await params;
  const search = await searchParams;

  const result = await getSuppliers(workspaceSlug, {
    search: search.search,
    page: search.page ? parseInt(search.page) : 1,
    perPage: 15,
  });

  const { suppliers, pagination } = result;
  const hasFilters = !!search.search;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Fornecedores</h1>
          <p className="text-muted-foreground">
            Gerencie seus fornecedores e contatos
          </p>
        </div>
        <Button asChild>
          <Link href={`/${workspaceSlug}/suppliers/new`}>
            <IconPlus className="w-4 h-4 mr-2" />
            Novo Fornecedor
          </Link>
        </Button>
      </div>

      <div className="mb-4">
        <SuppliersFilters workspaceSlug={workspaceSlug} />
      </div>

      {suppliers.length === 0 && !hasFilters ? (
        <Card>
          <CardContent className="py-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconTruck className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Nenhum fornecedor cadastrado</EmptyTitle>
                <EmptyDescription>
                  Cadastre seus fornecedores para organizar contatos, comparar preços
                  e identificar onde comprou mais barato ou mais caro cada insumo.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild>
                  <Link href={`/${workspaceSlug}/suppliers/new`}>
                    <IconPlus className="w-4 h-4" />
                    Cadastrar primeiro fornecedor
                  </Link>
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : suppliers.length === 0 && hasFilters ? (
        <Card>
          <CardContent className="py-8">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nenhum fornecedor encontrado</EmptyTitle>
                <EmptyDescription>
                  Tente ajustar os filtros para encontrar o que procura.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <SuppliersTable
              workspaceSlug={workspaceSlug}
              suppliers={suppliers}
            />
            <SuppliersPagination
              workspaceSlug={workspaceSlug}
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              perPage={pagination.perPage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
