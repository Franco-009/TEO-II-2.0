import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { CreateSubjectForm } from "@/features/subjects/components/CreateSubjectForm";

export default function NewSubjectPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        breadcrumbs={[
          { label: "Mis Materias", href: "/app/subjects" },
          { label: "Nueva Materia" },
        ]}
        title="Crear Materia Privada"
        description="Define el nombre, descripción y estado inicial de tu nueva materia de estudio."
      />

      <Card elevated className="p-6 space-y-5">
        <CreateSubjectForm />
      </Card>
    </div>
  );
}
