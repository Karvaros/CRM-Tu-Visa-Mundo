import assert from "node:assert/strict";
import test from "node:test";
import { presentStudyQuestion, studyOptions, studyPages, updateStudyAnswer, type StudyAnswers } from "../lib/study";
import { classifyStudy } from "../lib/study-scoring";

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

test("un viajero solo recibe preguntas singulares y nunca la opción de pasaportes mixtos", () => {
  const passport = presentStudyQuestion(studyPages[3], base);
  assert.equal(passport.label, "¿Tienes pasaporte vigente?");
  assert.deepEqual(passport.options.map((option) => option.label), [
    "Sí, tengo pasaporte vigente",
    "No tengo pasaporte vigente",
  ]);
  assert.equal(presentStudyQuestion(studyPages[4], base).label, "¿A qué te dedicas?");
  assert.equal(presentStudyQuestion(studyPages[8], base).label, "¿Tienes familiares directos en el país de destino?");
  assert.equal(classifyStudy({ ...base, pasaportes: passport.options[1].value }).perfil, "D");
});

test("cambiar un grupo a viajero solo invalida un pasaporte mixto anterior", () => {
  const group = { ...base, grupo: studyOptions.grupo[2], pasaportes: studyOptions.pasaportes[1] };
  assert.equal(presentStudyQuestion(studyPages[3], group).options.length, 3);
  const solo = updateStudyAnswer(group, "grupo", studyOptions.grupo[0]);
  assert.equal(solo.pasaportes, undefined);
  assert.equal(solo.ocupacion, undefined);
  assert.equal(solo.lazos, undefined);
  assert.equal(classifyStudy(solo).perfil, "PENDIENTE");
  assert.equal(group.pasaportes, studyOptions.pasaportes[1]);
});

test("cambiar de destino vuelve a pedir los lazos familiares de ese país", () => {
  const changed = updateStudyAnswer(base, "destino", studyOptions.destino[2]);
  assert.equal(changed.lazos, undefined);
  assert.equal(changed.pasaportes, base.pasaportes);
});
