import {
  useEffect,
  useMemo,
  useState,
} from "react";

import jsPDF from "jspdf";

import { supabase } from "../supabaseClient";
import { useUser } from "./useUser";

/* =========================================================
   TIPOS
========================================================= */

type OrderItemRow = {
  id: string;
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;

  product_img?: string | null;
  product_brand?: string | null;
  product_slug?: string | null;
};

type PublicProductRow = {
  id: number;
  img: string | null;
  brand: string | null;
  slug: string | null;
};

type InvoiceRow = {
  invoice_code: string;
  invoice_date: string;
  pdf_url: string;
};

type OrderRow = {
  id: string;
  user_id: string;

  status:
    | "pending"
    | "paid"
    | "cancelled";

  total_amount: number;
  currency: string;

  created_at: string | null;
  paid_at: string | null;

  /* NUEVO */
  delivered_at: string | null;

  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;

  shipping_method: string | null;
  shipping_amount: number;

  shipping_address:
    | Record<string, unknown>
    | null;

  order_items?: OrderItemRow[];

  invoices?: InvoiceRow[] | null;
};

/* =========================================================
   HELPERS
========================================================= */

const formatEUR = (
  value: number
) =>
  new Intl.NumberFormat(
    "es-ES",
    {
      style: "currency",
      currency: "EUR",
    }
  ).format(
    Number.isFinite(value)
      ? value
      : 0
  );

const SAMINATURA_LOGO_URL =
  "https://uayblnybdrhhmumudbea.supabase.co/storage/v1/object/public/publicPictures/logo_2.png";

async function imageUrlToDataUrl(
  url: string
) {
  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `No se pudo cargar la imagen: ${response.status}`
    );
  }

  const blob =
    await response.blob();

  return await new Promise<string>(
    (
      resolve,
      reject
    ) => {
      const reader =
        new FileReader();

      reader.onloadend =
        () => {
          if (
            typeof reader.result ===
            "string"
          ) {
            resolve(
              reader.result
            );
          } else {
            reject(
              new Error(
                "No se pudo convertir la imagen."
              )
            );
          }
        };

      reader.onerror =
        () =>
          reject(
            new Error(
              "No se pudo leer la imagen."
            )
          );

      reader.readAsDataURL(
        blob
      );
    }
  );
}

