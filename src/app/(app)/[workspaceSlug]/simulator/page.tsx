import Link from "next/link";
import { IconChartLine, IconBox, IconPlus } from "@tabler/icons-react";
import { getIngredientsForSimulation } from "@/actions/simulator";
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
import { SimulatorForm } from "./simulator-form";

interface SimulatorPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function SimulatorPage({ params }: SimulatorPageProps) {
  const { workspaceSlug } = await params;
  const ingredients = await getIngredientsForSimulation(workspaceSlug);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <IconChartLine className="h-6 w-6" />
          Simulador de Preços
        </h1>
        <p className="text-muted-foreground mt-1">
          Simule o impacto de mudanças de preço nos seus custos
        </p>
      </div>

      {ingredients.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconBox className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Cadastre insumos para usar o simulador</EmptyTitle>
                <EmptyDescription>
                  Quando você altera o custo de um insumo, pode usar o simulador
                  para ver o impacto dessa mudança em seus cardápios, entendendo
                  se precisa ou não ajustar os preços dos produtos.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild>
                  <Link href={`/${workspaceSlug}/ingredients/new`}>
                    <IconPlus className="w-4 h-4" />
                    Cadastrar primeiro insumo
                  </Link>
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <SimulatorForm workspaceSlug={workspaceSlug} ingredients={ingredients} />
      )}
    </div>
  );
}
