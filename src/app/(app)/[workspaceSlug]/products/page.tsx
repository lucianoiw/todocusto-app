import Link from "next/link";
import { getProducts } from "@/actions/products";
import { getCategories } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconPlus } from "@tabler/icons-react";
import { ProductsTable } from "./products-table";
import { ProductsFilters } from "./products-filters";
import { ProductsPagination } from "./products-pagination";

interface ProductsPageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { workspaceSlug } = await params;
  const search = await searchParams;

  const [result, categories] = await Promise.all([
    getProducts(workspaceSlug, {
      search: search.search,
      categoryId: search.category,
      status: search.status as "active" | "inactive" | undefined,
      page: search.page ? parseInt(search.page) : 1,
      perPage: 15,
    }),
    getCategories(workspaceSlug, "product"),
  ]);

  const { products, pagination } = result;
  const hasFilters = search.search || search.category || search.status;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie os produtos vendáveis do seu negócio
          </p>
        </div>
        <Button asChild>
          <Link href={`/${workspaceSlug}/products/new`}>
            <IconPlus className="w-4 h-4 mr-2" />
            Novo Produto
          </Link>
        </Button>
      </div>

      <div className="mb-4">
        <ProductsFilters
          workspaceSlug={workspaceSlug}
          categories={categories}
        />
      </div>

      {products.length === 0 && !hasFilters ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum produto cadastrado ainda.
            </p>
            <Button asChild>
              <Link href={`/${workspaceSlug}/products/new`}>
                <IconPlus className="w-4 h-4 mr-2" />
                Criar primeiro produto
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : products.length === 0 && hasFilters ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum produto encontrado com os filtros aplicados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ProductsTable
              workspaceSlug={workspaceSlug}
              products={products}
            />
            <ProductsPagination
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
