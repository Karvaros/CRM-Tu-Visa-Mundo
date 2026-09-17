import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Estudio de Perfil | Tu Visa Mundo",
  description: "Realiza tu Estudio de Perfil gratuito para visa de turismo, una pregunta a la vez.",
};

export default function StudyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