function safeNumber(
  value: unknown
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

function formatDate(
  value?: string | null
) {
  if (!value) return "—";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function getDaysSinceDelivery(
  deliveredAt?: string | null
) {
  if (!deliveredAt) {
    return null;
  }

  const deliveredDate =
    new Date(deliveredAt);

  if (
    Number.isNaN(
      deliveredDate.getTime()
    )
  ) {
    return null;
  }

  return Math.floor(
    (
      Date.now() -
      deliveredDate.getTime()
    ) /
      (1000 * 60 * 60 * 24)
  );
}

function statusLabel(
  status: OrderRow["status"]
) {
  if (
    status === "paid"
  ) {
    return "Pagado";
  }

  if (
    status === "pending"
  ) {
    return "Pendiente";
  }

  return "Cancelado";
}

function buildShippingText(
  address:
    | Record<string, unknown>
    | null
) {
  if (!address) {
    return "—";
  }

  const firstName =
    String(
      address.first_name ??
        ""
    );

  const lastName =
    String(
      address.last_name ??
        ""
    );

  const parts = [
    [
      firstName,
      lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim(),

    address.company,
    address.line1,
    address.line2,

    [
      address.postal_code,
      address.city,
    ]
      .filter(Boolean)
      .join(" ")
      .trim(),

    address.region,
    address.country,
  ]
    .filter(Boolean)
    .map(String);

  return parts.join(", ");
}

function getSubtotal(
  order: OrderRow
) {
  return (
    order.order_items ??
    []
  ).reduce(
    (
      total,
      item
    ) =>
      total +
      safeNumber(
        item.unit_price
      ) *
        safeNumber(
          item.quantity
        ),
    0
  );
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function UserPedidosPanel() {
  const { user } =
    useUser();

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    orders,
    setOrders,
  ] =
    useState<
      OrderRow[]
    >([]);

  const [
    openId,
    setOpenId,
  ] =
    useState<
      string | null
    >(null);

  const openOrder =
    useMemo(
      () =>
        orders.find(
          (order) =>
            order.id ===
            openId
        ) ?? null,
      [
        orders,
        openId,
      ]
    );

  /* =======================================================
     CARGAR PEDIDOS
  ======================================================= */

  const loadOrders =
    async () => {
      if (!user) {
        setOrders([]);
        setLoading(false);

        return;
      }

      setLoading(true);
      setErrorMessage(null);

      const {
        data,
        error,
      } =
        await supabase
          .from("orders")
          .select(
            `
              id,
              user_id,
              status,
              total_amount,
              currency,
              created_at,
              paid_at,
              delivered_at,
              customer_email,
              customer_name,
              customer_phone,
              shipping_method,
              shipping_amount,
              shipping_address,

              order_items (
                id,
                product_id,
                product_name,
                unit_price,
                quantity
              ),

              invoices!invoices_order_id_fkey (
                invoice_code,
                invoice_date,
                pdf_url
              )
            `
          )
          .eq(
            "user_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (error) {
        setErrorMessage(
          error.message
        );

        setOrders([]);
        setLoading(false);

        return;
      }

      const rows =
        (
          data ?? []
        ) as unknown as OrderRow[];

      /* IDs productos */
      const productIds =
        Array.from(
          new Set(
            rows.flatMap(
              (order) =>
                (
                  order.order_items ??
                  []
                )
                  .map(
                    (item) =>
                      Number(
                        item.product_id
                      )
                  )
                  .filter(
                    (id) =>
                      Number.isFinite(
                        id
                      )
                  )
            )
          )
        );

      let productsMap =
        new Map<
          number,
          PublicProductRow
        >();

      if (
        productIds.length > 0
      ) {
        const {
          data: productsData,
          error: productsError,
        } =
          await supabase
            .from(
              "public_products"
            )
            .select(
              "id, img, brand, slug"
            )
            .in(
              "id",
              productIds
            );

        if (
          productsError
        ) {
          console.error(
            "No se pudieron cargar las imágenes de los productos:",
            productsError
          );
        } else {
          productsMap =
            new Map(
              (
                (
                  productsData ??
                  []
                ) as PublicProductRow[]
              ).map(
                (product) => [
                  Number(
                    product.id
                  ),
                  product,
                ]
              )
            );
        }
      }

      const enrichedRows:
        OrderRow[] =
        rows.map(
          (order) => ({
            ...order,

            order_items:
              (
                order.order_items ??
                []
              ).map(
                (item) => {
                  const product =
                    productsMap.get(
                      Number(
                        item.product_id
                      )
                    );

                  return {
                    ...item,

                    product_img:
                      product?.img ??
                      null,

                    product_brand:
                      product?.brand ??
                      null,

                    product_slug:
                      product?.slug ??
                      null,
                  };
                }
              ),
          })
        );

      setOrders(
        enrichedRows
      );

      setOpenId(
        (current) => {
          if (
            current &&
            enrichedRows.some(
              (order) =>
                order.id ===
                current
            )
          ) {
            return current;
          }

          return (
            enrichedRows[0]
              ?.id ?? null
          );
        }
      );

      setLoading(false);
    };

  useEffect(() => {
    void loadOrders();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* =======================================================
     PDF
  ======================================================= */

  const downloadOrderPdf =
    async (
      order: OrderRow
    ) => {
      const doc =
        new jsPDF({
          orientation:
            "portrait",
          unit: "mm",
          format: "a4",
        });

      const pageWidth =
        doc.internal.pageSize.getWidth();

      const pageHeight =
        doc.internal.pageSize.getHeight();

      const margin = 16;

      const contentWidth =
        pageWidth -
        margin * 2;

      const colors = {
        green:
          [
            66,
            85,
            48,
          ] as [
            number,
            number,
            number
          ],

        greenDark:
          [
            38,
            52,
            31,
          ] as [
            number,
            number,
            number
          ],

        greenSoft:
          [
            243,
            246,
            239,
          ] as [
            number,
            number,
            number
          ],

        cream:
          [
            249,
            247,
            241,
          ] as [
            number,
            number,
            number
          ],

        border:
          [
            220,
            226,
            215,
          ] as [
            number,
            number,
            number
          ],

        text:
          [
            43,
            54,
            37,
          ] as [
            number,
            number,
            number
          ],

        muted:
          [
            111,
            123,
            103,
          ] as [
            number,
            number,
            number
          ],

        white:
          [
            255,
            255,
            255,
          ] as [
            number,
            number,
            number
          ],
      };

      let y = 14;

      const addFooter =
        () => {
          const totalPages =
            doc.getNumberOfPages();

          for (
            let page = 1;
            page <=
            totalPages;
            page++
          ) {
            doc.setPage(
              page
            );

            doc.setDrawColor(
              ...colors.border
            );

            doc.line(
              margin,
              pageHeight -
                14,
              pageWidth -
                margin,
              pageHeight -
                14
            );

            doc.setFont(
              "helvetica",
              "normal"
            );

            doc.setFontSize(
              7.5
            );

            doc.setTextColor(
              ...colors.muted
            );

            doc.text(
              "SAMINATURA · Natural · Bio · Bienestar",
              margin,
              pageHeight -
                8
            );

            doc.text(
              `Página ${page} de ${totalPages}`,
              pageWidth -
                margin,
              pageHeight -
                8,
              {
                align:
                  "right",
              }
            );
          }
        };

      const ensureSpace =
        (
          needed: number
        ) => {
          if (
            y +
              needed <=
            pageHeight -
              22
          ) {
            return;
          }

          doc.addPage();

          y = 18;
        };

      /* CABECERA */
      doc.setFillColor(
        ...colors.cream
      );

      doc.roundedRect(
        margin,
        y,
        contentWidth,
        34,
        4,
        4,
        "F"
      );

      try {
        const logoDataUrl =
          await imageUrlToDataUrl(
            SAMINATURA_LOGO_URL
          );

        doc.addImage(
          logoDataUrl,
          "PNG",
          margin + 6,
          y + 6,
          42,
          18
        );
      } catch (
        logoError
      ) {
        console.warn(
          "No se pudo cargar el logo en el PDF:",
          logoError
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(
          18
        );

        doc.setTextColor(
          ...colors.green
        );

        doc.text(
          "SAMINATURA",
          margin + 6,
          y + 16
        );
      }

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        12
      );

      doc.setTextColor(
        ...colors.greenDark
      );

      doc.text(
        "RESUMEN DE PEDIDO",
        pageWidth -
          margin -
          6,
        y + 13,
        {
          align:
            "right",
        }
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(
        8.5
      );

      doc.setTextColor(
        ...colors.muted
      );

      doc.text(
        "Gracias por confiar en nosotros",
        pageWidth -
          margin -
          6,
        y + 20,
        {
          align:
            "right",
        }
      );

      y += 43;

      /* PEDIDO */
      const shortOrderId =
        order.id
          .slice(
            0,
            8
          )
          .toUpperCase();

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        15
      );

      doc.setTextColor(
        ...colors.greenDark
      );

      doc.text(
        `Pedido #${shortOrderId}`,
        margin,
        y
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(
        8.5
      );

      doc.setTextColor(
        ...colors.muted
      );

      doc.text(
        `Referencia completa: ${order.id}`,
        margin,
        y + 6
      );

      const statusText =
        statusLabel(
          order.status
        ).toUpperCase();

      const statusWidth =
        doc.getTextWidth(
          statusText
        ) + 10;

      if (
        order.status ===
        "paid"
      ) {
        doc.setFillColor(
          232,
          242,
          226
        );

        doc.setTextColor(
          70,
          102,
          58
        );
      } else if (
        order.status ===
        "pending"
      ) {
        doc.setFillColor(
          255,
          247,
          224
        );

        doc.setTextColor(
          154,
          102,
          24
        );
      } else {
        doc.setFillColor(
          254,
          235,
          235
        );

        doc.setTextColor(
          166,
          55,
          55
        );
      }

      doc.roundedRect(
        pageWidth -
          margin -
          statusWidth,
        y - 6,
        statusWidth,
        9,
        4,
        4,
        "F"
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        8
      );

      doc.text(
        statusText,
        pageWidth -
          margin -
          statusWidth /
            2,
        y,
        {
          align:
            "center",
        }
      );

      y += 17;

      /* DATOS CLIENTE / ENTREGA */
      const cardGap =
        5;

      const cardWidth =
        (
          contentWidth -
          cardGap
        ) / 2;

      const cardHeight =
        48;

      doc.setFillColor(
        ...colors.greenSoft
      );

      doc.roundedRect(
        margin,
        y,
        cardWidth,
        cardHeight,
        3,
        3,
        "F"
      );

      doc.roundedRect(
        margin +
          cardWidth +
          cardGap,
        y,
        cardWidth,
        cardHeight,
        3,
        3,
        "F"
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        9.5
      );

      doc.setTextColor(
        ...colors.greenDark
      );

      doc.text(
        "DATOS DEL CLIENTE",
        margin + 5,
        y + 8
      );

      doc.text(
        "ENTREGA",
        margin +
          cardWidth +
          cardGap +
          5,
        y + 8
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(
        8.5
      );

      doc.setTextColor(
        ...colors.text
      );

      const customerLines =
        [
          order.customer_name ??
            "—",

          order.customer_email ??
            "—",

          order.customer_phone ??
            "—",

          `Compra: ${formatDate(
            order.paid_at ??
              order.created_at
          )}`,
        ];

      customerLines.forEach(
        (
          line,
          index
        ) => {
          doc.text(
            String(line),
            margin + 5,
            y +
              16 +
              index *
                6
          );
        }
      );

      const shippingX =
        margin +
        cardWidth +
        cardGap +
        5;

      doc.text(
        `Método: ${
          order.shipping_method ??
          "—"
        }`,
        shippingX,
        y + 16
      );

      doc.text(
        `Entregado: ${formatDate(
          order.delivered_at
        )}`,
        shippingX,
        y + 22
      );

      const addressLines =
        doc.splitTextToSize(
          buildShippingText(
            order.shipping_address
          ),
          cardWidth -
            10
        );

      doc.text(
        addressLines,
        shippingX,
        y + 29
      );

      y +=
        cardHeight +
        10;

      /* ARTÍCULOS */
      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        11
      );

      doc.setTextColor(
        ...colors.greenDark
      );

      doc.text(
        "ARTÍCULOS",
        margin,
        y
      );

      y += 6;

      doc.setFillColor(
        ...colors.green
      );

      doc.roundedRect(
        margin,
        y,
        contentWidth,
        10,
        2,
        2,
        "F"
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        8
      );

      doc.setTextColor(
        ...colors.white
      );

      doc.text(
        "PRODUCTO",
        margin + 4,
        y + 6.5
      );

      doc.text(
        "UDS.",
        132,
        y + 6.5,
        {
          align:
            "center",
        }
      );

      doc.text(
        "PRECIO",
        159,
        y + 6.5,
        {
          align:
            "right",
        }
      );

      doc.text(
        "TOTAL",
        pageWidth -
          margin -
          4,
        y + 6.5,
        {
          align:
            "right",
        }
      );

      y += 15;

      const items =
        order.order_items ??
        [];

      if (
        items.length ===
        0
      ) {
        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(
          9
        );

        doc.setTextColor(
          ...colors.muted
        );

        doc.text(
          "No hay artículos registrados.",
          margin + 4,
          y
        );

        y += 10;
      } else {
        items.forEach(
          (
            item,
            index
          ) => {
            const quantity =
              safeNumber(
                item.quantity
              );

            const unitPrice =
              safeNumber(
                item.unit_price
              );

            const rowTotal =
              unitPrice *
              quantity;

            const productLines =
              doc.splitTextToSize(
                item.product_name ||
                  "Producto",
                86
              );

            const rowHeight =
              Math.max(
                13,
                productLines.length *
                  5 +
                  5
              );

            ensureSpace(
              rowHeight +
                4
            );

            if (
              index %
                2 ===
              0
            ) {
              doc.setFillColor(
                ...colors.cream
              );

              doc.roundedRect(
                margin,
                y - 4,
                contentWidth,
                rowHeight,
                1.5,
                1.5,
                "F"
              );
            }

            doc.setFont(
              "helvetica",
              "normal"
            );

            doc.setFontSize(
              8.8
            );

            doc.setTextColor(
              ...colors.text
            );

            doc.text(
              productLines,
              margin + 4,
              y + 2
            );

            doc.setTextColor(
              ...colors.muted
            );

            doc.text(
              String(
                quantity
              ),
              132,
              y + 2,
              {
                align:
                  "center",
              }
            );

            doc.text(
              formatEUR(
                unitPrice
              ),
              159,
              y + 2,
              {
                align:
                  "right",
              }
            );

            doc.setFont(
              "helvetica",
              "bold"
            );

            doc.setTextColor(
              ...colors.greenDark
            );

            doc.text(
              formatEUR(
                rowTotal
              ),
              pageWidth -
                margin -
                4,
              y + 2,
              {
                align:
                  "right",
              }
            );

            y +=
              rowHeight;
          }
        );
      }

      y += 5;

      /* TOTALES */
      ensureSpace(52);

      const subtotal =
        getSubtotal(
          order
        );

      const shipping =
        safeNumber(
          order.shipping_amount
        );

      const total =
        safeNumber(
          order.total_amount
        );

      const totalsWidth =
        78;

      const totalsX =
        pageWidth -
        margin -
        totalsWidth;

      doc.setFillColor(
        ...colors.greenSoft
      );

      doc.roundedRect(
        totalsX,
        y,
        totalsWidth,
        39,
        3,
        3,
        "F"
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(
        9
      );

      doc.setTextColor(
        ...colors.muted
      );

      doc.text(
        "Subtotal",
        totalsX + 6,
        y + 9
      );

      doc.text(
        formatEUR(
          subtotal
        ),
        pageWidth -
          margin -
          6,
        y + 9,
        {
          align:
            "right",
        }
      );

      doc.text(
        "Envío",
        totalsX + 6,
        y + 17
      );

      doc.text(
        formatEUR(
          shipping
        ),
        pageWidth -
          margin -
          6,
        y + 17,
        {
          align:
            "right",
        }
      );

      doc.setDrawColor(
        ...colors.border
      );

      doc.line(
        totalsX + 6,
        y + 23,
        pageWidth -
          margin -
          6,
        y + 23
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        11
      );

      doc.setTextColor(
        ...colors.greenDark
      );

      doc.text(
        "TOTAL",
        totalsX + 6,
        y + 32
      );

      doc.text(
        formatEUR(
          total
        ),
        pageWidth -
          margin -
          6,
        y + 32,
        {
          align:
            "right",
        }
      );

      y += 49;

      /* POSTVENTA */
      ensureSpace(38);

      doc.setFillColor(
        ...colors.cream
      );

      doc.roundedRect(
        margin,
        y,
        contentWidth,
        31,
        3,
        3,
        "F"
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        9.5
      );

      doc.setTextColor(
        ...colors.greenDark
      );

      doc.text(
        "¿NECESITAS AYUDA CON TU PEDIDO?",
        margin + 5,
        y + 8
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(
        8
      );

      doc.setTextColor(
        ...colors.muted
      );

      doc.text(
        "Email: saminatura369@gmail.com · WhatsApp: +34 631 415 075",
        margin + 5,
        y + 15
      );

      const legalText =
        "Consulta en nuestra web las condiciones de compra, desistimiento, devoluciones y política de privacidad.";

      const legalLines =
        doc.splitTextToSize(
          legalText,
          contentWidth -
            10
        );

      doc.text(
        legalLines,
        margin + 5,
        y + 22
      );

      addFooter();

      doc.save(
        `pedido-saminatura-${shortOrderId}.pdf`
      );
    };

  /* =======================================================
     ESTADOS
  ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-[#6e7867]">
          Cargando pedidos…
        </p>
      </div>
    );
  }

  if (
    errorMessage
  ) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Error al cargar los pedidos:{" "}
        {errorMessage}
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7d8a70]">
            Historial
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-[#26341f]">
            Mis pedidos
          </h2>

          <p className="mt-2 text-sm text-[#727c6b]">
            Consulta tus pedidos, revisa sus detalles y descarga un
            resumen en PDF.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadOrders()
          }
          className="rounded-xl border border-[#ccd5c3] bg-white px-4 py-2.5 text-sm font-semibold text-[#425530] transition hover:bg-[#f3f6ef]"
        >
          Recargar
        </button>
      </div>

      {orders.length ===
      0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[#ccd5c3] bg-[#fafbf8] p-10 text-center">
          <p className="font-semibold text-[#394631]">
            Aún no tienes pedidos
          </p>

          <p className="mt-2 text-sm text-[#788170]">
            Cuando realices una compra, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid overflow-hidden rounded-2xl border border-[#dbe1d4] bg-white lg:grid-cols-[0.9fr_1.1fr]">
          {/* LISTA */}
          <div className="max-h-[620px] overflow-y-auto border-b border-[#e1e5dc] p-4 lg:border-b-0 lg:border-r">
            <div className="space-y-3">
              {orders.map(
                (order) => (
                  <button
                    key={
                      order.id
                    }
                    type="button"
                    onClick={() =>
                      setOpenId(
                        order.id
                      )
                    }
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      openId ===
                      order.id
                        ? "border-[#718360] bg-[#f3f6ef]"
                        : "border-[#e1e5dc] bg-white hover:bg-[#fafbf8]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a9383]">
                          Pedido
                        </p>

                        <p className="mt-1 break-all text-sm font-semibold text-[#283421]">
                          {
                            order.id
                          }
                        </p>

                        <p className="mt-2 text-xs text-[#747e6d]">
                          {formatDate(
                            order.created_at
                          )}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-[#2f431f]">
                          {formatEUR(
                            safeNumber(
                              order.total_amount
                            )
                          )}
                        </p>

                        <span
                          className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            order.status ===
                            "paid"
                              ? "bg-[#e8f2e2] text-[#46663a]"
                              : order.status ===
                                "pending"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {statusLabel(
                            order.status
                          )}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              )}
            </div>
          </div>

          {/* DETALLE */}
          <div className="max-h-[620px] overflow-y-auto p-5 sm:p-6">
            {!openOrder ? (
              <div className="flex min-h-64 items-center justify-center text-center text-sm text-[#747e6d]">
                Selecciona un pedido para ver el detalle.
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-[#26341f]">
                      Detalle del pedido
                    </h3>

                    <p className="mt-1 break-all text-xs text-[#80897a]">
                      {
                        openOrder.id
                      }
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {openOrder
                      .invoices?.[0]
                      ?.pdf_url ? (
                      <a
                        href={
                          openOrder
                            .invoices[0]
                            .pdf_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-[#ccd5c3] bg-white px-4 py-2 text-sm font-semibold text-[#425530] transition hover:bg-[#f3f6ef]"
                      >
                        Ver factura
                      </a>
                    ) : null}

                    <button
                      type="button"
                      onClick={() =>
                        void downloadOrderPdf(
                          openOrder
                        )
                      }
                      className="rounded-xl bg-[#425530] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#344526]"
                    >
                      Descargar resumen
                    </button>
                  </div>
                </div>

                {/* ESTADO / ENVÍO */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#dde3d7] bg-[#f8faf6] p-4">
                    <p className="font-semibold text-[#314129]">
                      Estado
                    </p>

                    <p className="mt-2 text-sm text-[#6e7867]">
                      {statusLabel(
                        openOrder.status
                      )}
                    </p>

                    <p className="mt-1 text-sm text-[#6e7867]">
                      Creado:{" "}
                      {formatDate(
                        openOrder.created_at
                      )}
                    </p>

                    <p className="mt-1 text-sm text-[#6e7867]">
                      Pagado:{" "}
                      {formatDate(
                        openOrder.paid_at
                      )}
                    </p>

                    <p className="mt-1 text-sm text-[#6e7867]">
                      Entregado:{" "}
                      {formatDate(
                        openOrder.delivered_at
                      )}
                    </p>

                    {openOrder.delivered_at &&
                      (() => {
                        const days =
                          getDaysSinceDelivery(
                            openOrder.delivered_at
                          );

                        if (
                          days === null
                        ) {
                          return null;
                        }

                        if (
                          days >= 0 &&
                          days <= 14
                        ) {
                          return (
                            <span className="mt-3 inline-flex rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                              Dentro del plazo general de desistimiento
                            </span>
                          );
                        }

                        return (
                          <span className="mt-3 inline-flex rounded-full border border-[#ddd8ce] bg-[#f7f5ef] px-2.5 py-1 text-[11px] font-semibold text-[#777266]">
                            Plazo general de desistimiento finalizado
                          </span>
                        );
                      })()}
                  </div>

                  <div className="rounded-xl border border-[#dde3d7] bg-[#f8faf6] p-4">
                    <p className="font-semibold text-[#314129]">
                      Envío
                    </p>

                    <p className="mt-2 text-sm text-[#6e7867]">
                      {openOrder.shipping_method ??
                        "—"}
                    </p>

                    <p className="mt-1 text-sm text-[#6e7867]">
                      {buildShippingText(
                        openOrder.shipping_address
                      )}
                    </p>
                  </div>
                </div>

                {/* ARTÍCULOS */}
                <div className="mt-6">
                  <h4 className="font-semibold text-[#2d3a26]">
                    Artículos
                  </h4>

                  <div className="mt-3 overflow-hidden rounded-xl border border-[#dde3d7]">
                    {(
                      openOrder.order_items ??
                      []
                    ).map(
                      (item) => {
                        const total =
                          safeNumber(
                            item.unit_price
                          ) *
                          safeNumber(
                            item.quantity
                          );

                        return (
                          <div
                            key={
                              item.id
                            }
                            className="flex items-center gap-4 border-b border-[#edf0e9] p-4 last:border-b-0"
                          >
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#dde3d7] bg-white p-2">
                              {item.product_img ? (
                                <img
                                  src={
                                    item.product_img
                                  }
                                  alt={
                                    item.product_name
                                  }
                                  className="h-full w-full object-contain"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="text-center text-[10px] text-[#9aa293]">
                                  Sin imagen
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-[#2b3625]">
                                {
                                  item.product_name
                                }
                              </p>

                              {item.product_brand && (
                                <p className="mt-1 truncate text-xs text-[#8a9383]">
                                  {
                                    item.product_brand
                                  }
                                </p>
                              )}

                              <p className="mt-2 text-sm text-[#788170]">
                                {
                                  item.quantity
                                }{" "}
                                ×{" "}
                                {formatEUR(
                                  safeNumber(
                                    item.unit_price
                                  )
                                )}
                              </p>
                            </div>

                            <p className="shrink-0 font-semibold text-[#2f431f]">
                              {formatEUR(
                                total
                              )}
                            </p>
                          </div>
                        );
                      }
                    )}

                    {(
                      openOrder.order_items ??
                      []
                    ).length ===
                      0 && (
                      <div className="p-4 text-sm text-[#788170]">
                        No hay artículos registrados.
                      </div>
                    )}
                  </div>
                </div>

                {/* TOTALES */}
                <div className="mt-5 flex justify-end">
                  <div className="w-full max-w-sm rounded-xl border border-[#dbe1d4] bg-[#fafbf8] p-4">
                    <div className="flex justify-between text-sm text-[#687261]">
                      <span>
                        Subtotal
                      </span>

                      <span>
                        {formatEUR(
                          getSubtotal(
                            openOrder
                          )
                        )}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-between text-sm text-[#687261]">
                      <span>
                        Envío
                      </span>

                      <span>
                        {formatEUR(
                          safeNumber(
                            openOrder.shipping_amount
                          )
                        )}
                      </span>
                    </div>

                    <div className="mt-3 border-t border-[#dde3d7] pt-3">
                      <div className="flex justify-between font-semibold text-[#26341f]">
                        <span>
                          Total
                        </span>

                        <span>
                          {formatEUR(
                            safeNumber(
                              openOrder.total_amount
                            )
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}