import { useMemo, useState } from "react";

export type ProductExtraInfoData = {
  ingredients: string | null;
  nutritional_info: string | null;
  usage_instructions: string | null;
  warnings: string | null;
  allergens: string | null;
  usage_tips: string | null;
  medical_disclaimer: string | null;
  storage_instructions: string | null;
};

type InfoSection = {
  id: string;
  title: string;
  content: React.ReactNode;
  defaultOpen?: boolean;
};

type ProductExtraInfoProps = {
  productName: string;
  extraInfo: ProductExtraInfoData | null;
};

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
          <div className="text-sm leading-7 text-gray-600">{content}</div>
        </div>
      </div>
    </div>
  );
}

function TextBlock({ text }: { text: string | null | undefined }) {
  if (!text || !text.trim()) {
    return <p>No disponible.</p>;
  }

  return (
    <div className="space-y-2">
      {text.split("\n").map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </div>
  );
}

export default function ProductExtraInfo({
  productName,
  extraInfo,
}: ProductExtraInfoProps) {
  const sections = useMemo<InfoSection[]>(
    () => [
      {
        id: "ingredientes",
        title: "Ingredientes",
        defaultOpen: true,
        content: extraInfo?.ingredients ? (
          <TextBlock text={extraInfo.ingredients} />
        ) : (
          <div className="space-y-3">
            <p>
              No hay ingredientes disponibles para{" "}
              <strong>{productName}</strong>.
            </p>
          </div>
        ),
      },
      {
        id: "info-nutricional",
        title: "Información nutricional",
        content: <TextBlock text={extraInfo?.nutritional_info} />,
      },
      {
        id: "modo-empleo",
        title: "Modo de empleo",
        content: <TextBlock text={extraInfo?.usage_instructions} />,
      },
      {
        id: "advertencias",
        title: "Advertencias",
        content: <TextBlock text={extraInfo?.warnings} />,
      },
      {
        id: "alergenos",
        title: "Alérgenos",
        content: <TextBlock text={extraInfo?.allergens} />,
      },
      {
        id: "consejos-uso",
        title: "Consejos de uso",
        content: (
          <div className="space-y-3">
            <TextBlock text={extraInfo?.usage_tips} />
            {extraInfo?.storage_instructions?.trim() ? (
              <div className="pt-1">
                <p className="mb-2 font-medium text-gray-800">Conservación</p>
                <TextBlock text={extraInfo.storage_instructions} />
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: "responsabilidad-medica",
        title: "Responsabilidad médica",
        content: <TextBlock text={extraInfo?.medical_disclaimer} />,
      },
    ],
    [extraInfo, productName]
  );

  return (
    <div className="mt-2 rounded-[24px] border border-gray-200 bg-white p-6">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900">
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