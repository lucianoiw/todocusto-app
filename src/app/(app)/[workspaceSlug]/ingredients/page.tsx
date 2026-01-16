import Link from "next/link";
import { getIngredients } from "@/actions/ingredients";
import { getCategories } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconPlus } from "@tabler/icons-react";
import { IngredientsTable } from "./ingredients-table";
import { IngredientsFilters } from "./ingredients-filters";
import { IngredientsPagination } from "./ingredients-pagination";

interface IngredientsPageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function IngredientsPage({ params, searchParams }: IngredientsPageProps) {
  const { workspaceSlug } = await params;
  const search = await searchParams;

  const [result, categories] = await Promise.all([
    getIngredients(workspaceSlug, {
      search: search.search,
      categoryId: search.category,
      hasVariations: search.tipo as "true" | "false" | undefined,
      page: search.page ? parseInt(search.page) : 1,
      perPage: 15,
    }),
    getCategories(workspaceSlug, "ingredient"),
  ]);

  const { ingredients, pagination } = result;
  const hasFilters = search.search || search.category || search.tipo;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Insumos</h1>
          <p className="text-muted-foreground">
            Gerencie ingredientes, embalagens e materiais
          </p>
        </div>
        <Button asChild>
          <Link href={`/${workspaceSlug}/ingredients/new`}>
            <IconPlus className="w-4 h-4 mr-2" />
            Novo Insumo
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <IngredientsFilters
          workspaceSlug={workspaceSlug}
          categories={categories}
        />
      </div>

      {ingredients.length === 0 && !hasFilters ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum insumo cadastrado ainda.
            </p>
            <Button asChild>
              <Link href={`/${workspaceSlug}/ingredients/new`}>
                <IconPlus className="w-4 h-4 mr-2" />
                Criar primeiro insumo
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : ingredients.length === 0 && hasFilters ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum insumo encontrado com os filtros aplicados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <IngredientsTable
              workspaceSlug={workspaceSlug}
              ingredients={ingredients}
            />
            <IngredientsPagination
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
