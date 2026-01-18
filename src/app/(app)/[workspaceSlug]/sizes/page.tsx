import Link from "next/link";
import { getSizeGroups } from "@/actions/sizes";
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
import { IconPlus, IconResize } from "@tabler/icons-react";
import { SizeGroupsTable } from "./size-groups-table";

interface SizesPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function SizesPage({ params }: SizesPageProps) {
  const { workspaceSlug } = await params;
  const sizeGroups = await getSizeGroups(workspaceSlug);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Grupos de Tamanhos</h1>
          <p className="text-muted-foreground">
            Configure tamanhos para seus produtos (ex: P, M, G para pizzas)
          </p>
        </div>
        <Button asChild>
          <Link href={`/${workspaceSlug}/sizes/new`}>
            <IconPlus className="w-4 h-4 mr-2" />
            Novo Grupo
          </Link>
        </Button>
      </div>

      {sizeGroups.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconResize className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Nenhum grupo de tamanhos cadastrado</EmptyTitle>
                <EmptyDescription>
                  Grupos de tamanhos permitem criar variações de produtos automaticamente.
                  Por exemplo: pizzas (P, M, G), açaí (300ml, 500ml, 700ml) ou
                  marmitas (pequena, média, grande). Cada tamanho terá seu próprio
                  custo e preço de venda.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild>
                  <Link href={`/${workspaceSlug}/sizes/new`}>
                    <IconPlus className="w-4 h-4" />
                    Criar primeiro grupo
                  </Link>
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <IconResize className="w-5 h-5" />
              Grupos de Tamanhos
              <span className="text-sm font-normal text-muted-foreground">
                ({sizeGroups.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <SizeGroupsTable
              workspaceSlug={workspaceSlug}
              sizeGroups={sizeGroups}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
