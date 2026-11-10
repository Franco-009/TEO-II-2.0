import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "../StatusBadge";
import { SemanticAlert } from "../SemanticAlert";

describe("Componentes semánticos accesibles (Verde, Rojo, Ámbar + Texto)", () => {
  it("renderiza StatusBadge con etiqueta de texto visible para acierto, error y advertencia", () => {
    render(
      <div>
        <StatusBadge variant="success" label="Acierto verificado" />
        <StatusBadge variant="error" label="Respuesta incorrecta" />
        <StatusBadge variant="warning" label="Borrador en edición" />
      </div>
    );

    expect(screen.getByText("Acierto verificado")).toBeInTheDocument();
    expect(screen.getByText("Respuesta incorrecta")).toBeInTheDocument();
    expect(screen.getByText("Borrador en edición")).toBeInTheDocument();
  });

  it("renderiza SemanticAlert con rol accesible y etiqueta de estado explícita", () => {
    render(
      <SemanticAlert
        variant="error"
        title="Fallo en la pregunta"
        description="Revisa la explicación general del tema."
      />
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText(/Estado: Error/i)).toBeInTheDocument();
    expect(screen.getByText("Fallo en la pregunta")).toBeInTheDocument();
  });
});
