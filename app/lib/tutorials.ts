/**
 * In-context step-by-step tutorials, written for how a family-office director
 * actually onboards an investment. Step bodies are authored in Spanish (the
 * primary user base); the modal chrome (buttons, "step X of Y") is localised
 * via i18n. Each tutorial is referenced by a stable `id` from the help
 * footnotes and the Q&A "Tutoriales" section.
 */
export interface Tutorial {
  id: TutorialId;
  title: string;
  intro: string;
  steps: string[];
}

export type TutorialId =
  | "add-fund"
  | "add-direct"
  | "update-valuation"
  | "add-entity";

export const TUTORIALS: Record<TutorialId, Tutorial> = {
  "add-fund": {
    id: "add-fund",
    title: "Cómo agregar un nuevo fondo",
    intro: "Captura un fondo completo —identidad, clasificación, económicos, performance y riesgo— en un solo flujo.",
    steps: [
      'Ve a Sponsors (o Portfolio) y haz clic en "+ Agregar Fondo".',
      "Identidad: escribe el nombre del fondo y selecciona el año de vintage.",
      "Clasificación: elige Clase de Activo (VC, PE, Real Assets, Private Credit, Infraestructura). Las opciones de Estrategia y Sub-Tema se filtran automáticamente a esa clase.",
      "Selecciona Geografía, Moneda y la Entidad a la que pertenece el fondo.",
      "Económicos: captura Commitment, Capital Llamado (Paid-In), NAV, Distribuciones y Unfunded. El sistema calcula solo % Llamado, TVPI, DPI y RVPI.",
      "Performance: ingresa IRR y MOIC (gross y net).",
      "Riesgo: asigna el semáforo de riesgo (verde / amarillo / rojo) y el trimestre del último reporte recibido.",
      'Guarda. El fondo aparece de inmediato en la tabla, el mapa de entidades, los contadores y los KPIs del dashboard. Usa "Guardar y agregar otro" para capturar varios seguidos.',
    ],
  },
  "add-direct": {
    id: "add-direct",
    title: "Cómo agregar una inversión directa",
    intro: "Registra una inversión directa o co-inversión en una empresa o activo específico.",
    steps: [
      'Ve a "Inversiones Directas" y haz clic en "+ Agregar Inversión Directa".',
      "Captura el nombre de la empresa/activo y el sector/tema.",
      "Selecciona el tipo (Equity Directo, Co-inversión, SPV, Club Deal), geografía, moneda y entidad.",
      "Ingresa la fecha de inversión, el costo inicial y el % de propiedad.",
      "Captura la valuación actual y su fecha. El sistema calcula el MOIC automáticamente.",
      "Asigna la etapa (Seed, Serie A/B/C, Growth, Pre-IPO, Madura) y el semáforo de riesgo.",
      "Guarda. Podrás subir documentos de la empresa (deck, cap table, financieros) y actualizar la valuación cuando haya un nuevo evento.",
    ],
  },
  "update-valuation": {
    id: "update-valuation",
    title: "Cómo actualizar una valuación",
    intro: "Registra un nuevo valor para un fondo o inversión directa sin perder el histórico.",
    steps: [
      "Abre la inversión (fondo o directa) desde cualquier lista o desde el mapa.",
      'Haz clic en "Actualizar Valuación".',
      "Ingresa el nuevo valor (NAV o valuación) y la fecha del evento.",
      "Agrega una nota opcional (ronda, evento de liquidez, ajuste de GP, etc.).",
      "Guarda. El histórico de valuación conserva todas las entradas (nunca se sobrescriben); la más reciente se vuelve el NAV actual y se recalculan las métricas y la curva-J. Queda registrado en el audit ledger con tu usuario y fecha.",
    ],
  },
  "add-entity": {
    id: "add-entity",
    title: "Cómo agregar una nueva entidad",
    intro: "Da de alta una entidad legal con su KYC completo para asignarle fondos e inversiones.",
    steps: [
      'Ve a Settings → Entidades y haz clic en "+ Agregar Entidad".',
      "Captura el KYC completo: nombre legal, tipo de entidad, jurisdicción, RFC/Tax ID, número de registro, fecha de constitución y domicilio.",
      "Registra al representante legal / beneficiario final (UBO) y su identificación.",
      "Indica la fuente de los recursos y la clasificación de riesgo.",
      "Sube los documentos KYC (acta constitutiva, identificación, comprobante de domicilio, declaración de UBO).",
      "Asigna la entidad padre si cuelga de otra (para el mapa de entidades).",
      "Guarda. La entidad aparece en el mapa y queda disponible para asignarle fondos e inversiones. (Requiere permisos de CEO/Owner o Head of Portfolio.)",
    ],
  },
};

export const TUTORIAL_ORDER: TutorialId[] = [
  "add-fund",
  "add-direct",
  "update-valuation",
  "add-entity",
];
