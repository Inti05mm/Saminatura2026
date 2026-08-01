import { useMemo, useState } from "react";

export type ProductExtraInfoData = {
  ingredients: string | null;
  nutritional_info: string | null;
  usage_instructions: string | null;
  warnings: string | null;
  allergens: string | null;
  usage_tips: string | null;
  medical_disclaimer: string | null;
  legal_regulation: string | null;
};

type InfoSection = {
  id: string;
  title: string;
  content: React.ReactNode;
  rawText: string | null;
  defaultOpen?: boolean;
};

type ProductExtraInfoProps = {
  productName: string;
  category: string | null | undefined;
  description?: string | null;
  extraInfo: ProductExtraInfoData | null;
};

type SectionKey =
  | "description"
  | "ingredients"
  | "nutritional_info"
  | "usage_instructions"
  | "warnings"
  | "allergens"
  | "usage_tips"
  | "legal_regulation"
  | "medical_disclaimer";

function normalizeCategory(category: string | null | undefined) {
  return String(category ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function hasText(value: string | null | undefined) {
  return String(value ?? "").trim() !== "";
}

function getSectionsByCategory(category: string | null | undefined): SectionKey[] {
  const c = normalizeCategory(category);

  const sectionsByCategory: Record<string, SectionKey[]> = {
    suplementos: [
      "ingredients",
      "nutritional_info",
      "usage_instructions",
      "warnings",
      "allergens",
      "usage_tips",
      "legal_regulation",
      "medical_disclaimer",
    ],

    deporte: [
      "description",
      "ingredients",
      "usage_instructions",
    ],

    "cosmetica e higiene": [
      "description",
      "usage_instructions",
      "usage_tips",
      "ingredients",
      "warnings",
    ],

    alimentos: [
      "ingredients",
      "nutritional_info",
      "usage_instructions",
      "warnings",
      "allergens",
      "usage_tips",
      "legal_regulation",
      "medical_disclaimer",
    ],

    granel: [
      "ingredients",
      "nutritional_info",
      "usage_instructions",
      "warnings",
      "allergens",
      "usage_tips",
      "legal_regulation",
      "medical_disclaimer",
    ],

    infusiones: [
      "ingredients",
      "nutritional_info",
      "usage_instructions",
      "warnings",
      "allergens",
      "usage_tips",
      "legal_regulation",
      "medical_disclaimer",
    ],

    aromaterapia: [
      "description",
      "usage_instructions",
      "usage_tips",
      "ingredients",
      "warnings",
    ],

    refrigerados: [
      "ingredients",
      "nutritional_info",
      "usage_instructions",
      "warnings",
      "allergens",
      "usage_tips",
      "legal_regulation",
      "medical_disclaimer",
    ],

    hogar: [
      "description",
      "usage_instructions",
      "usage_tips",
      "warnings",
    ],
  };

  return sectionsByCategory[c] ?? [
    "description",
    "ingredients",
    "nutritional_info",
    "usage_instructions",
    "warnings",
    "allergens",
    "usage_tips",
    "legal_regulation",
    "medical_disclaimer",
  ];
}

function AccordionItem({
  title,
  content,
  defaultOpen = false,
}: {
  title: string;
  content: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-[1.05rem] font-semibold text-gray-800">
          {title}
        </span>

        <span
          className={[
            "text-2xl leading-none transition-transform duration-300 text-cyan-500",
            open ? "rotate-45" : "rotate-0",
          ].join(" ")}
        >
          +
        </span>
      </button>

      <div
        className={[
          "grid transition-all duration-300 ease-in-out",
          open ? "grid-rows-[1fr] pb-4" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="text-sm leading-7 text-gray-600">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}

function TextBlock({ text }: { text: string | null | undefined }) {
  if (!hasText(text)) return null;

  return (
    <div className="space-y-2">
      {String(text)
        .split("\n")
        .filter((line) => line.trim() !== "")
        .map((line, index) => (
          <p key={index}>{line}</p>
        ))}
    </div>
  );
}

export default function ProductExtraInfo({
  category,
  description,
  extraInfo,
}: ProductExtraInfoProps) {
  const sections = useMemo<InfoSection[]>(() => {
    const visibleSectionKeys = getSectionsByCategory(category);

    const allSections: Record<SectionKey, InfoSection> = {
      description: {
        id: "descripcion",
        title: "Descripción",
        rawText: description ?? null,
        content: <TextBlock text={description} />,
      },

      ingredients: {
        id: "ingredientes",
        title: "Ingredientes",
        rawText: extraInfo?.ingredients ?? null,
        content: <TextBlock text={extraInfo?.ingredients} />,
      },

      nutritional_info: {
        id: "info-nutricional",
        title: "Información nutricional",
        rawText: extraInfo?.nutritional_info ?? null,
        content: <TextBlock text={extraInfo?.nutritional_info} />,
      },

      usage_instructions: {
        id: "modo-empleo",
        title: "Modo de empleo",
        rawText: extraInfo?.usage_instructions ?? null,
        content: <TextBlock text={extraInfo?.usage_instructions} />,
      },

      warnings: {
        id: "advertencias",
        title: "Advertencias",
        rawText: extraInfo?.warnings ?? null,
        content: <TextBlock text={extraInfo?.warnings} />,
      },

      allergens: {
        id: "alergenos",
        title: "Alérgenos",
        rawText: extraInfo?.allergens ?? null,
        content: <TextBlock text={extraInfo?.allergens} />,
      },

      usage_tips: {
        id: "info-adicional",
        title: "Información adicional",
        rawText: extraInfo?.usage_tips ?? null,
        content: <TextBlock text={extraInfo?.usage_tips} />,
      },

      legal_regulation: {
        id: "regulacion-legal",
        title: "Regulación legal",
        rawText: extraInfo?.legal_regulation ?? null,
        content: <TextBlock text={extraInfo?.legal_regulation} />,
      },

      medical_disclaimer: {
        id: "responsabilidad-medica",
        title: "Responsabilidad médica",
        rawText: extraInfo?.medical_disclaimer ?? null,
        content: <TextBlock text={extraInfo?.medical_disclaimer} />,
      },
    };

    return visibleSectionKeys
      .map((key) => allSections[key])
      .filter((section) => hasText(section.rawText))
      .map((section, index) => ({
        ...section,
        defaultOpen: index === 0,
      }));
  }, [category, description, extraInfo]);

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 rounded-[24px] border border-gray-200 bg-white p-6">
      <div className="mb-4">
        <h3 className="text-xl Inter font-bold text-gray-900">
          Información adicional
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Detalles ampliados del producto
        </p>
      </div>

      <div className="divide-y divide-transparent">
        {sections.map((section) => (
          <AccordionItem
            key={section.id}
            title={section.title}
            content={section.content}
            defaultOpen={section.defaultOpen}
          />
        ))}
      </div>
    </div>
  );
}