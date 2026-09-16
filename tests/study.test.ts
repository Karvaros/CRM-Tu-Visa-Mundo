import assert from "node:assert/strict";
import test from "node:test";
import { classifyStudy, studyOptions, type StudyAnswers } from "../lib/study";

const base: StudyAnswers = {
  destino: studyOptions.destino[0],
  grupo: studyOptions.grupo[0],
  solicitud: studyOptions.solicitud[0],
  pasaportes: studyOptions.pasaportes[0],
  ocupacion: studyOptions.ocupacion[0],
  visaAnterior: studyOptions.visaAnterior[0],
  viajes: studyOptions.viajes[0],
  cumplimiento: studyOptions.cumplimiento[2],
  lazos: studyOptions.lazos[1],
};

test("reconstruye las rutas observadas de primera vez y renovación", () => {
  assert.equal(classifyStudy(base).perfil, "A");
  assert.equal(classifyStudy(base).crm.segmento, "ESTUDIO_A");
  assert.equal(classifyStudy(base).correo, "PERFIL_ALTO_PRIMERA_VEZ");
  assert.equal(classifyStudy({ ...base, solicitud: "Renovación" }).perfil, "A");
  assert.equal(classifyStudy({ ...base, visaAnterior: "No he tenido visa" }).perfil, "B");
  assert.equal(classifyStudy({ ...base, visaAnterior: "No he tenido visa", viajes: "No: No ha salido del país" }).perfil, "C");
});

test("las condiciones Bajo prevalecen y D no se trata como A por renovación", () => {
  assert.equal(classifyStudy({ ...base, solicitud: "Renovación", pasaportes: "Ninguno tiene pasaporte vigente" }).perfil, "D");
  assert.equal(classifyStudy({ ...base, cumplimiento: "He permanecido en un país más del tiempo permitido" }).perfil, "D");
  assert.equal(classifyStudy({ ...base, ocupacion: "Desempleado / Informal" }).perfil, "D");
  assert.equal(classifyStudy({ ...base, ocupacion: "Desempleado / Informal" }).crm.estado, "NO_APTO");
});

test("no inventa clasificación para respuestas incompletas o cruces sin ruta", () => {
  assert.equal(classifyStudy({ ...base, destino: undefined }).perfil, "PENDIENTE");
  const result = classifyStudy({ ...base, viajes: "Sí: Solo países de Latinoamérica" });
  assert.equal(result.perfil, "PENDIENTE");
  assert.equal(result.correo, null);
});
