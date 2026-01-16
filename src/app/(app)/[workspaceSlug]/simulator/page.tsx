import { IconChartLine } from "@tabler/icons-react";
import { getIngredientsForSimulation } from "@/actions/simulator";
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

      <SimulatorForm workspaceSlug={workspaceSlug} ingredients={ingredients} />
    </div>
  );
}
