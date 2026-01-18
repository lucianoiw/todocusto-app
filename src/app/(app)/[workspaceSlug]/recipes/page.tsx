import Link from "next/link";
import { getRecipes } from "@/actions/recipes";
import { getCategories } from "@/actions/categories";
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
import { IconPlus, IconToolsKitchen2 } from "@tabler/icons-react";
import { RecipesTable } from "./recipes-table";
import { RecipesFilters } from "./recipes-filters";
import { RecipesPagination } from "./recipes-pagination";

interface RecipesPageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function RecipesPage({ params, searchParams }: RecipesPageProps) {
  const { workspaceSlug } = await params;
  const search = await searchParams;

  const [result, categories] = await Promise.all([
    getRecipes(workspaceSlug, {
      search: search.search,
      categoryId: search.category,
      page: search.page ? parseInt(search.page) : 1,
      perPage: 15,
    }),
    getCategories(workspaceSlug, "recipe"),
  ]);

  const { recipes, pagination } = result;
  const hasFilters = search.search || search.category;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Receitas</h1>
          <p className="text-muted-foreground">
            Crie receitas combinando ingredientes e calcule o custo
          </p>
        </div>
        <Button asChild>
          <Link href={`/${workspaceSlug}/recipes/new`}>
            <IconPlus className="w-4 h-4 mr-2" />
            Nova Receita
          </Link>
        </Button>
      </div>

      <div className="mb-4">
        <RecipesFilters
          workspaceSlug={workspaceSlug}
          categories={categories}
        />
      </div>

      {recipes.length === 0 && !hasFilters ? (
        <Card>
          <CardContent className="py-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconToolsKitchen2 className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Nenhuma receita cadastrada</EmptyTitle>
                <EmptyDescription>
                  Receitas são preparações que combinam insumos ou outras receitas para
                  calcular o custo automaticamente. Uma receita pode ser usada como
                  componente de um produto ou vendida diretamente no cardápio.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild>
                  <Link href={`/${workspaceSlug}/recipes/new`}>
                    <IconPlus className="w-4 h-4" />
                    Cadastrar primeira receita
                  </Link>
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : recipes.length === 0 && hasFilters ? (
        <Card>
          <CardContent className="py-8">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nenhuma receita encontrada</EmptyTitle>
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
            <RecipesTable
              workspaceSlug={workspaceSlug}
              recipes={recipes}
            />
            <RecipesPagination
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
