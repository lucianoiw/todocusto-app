import Link from "next/link";
import { getUnits, MeasurementType } from "@/actions/units";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconPlus } from "@tabler/icons-react";
import { UnitsTable } from "./units-table";
import { UnitsFilters } from "./units-filters";

interface UnitsPageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

const measurementTypeLabels = {
  weight: "Peso",
  volume: "Líquido",
  unit: "Unidade",
};

const baseUnitLabels = {
  weight: "g",
  volume: "ml",
  unit: "un",
};

export default async function UnitsPage({ params, searchParams }: UnitsPageProps) {
  const { workspaceSlug } = await params;
  const search = await searchParams;

  const result = await getUnits(workspaceSlug, {
    search: search.search,
    measurementType: search.type as MeasurementType | undefined,
  });

  const hasFilters = search.search || search.type;
  const showAll = !search.type;

  const groupedUnits = [
    { title: "Peso", items: result.weight, type: "weight" as const },
    { title: "Líquido", items: result.volume, type: "volume" as const },
    { title: "Unidade", items: result.unit, type: "unit" as const },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Unidades</h1>
          <p className="text-muted-foreground">
            Gerencie as unidades de medida do seu negócio
          </p>
        </div>
        <Button asChild>
          <Link href={`/${workspaceSlug}/units/new`}>
            <IconPlus className="w-4 h-4 mr-2" />
            Nova Unidade
          </Link>
        </Button>
      </div>

      <div className="mb-4">
        <UnitsFilters workspaceSlug={workspaceSlug} />
      </div>

      {result.all.length === 0 && !hasFilters ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhuma unidade cadastrada ainda.
            </p>
            <Button asChild>
              <Link href={`/${workspaceSlug}/units/new`}>
                <IconPlus className="w-4 h-4 mr-2" />
                Criar primeira unidade
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : result.all.length === 0 && hasFilters ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhuma unidade encontrada com os filtros aplicados.
            </p>
          </CardContent>
        </Card>
      ) : showAll ? (
        <div className="space-y-6">
          {groupedUnits.map((group) => (
            group.items.length > 0 && (
              <Card key={group.type}>
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {group.title}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({group.items.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <UnitsTable
                    workspaceSlug={workspaceSlug}
                    units={group.items}
                    baseUnitLabel={baseUnitLabels[group.type]}
                  />
                </CardContent>
              </Card>
            )
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg flex items-center gap-2">
              {measurementTypeLabels[search.type as MeasurementType]}
              <span className="text-sm font-normal text-muted-foreground">
                ({result.all.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <UnitsTable
              workspaceSlug={workspaceSlug}
              units={result.all}
              baseUnitLabel={baseUnitLabels[search.type as MeasurementType]}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
