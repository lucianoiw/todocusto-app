import Link from "next/link";
import { getSuppliers } from "@/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconPlus } from "@tabler/icons-react";
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
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum fornecedor cadastrado ainda.
            </p>
            <Button asChild>
              <Link href={`/${workspaceSlug}/suppliers/new`}>
                <IconPlus className="w-4 h-4 mr-2" />
                Criar primeiro fornecedor
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : suppliers.length === 0 && hasFilters ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum fornecedor encontrado com os filtros aplicados.
            </p>
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
