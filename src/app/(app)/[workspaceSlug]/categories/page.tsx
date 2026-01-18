import Link from "next/link";
import { getAllCategories, CategoryType } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { IconPlus, IconBox, IconToolsKitchen2, IconPackage, IconCategory } from "@tabler/icons-react";
import { CategoriesTable } from "./categories-table";
import { CategoriesFilters } from "./categories-filters";

interface CategoriesPageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const typeLabels = {
  ingredient: { label: "Insumos", icon: IconBox },
  recipe: { label: "Receitas", icon: IconToolsKitchen2 },
  product: { label: "Produtos", icon: IconPackage },
};

export default async function CategoriesPage({ params, searchParams }: CategoriesPageProps) {
  const { workspaceSlug } = await params;
  const search = await searchParams;

  const result = await getAllCategories(workspaceSlug, {
    search: search.search,
    type: search.type as CategoryType | undefined,
  });

  const hasFilters = search.search || search.type;
  const showAll = !search.type;

  const groupedCategories = [
    { title: "Insumos", items: result.ingredient, type: "ingredient" as const },
    { title: "Receitas", items: result.recipe, type: "recipe" as const },
    { title: "Produtos", items: result.product, type: "product" as const },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Categorias</h1>
          <p className="text-muted-foreground">
            Organize seus insumos, receitas e produtos em categorias
          </p>
        </div>
        <Button asChild>
          <Link href={`/${workspaceSlug}/categories/new`}>
            <IconPlus className="w-4 h-4 mr-2" />
            Nova Categoria
          </Link>
        </Button>
      </div>

      <div className="mb-4">
        <CategoriesFilters workspaceSlug={workspaceSlug} />
      </div>

      {result.all.length === 0 && !hasFilters ? (
        <Card>
          <CardContent className="py-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconCategory className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Nenhuma categoria cadastrada</EmptyTitle>
                <EmptyDescription>
                  Categorias ajudam a organizar seus insumos, receitas e produtos.
                  Use cores para identificar visualmente cada categoria nas listagens
                  e facilitar a navegação.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild>
                  <Link href={`/${workspaceSlug}/categories/new`}>
                    <IconPlus className="w-4 h-4" />
                    Criar primeira categoria
                  </Link>
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : result.all.length === 0 && hasFilters ? (
        <Card>
          <CardContent className="py-8">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nenhuma categoria encontrada</EmptyTitle>
                <EmptyDescription>
                  Tente ajustar os filtros para encontrar o que procura.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : showAll ? (
        <div className="space-y-6">
          {groupedCategories.map((group) => {
            const TypeIcon = typeLabels[group.type].icon;
            return (
              <Card key={group.type}>
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TypeIcon className="w-5 h-5" />
                    {group.title}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({group.items.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <CategoriesTable
                    workspaceSlug={workspaceSlug}
                    categories={group.items}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg flex items-center gap-2">
              {(() => {
                const TypeIcon = typeLabels[search.type as CategoryType].icon;
                return <TypeIcon className="w-5 h-5" />;
              })()}
              {typeLabels[search.type as CategoryType].label}
              <span className="text-sm font-normal text-muted-foreground">
                ({result.all.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <CategoriesTable
              workspaceSlug={workspaceSlug}
              categories={result.all}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
