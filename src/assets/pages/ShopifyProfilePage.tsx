import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import Header from "../containers/Header";
import Footer from "../containers/Footer";

import {
  createShopifyCustomerAddress,
  deleteShopifyCustomerAddress,
  getShopifyCustomer,
  updateShopifyCustomer,
  updateShopifyCustomerAddress,
  type CustomerAddressInput,
  type ShopifyCustomer,
  type ShopifyCustomerAddress,
  type ShopifyCustomerOrder,
  type ShopifyMoney,
} from "../../shopifyCustomerApi";

import {
  useShopifyCustomer,
} from "../containers/ShopifyCustomerContext";

/* ============================================================
   ADDRESS FORM
   ============================================================ */

type AddressForm = {
  firstName: string;
  lastName: string;

  company: string;

  address1: string;
  address2: string;

  city: string;

  zip: string;

  territoryCode: string;
  zoneCode: string;

  phoneNumber: string;

  defaultAddress: boolean;
};

const EMPTY_ADDRESS: AddressForm = {
  firstName: "",
  lastName: "",

  company: "",

  address1: "",
  address2: "",

  city: "",

  zip: "",

  territoryCode: "ES",
  zoneCode: "",

  phoneNumber: "",

  defaultAddress: false,
};

/* ============================================================
   HELPERS PEDIDOS
   ============================================================ */

function formatMoney(
  money:
    | ShopifyMoney
    | null
    | undefined
) {
  if (!money) {
    return "—";
  }

  const amount =
    Number(
      money.amount
    );

  if (
    !Number.isFinite(
      amount
    )
  ) {
    return `${money.amount} ${money.currencyCode}`;
  }

  try {
    return new Intl.NumberFormat(
      "es-ES",
      {
        style: "currency",
        currency:
          money.currencyCode,
      }
    ).format(amount);
  } catch {
    return `${amount.toFixed(
      2
    )} ${money.currencyCode}`;
  }
}

function formatDate(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "—";
  }

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
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
}

function financialStatusLabel(
  status:
    | string
    | null
    | undefined
) {
  switch (status) {
    case "PAID":
      return "Pagado";

    case "PARTIALLY_PAID":
      return "Pago parcial";

    case "PENDING":
      return "Pendiente";

    case "AUTHORIZED":
      return "Autorizado";

    case "PARTIALLY_REFUNDED":
      return "Reembolso parcial";

    case "REFUNDED":
      return "Reembolsado";

    case "VOIDED":
      return "Anulado";

    case "EXPIRED":
      return "Caducado";

    default:
      return status
        ? status
            .replace(/_/g, " ")
            .toLowerCase()
        : "Sin estado";
  }
}

function fulfillmentStatusLabel(
  status:
    | string
    | null
    | undefined
) {
  switch (status) {
    case "FULFILLED":
      return "Enviado";

    case "UNFULFILLED":
      return "Pendiente de envío";

    case "PARTIALLY_FULFILLED":
      return "Envío parcial";

    case "IN_PROGRESS":
      return "Preparando";

    case "ON_HOLD":
      return "En espera";

    case "SCHEDULED":
      return "Programado";

    case "OPEN":
      return "Abierto";

    case "PENDING_FULFILLMENT":
      return "Pendiente de preparación";

    case "REQUEST_DECLINED":
      return "Preparación rechazada";

    case "RESTOCKED":
      return "Repuesto";

    default:
      return status
        ? status
            .replace(/_/g, " ")
            .toLowerCase()
        : "Sin estado";
  }
}

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */

export default function ShopifyProfilePage() {
  const navigate =
    useNavigate();

  const {
    loggedIn,
    loading:
      sessionLoading,
  } =
    useShopifyCustomer();

  const [
    customer,
    setCustomer,
  ] =
    useState<ShopifyCustomer | null>(
      null
    );

  /*
    Popup de bienvenida.

    Se mostrará solamente la primera vez
    que ESTE navegador vea esta cuenta Shopify.
  */
  const [
    welcomeOpen,
    setWelcomeOpen,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    success,
    setSuccess,
  ] =
    useState<string | null>(
      null
    );

  /* ============================================================
     PERFIL
     ============================================================ */

  const [
    editingProfile,
    setEditingProfile,
  ] =
    useState(false);

  const [
    firstName,
    setFirstName,
  ] =
    useState("");

  const [
    lastName,
    setLastName,
  ] =
    useState("");

  const [
    savingProfile,
    setSavingProfile,
  ] =
    useState(false);

  /* ============================================================
     DIRECCIONES
     ============================================================ */

  const [
    addressModalOpen,
    setAddressModalOpen,
  ] =
    useState(false);

  const [
    editingAddressId,
    setEditingAddressId,
  ] =
    useState<string | null>(
      null
    );

  const [
    addressForm,
    setAddressForm,
  ] =
    useState<AddressForm>(
      EMPTY_ADDRESS
    );

  const [
    savingAddress,
    setSavingAddress,
  ] =
    useState(false);

  const [
    deletingAddressId,
    setDeletingAddressId,
  ] =
    useState<string | null>(
      null
    );

  /* ============================================================
     PEDIDOS
     ============================================================ */

  const [
    expandedOrderId,
    setExpandedOrderId,
  ] =
    useState<string | null>(
      null
    );

  const defaultAddressId =
    customer
      ?.defaultAddress
      ?.id ?? null;

  const addresses =
    useMemo(
      () =>
        customer
          ?.addresses
          .nodes ?? [],
      [customer]
    );

  const orders =
    useMemo(
      () =>
        customer
          ?.orders
          .nodes ?? [],
      [customer]
    );

  /* ============================================================
     CARGAR CLIENTE
     ============================================================ */

  const loadCustomer =
    async () => {
      setLoading(true);
      setError(null);

      try {
        const result =
          await getShopifyCustomer();

        setCustomer(
          result
        );

        /*
          ====================================================
          BIENVENIDA UNA SOLA VEZ POR CUENTA / NAVEGADOR
          ====================================================
        */

        try {
          const welcomeKey =
            `saminatura_shopify_welcome_${result.id}`;

          const alreadyWelcomed =
            localStorage.getItem(
              welcomeKey
            ) === "1";

          if (!alreadyWelcomed) {
            /*
              Marcamos primero y después abrimos.
              Así cerrar sesión NO vuelve a activar el popup.
            */
            localStorage.setItem(
              welcomeKey,
              "1"
            );

            setWelcomeOpen(
              true
            );
          }
        } catch {
          /*
            Si localStorage estuviera bloqueado,
            simplemente no rompemos el perfil.
          */
        }

        setFirstName(
          result.firstName ??
            ""
        );

        setLastName(
          result.lastName ??
            ""
        );
      } catch (err) {
        console.error(
          "Error cargando cliente Shopify:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el cliente."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (
      sessionLoading
    ) {
      return;
    }

    if (!loggedIn) {
      navigate(
        "/usuario-shopify-test",
        {
          replace:
            true,
        }
      );

      return;
    }

    void loadCustomer();
  }, [
    loggedIn,
    sessionLoading,
    navigate,
  ]);

  /* ============================================================
     GUARDAR PERFIL
     ============================================================ */

  const saveProfile =
    async () => {
      if (
        savingProfile
      ) {
        return;
      }

      setSavingProfile(
        true
      );

      setError(null);
      setSuccess(null);

      try {
        await updateShopifyCustomer({
          firstName:
            firstName.trim(),

          lastName:
            lastName.trim(),
        });

        await loadCustomer();

        setEditingProfile(
          false
        );

        setSuccess(
          "Datos personales actualizados."
        );
      } catch (err) {
        console.error(
          "Error actualizando perfil Shopify:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "No se pudo actualizar el perfil."
        );
      } finally {
        setSavingProfile(
          false
        );
      }
    };

  /* ============================================================
     MODAL DIRECCIÓN
     ============================================================ */

  const openCreateAddress =
    () => {
      setEditingAddressId(
        null
      );

      setAddressForm({
        ...EMPTY_ADDRESS,

        firstName:
          customer
            ?.firstName ??
          "",

        lastName:
          customer
            ?.lastName ??
          "",

        defaultAddress:
          addresses.length ===
          0,
      });

      setAddressModalOpen(
        true
      );

      setError(null);
      setSuccess(null);
    };

  const openEditAddress =
    (
      address: ShopifyCustomerAddress
    ) => {
      setEditingAddressId(
        address.id
      );

      setAddressForm({
        firstName:
          address.firstName ??
          "",

        lastName:
          address.lastName ??
          "",

        company:
          address.company ??
          "",

        address1:
          address.address1 ??
          "",

        address2:
          address.address2 ??
          "",

        city:
          address.city ??
          "",

        zip:
          address.zip ??
          "",

        territoryCode:
          address.territoryCode ??
          "ES",

        zoneCode:
          address.zoneCode ??
          "",

        phoneNumber:
          address.phoneNumber ??
          "",

        defaultAddress:
          address.id ===
          defaultAddressId,
      });

      setAddressModalOpen(
        true
      );

      setError(null);
      setSuccess(null);
    };

  const closeAddressModal =
    () => {
      if (
        savingAddress
      ) {
        return;
      }

      setAddressModalOpen(
        false
      );

      setEditingAddressId(
        null
      );

      setAddressForm(
        EMPTY_ADDRESS
      );
    };

  const saveAddress =
    async () => {
      if (
        savingAddress
      ) {
        return;
      }

      if (
        !addressForm.address1.trim() ||
        !addressForm.city.trim() ||
        !addressForm.zip.trim() ||
        !addressForm.territoryCode.trim()
      ) {
        setError(
          "Rellena dirección, ciudad, código postal y país."
        );

        return;
      }

      setSavingAddress(
        true
      );

      setError(null);
      setSuccess(null);

      const input: CustomerAddressInput =
        {
          firstName:
            addressForm.firstName.trim() ||
            undefined,

          lastName:
            addressForm.lastName.trim() ||
            undefined,

          company:
            addressForm.company.trim() ||
            undefined,

          address1:
            addressForm.address1.trim(),

          address2:
            addressForm.address2.trim() ||
            undefined,

          city:
            addressForm.city.trim(),

          zip:
            addressForm.zip.trim(),

          territoryCode:
            addressForm
              .territoryCode
              .trim()
              .toUpperCase(),

          zoneCode:
            addressForm
              .zoneCode
              .trim()
              .toUpperCase() ||
            undefined,

          phoneNumber:
            addressForm
              .phoneNumber
              .trim() ||
            undefined,
        };

      try {
        if (
          editingAddressId
        ) {
          await updateShopifyCustomerAddress(
            editingAddressId,
            input,
            addressForm.defaultAddress
          );

          setSuccess(
            "Dirección actualizada."
          );
        } else {
          await createShopifyCustomerAddress(
            input,
            addressForm.defaultAddress
          );

          setSuccess(
            "Dirección añadida."
          );
        }

        await loadCustomer();

        closeAddressModal();
      } catch (err) {
        console.error(
          "Error guardando dirección Shopify:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "No se pudo guardar la dirección."
        );
      } finally {
        setSavingAddress(
          false
        );
      }
    };

  /* ============================================================
     ELIMINAR DIRECCIÓN
     ============================================================ */

  const deleteAddress =
    async (
      addressId: string
    ) => {
      if (
        deletingAddressId
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "¿Eliminar esta dirección?"
        );

      if (!confirmed) {
        return;
      }

      setDeletingAddressId(
        addressId
      );

      setError(null);
      setSuccess(null);

      try {
        await deleteShopifyCustomerAddress(
          addressId
        );

        await loadCustomer();

        setSuccess(
          "Dirección eliminada."
        );
      } catch (err) {
        console.error(
          "Error eliminando dirección Shopify:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "No se pudo eliminar la dirección."
        );
      } finally {
        setDeletingAddressId(
          null
        );
      }
    };

  return (
    <main className="min-h-screen bg-[#f5f1e8]">
      <Header />

      <section className="mx-auto max-w-6xl px-4 py-10">
        {/* ================================================= */}
        {/* MENSAJES */}
        {/* ================================================= */}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* ================================================= */}
        {/* PERFIL */}
        {/* ================================================= */}

        <div
          id="shopify-profile-data"
          className="rounded-[28px] border border-[#d5ddca] bg-white p-7 shadow-sm md:p-10"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#788767]">
                Área personal
              </p>

              <h1 className="mt-3 text-3xl font-semibold text-[#26341f]">
                Mi perfil
              </h1>
            </div>

            {!loading &&
              customer &&
              !editingProfile && (
                <button
                  type="button"
                  onClick={() =>
                    setEditingProfile(
                      true
                    )
                  }
                  className="rounded-full border border-[#aebc8f] px-5 py-2.5 text-sm font-semibold text-[#425530] transition hover:bg-[#f2f5ea]"
                >
                  Editar datos
                </button>
              )}
          </div>

          {loading && (
            <p className="mt-6 text-gray-500">
              Cargando datos de Shopify…
            </p>
          )}

          {!loading &&
            customer && (
              <>
                {editingProfile ? (
                  <div className="mt-8 grid gap-5 sm:grid-cols-2">
                    <ProfileInput
                      label="Nombre"
                      value={
                        firstName
                      }
                      onChange={
                        setFirstName
                      }
                    />

                    <ProfileInput
                      label="Apellidos"
                      value={
                        lastName
                      }
                      onChange={
                        setLastName
                      }
                    />

                    <div className="flex flex-wrap gap-3 pt-2 sm:col-span-2">
                      <button
                        type="button"
                        disabled={
                          savingProfile
                        }
                        onClick={() => {
                          void saveProfile();
                        }}
                        className="rounded-full bg-[#425530] px-6 py-3 font-semibold text-white transition hover:bg-[#344526] disabled:opacity-50"
                      >
                        {savingProfile
                          ? "Guardando…"
                          : "Guardar cambios"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          savingProfile
                        }
                        onClick={() => {
                          setFirstName(
                            customer.firstName ??
                              ""
                          );

                          setLastName(
                            customer.lastName ??
                              ""
                          );

                          setEditingProfile(
                            false
                          );
                        }}
                        className="rounded-full border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <InfoBox
                      label="Nombre"
                      value={
                        customer.firstName ??
                        "—"
                      }
                    />

                    <InfoBox
                      label="Apellidos"
                      value={
                        customer.lastName ??
                        "—"
                      }
                    />

                    <InfoBox
                      label="Correo electrónico"
                      value={
                        customer
                          .emailAddress
                          ?.emailAddress ??
                        "—"
                      }
                    />
                  </div>
                )}
              </>
            )}
        </div>

        {/* ================================================= */}
        {/* DIRECCIONES */}
        {/* ================================================= */}

        {!loading &&
          customer && (
            <div className="mt-7 rounded-[28px] border border-[#d5ddca] bg-white p-7 shadow-sm md:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#788767]">
                    Envíos
                  </p>

                  <h2 className="mt-3 text-2xl font-semibold text-[#26341f]">
                    Mis direcciones
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={
                    openCreateAddress
                  }
                  className="rounded-full bg-[#425530] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#344526]"
                >
                  + Añadir dirección
                </button>
              </div>

              {addresses.length ===
              0 ? (
                <div className="mt-7 rounded-2xl border border-dashed border-gray-300 bg-[#fafbf7] p-8 text-center">
                  <p className="font-semibold text-gray-800">
                    Todavía no tienes direcciones guardadas
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    Añade una para utilizarla en tus próximos pedidos.
                  </p>
                </div>
              ) : (
                <div className="mt-7 grid gap-4 md:grid-cols-2">
                  {addresses.map(
                    (
                      address
                    ) => {
                      const isDefault =
                        address.id ===
                        defaultAddressId;

                      return (
                        <AddressCard
                          key={
                            address.id
                          }
                          address={
                            address
                          }
                          isDefault={
                            isDefault
                          }
                          deleting={
                            deletingAddressId ===
                            address.id
                          }
                          onEdit={() =>
                            openEditAddress(
                              address
                            )
                          }
                          onDelete={() => {
                            void deleteAddress(
                              address.id
                            );
                          }}
                        />
                      );
                    }
                  )}
                </div>
              )}
            </div>
          )}

        {/* ================================================= */}
        {/* PEDIDOS */}
        {/* ================================================= */}

        {!loading &&
          customer && (
            <div className="mt-7 rounded-[28px] border border-[#d5ddca] bg-white p-7 shadow-sm md:p-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#788767]">
                  Compras
                </p>

                <h2 className="mt-3 text-2xl font-semibold text-[#26341f]">
                  Mis pedidos
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Consulta tus compras realizadas con esta cuenta.
                </p>
              </div>

              {orders.length ===
              0 ? (
                <div className="mt-7 rounded-2xl border border-dashed border-gray-300 bg-[#fafbf7] p-8 text-center">
                  <p className="font-semibold text-gray-800">
                    Aún no tienes pedidos
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    Cuando completes una compra con esta cuenta aparecerá aquí.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/shopping-shopify-test"
                      )
                    }
                    className="mt-5 rounded-full bg-[#425530] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#344526]"
                  >
                    Ir a comprar
                  </button>
                </div>
              ) : (
                <div className="mt-7 space-y-4">
                  {orders.map(
                    (
                      order
                    ) => (
                      <OrderCard
                        key={
                          order.id
                        }
                        order={
                          order
                        }
                        expanded={
                          expandedOrderId ===
                          order.id
                        }
                        onToggle={() =>
                          setExpandedOrderId(
                            (
                              current
                            ) =>
                              current ===
                              order.id
                                ? null
                                : order.id
                          )
                        }
                      />
                    )
                  )}
                </div>
              )}
            </div>
          )}
      </section>

      <Footer />

      {/* ================================================= */}
      {/* POPUP BIENVENIDA */}
      {/* ================================================= */}

      {welcomeOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]"
          onClick={() =>
            setWelcomeOpen(
              false
            )
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shopify-welcome-title"
            className="w-full max-w-md rounded-[28px] border border-[#d5ddca] bg-white p-7 shadow-2xl md:p-8"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#edf4e8] text-2xl font-bold text-[#425530]">
              ✓
            </div>

            <p className="mt-5 text-center text-xs font-semibold uppercase tracking-[0.24em] text-[#788767]">
              Bienvenida a Saminatura
            </p>

            <h2
              id="shopify-welcome-title"
              className="mt-2 text-center text-2xl font-semibold text-[#26341f]"
            >
              Tu cuenta está lista
            </h2>

            <p className="mt-3 text-center text-sm leading-6 text-gray-600">
              Puedes completar tus datos y guardar una dirección,
              o empezar a comprar ahora.
            </p>

            <button
              type="button"
              onClick={() => {
                setWelcomeOpen(
                  false
                );

                setEditingProfile(
                  true
                );

                window.setTimeout(
                  () => {
                    document
                      .getElementById(
                        "shopify-profile-data"
                      )
                      ?.scrollIntoView({
                        behavior:
                          "smooth",
                        block:
                          "start",
                      });
                  },
                  50
                );
              }}
              className="mt-7 w-full rounded-full bg-[#425530] px-5 py-3 font-semibold text-white transition hover:bg-[#344526]"
            >
              Terminar de configurar mi cuenta
            </button>

            <button
              type="button"
              onClick={() => {
                setWelcomeOpen(
                  false
                );

                navigate(
                  "/shopping-shopify-test"
                );
              }}
              className="mt-3 w-full rounded-full border border-[#b9c6aa] bg-white px-5 py-3 font-semibold text-[#425530] transition hover:bg-[#f5f7f0]"
            >
              Empezar a comprar
            </button>

            <button
              type="button"
              onClick={() =>
                setWelcomeOpen(
                  false
                )
              }
              className="mt-4 w-full text-sm font-medium text-gray-400 transition hover:text-gray-600"
            >
              Ahora no
            </button>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* MODAL DIRECCIÓN */}
      {/* ================================================= */}

      {addressModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-8 backdrop-blur-sm"
          onClick={
            closeAddressModal
          }
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl md:p-8"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#788767]">
                  Dirección
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-[#26341f]">
                  {editingAddressId
                    ? "Editar dirección"
                    : "Nueva dirección"}
                </h2>
              </div>

              <button
                type="button"
                disabled={
                  savingAddress
                }
                onClick={
                  closeAddressModal
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-xl text-gray-500 hover:bg-gray-50"
              >
                ×
              </button>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <AddressInput
                label="Nombre"
                value={
                  addressForm.firstName
                }
                onChange={(
                  value
                ) =>
                  setAddressForm(
                    (
                      current
                    ) => ({
                      ...current,
                      firstName:
                        value,
                    })
                  )
                }
              />

              <AddressInput
                label="Apellidos"
                value={
                  addressForm.lastName
                }
                onChange={(
                  value
                ) =>
                  setAddressForm(
                    (
                      current
                    ) => ({
                      ...current,
                      lastName:
                        value,
                    })
                  )
                }
              />

              <AddressInput
                label="Empresa"
                value={
                  addressForm.company
                }
                onChange={(
                  value
                ) =>
                  setAddressForm(
                    (
                      current
                    ) => ({
                      ...current,
                      company:
                        value,
                    })
                  )
                }
              />

              <AddressInput
                label="Teléfono"
                value={
                  addressForm.phoneNumber
                }
                placeholder="+34600000000"
                onChange={(
                  value
                ) =>
                  setAddressForm(
                    (
                      current
                    ) => ({
                      ...current,
                      phoneNumber:
                        value,
                    })
                  )
                }
              />

              <div className="sm:col-span-2">
                <AddressInput
                  label="Dirección *"
                  value={
                    addressForm.address1
                  }
                  onChange={(
                    value
                  ) =>
                    setAddressForm(
                      (
                        current
                      ) => ({
                        ...current,
                        address1:
                          value,
                      })
                    )
                  }
                />
              </div>

              <div className="sm:col-span-2">
                <AddressInput
                  label="Piso, puerta, etc."
                  value={
                    addressForm.address2
                  }
                  onChange={(
                    value
                  ) =>
                    setAddressForm(
                      (
                        current
                      ) => ({
                        ...current,
                        address2:
                          value,
                      })
                    )
                  }
                />
              </div>

              <AddressInput
                label="Ciudad *"
                value={
                  addressForm.city
                }
                onChange={(
                  value
                ) =>
                  setAddressForm(
                    (
                      current
                    ) => ({
                      ...current,
                      city:
                        value,
                    })
                  )
                }
              />

              <AddressInput
                label="Código postal *"
                value={
                  addressForm.zip
                }
                onChange={(
                  value
                ) =>
                  setAddressForm(
                    (
                      current
                    ) => ({
                      ...current,
                      zip:
                        value,
                    })
                  )
                }
              />

              <AddressInput
                label="País (código ISO) *"
                value={
                  addressForm.territoryCode
                }
                placeholder="ES"
                onChange={(
                  value
                ) =>
                  setAddressForm(
                    (
                      current
                    ) => ({
                      ...current,
                      territoryCode:
                        value,
                    })
                  )
                }
              />

              <AddressInput
                label="Provincia / código"
                value={
                  addressForm.zoneCode
                }
                placeholder="HU"
                onChange={(
                  value
                ) =>
                  setAddressForm(
                    (
                      current
                    ) => ({
                      ...current,
                      zoneCode:
                        value,
                    })
                  )
                }
              />
            </div>

            <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl bg-[#f5f7f0] px-4 py-3">
              <input
                type="checkbox"
                checked={
                  addressForm.defaultAddress
                }
                onChange={(
                  event
                ) =>
                  setAddressForm(
                    (
                      current
                    ) => ({
                      ...current,

                      defaultAddress:
                        event
                          .target
                          .checked,
                    })
                  )
                }
                className="h-4 w-4"
              />

              <span className="text-sm font-semibold text-[#425530]">
                Usar como dirección predeterminada
              </span>
            </label>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={
                  savingAddress
                }
                onClick={() => {
                  void saveAddress();
                }}
                className="rounded-full bg-[#425530] px-6 py-3 font-semibold text-white transition hover:bg-[#344526] disabled:opacity-50"
              >
                {savingAddress
                  ? "Guardando…"
                  : editingAddressId
                  ? "Guardar cambios"
                  : "Añadir dirección"}
              </button>

              <button
                type="button"
                disabled={
                  savingAddress
                }
                onClick={
                  closeAddressModal
                }
                className="rounded-full border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ============================================================
   INFO BOX
   ============================================================ */

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-[#fafbf7] p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>

      <p className="mt-2 font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   PROFILE INPUT
   ============================================================ */

function ProfileInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#34452a]">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="mt-2 w-full rounded-xl border border-[#cfd8c5] bg-white px-4 py-3 outline-none focus:border-[#81946d] focus:ring-2 focus:ring-[#81946d]/20"
      />
    </label>
  );
}

/* ============================================================
   ADDRESS INPUT
   ============================================================ */

function AddressInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#34452a]">
        {label}
      </span>

      <input
        value={value}
        placeholder={
          placeholder
        }
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="mt-2 w-full rounded-xl border border-[#cfd8c5] bg-white px-4 py-3 outline-none focus:border-[#81946d] focus:ring-2 focus:ring-[#81946d]/20"
      />
    </label>
  );
}

/* ============================================================
   ADDRESS CARD
   ============================================================ */

function AddressCard({
  address,
  isDefault,
  deleting,
  onEdit,
  onDelete,
}: {
  address: ShopifyCustomerAddress;
  isDefault: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative rounded-2xl border border-gray-200 bg-[#fafbf7] p-5">
      {isDefault && (
        <span className="absolute right-4 top-4 rounded-full bg-[#dfe8d4] px-3 py-1 text-xs font-semibold text-[#425530]">
          Predeterminada
        </span>
      )}

      <p className="pr-28 font-semibold text-gray-900">
        {[
          address.firstName,
          address.lastName,
        ]
          .filter(Boolean)
          .join(" ") ||
          "Dirección"}
      </p>

      {address.company && (
        <p className="mt-1 text-sm text-gray-600">
          {address.company}
        </p>
      )}

      <div className="mt-3 space-y-1 text-sm leading-6 text-gray-600">
        <p>
          {address.address1}
        </p>

        {address.address2 && (
          <p>
            {address.address2}
          </p>
        )}

        <p>
          {[
            address.zip,
            address.city,
          ]
            .filter(Boolean)
            .join(" ")}
        </p>

        <p>
          {[
            address.province,
            address.country,
          ]
            .filter(Boolean)
            .join(", ")}
        </p>

        {address.phoneNumber && (
          <p className="pt-1">
            Tel.{" "}
            {
              address.phoneNumber
            }
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={
            onEdit
          }
          className="rounded-full border border-[#aebc8f] px-4 py-2 text-sm font-semibold text-[#425530] hover:bg-[#f2f5ea]"
        >
          Editar
        </button>

        <button
          type="button"
          disabled={
            deleting
          }
          onClick={
            onDelete
          }
          className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {deleting
            ? "Eliminando…"
            : "Eliminar"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   ORDER CARD
   ============================================================ */

function OrderCard({
  order,
  expanded,
  onToggle,
}: {
  order: ShopifyCustomerOrder;
  expanded: boolean;
  onToggle: () => void;
}) {
  const paymentLabel =
    financialStatusLabel(
      order.financialStatus
    );

  const shippingLabel =
    fulfillmentStatusLabel(
      order.fulfillmentStatus
    );

  const productCount =
    order.lineItems.nodes.reduce(
      (
        total,
        item
      ) =>
        total +
        item.quantity,
      0
    );

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-[#fafbf7]">
      <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-950">
                {order.name}
              </h3>

              {order.cancelledAt && (
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                  Cancelado
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-gray-500">
              {formatDate(
                order.processedAt
              )}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Total
            </p>

            <p className="mt-1 text-xl font-bold text-gray-950">
              {formatMoney(
                order.totalPrice
              )}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
            {paymentLabel}
          </span>

          <span className="rounded-full border border-[#d5ddca] bg-white px-3 py-1.5 text-xs font-semibold text-[#55664a]">
            {shippingLabel}
          </span>

          <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500">
            {productCount}{" "}
            producto
            {productCount === 1
              ? ""
              : "s"}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={
              onToggle
            }
            className="rounded-full border border-[#aebc8f] px-5 py-2.5 text-sm font-semibold text-[#425530] transition hover:bg-[#f2f5ea]"
          >
            {expanded
              ? "Ocultar detalles"
              : "Ver pedido"}
          </button>

          {order.statusPageUrl && (
            <a
              href={
                order.statusPageUrl
              }
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#425530] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#344526]"
            >
              Estado del pedido
            </a>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-200 bg-white p-5 md:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Productos
            </p>

            <div className="mt-4 space-y-3">
              {order.lineItems.nodes.map(
                (
                  item
                ) => (
                  <div
                    key={
                      item.id
                    }
                    className="flex gap-4 rounded-xl border border-gray-100 bg-[#fafbf7] p-3"
                  >
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-white">
                      {item.image
                        ?.url ? (
                        <img
                          src={
                            item
                              .image
                              .url
                          }
                          alt={
                            item
                              .image
                              .altText ??
                            item.name
                          }
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">
                          Sin imagen
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">
                        {item.name}
                      </p>

                      {item.variantTitle && (
                        <p className="mt-1 text-sm text-gray-500">
                          {
                            item.variantTitle
                          }
                        </p>
                      )}

                      {item.vendor && (
                        <p className="mt-1 text-xs text-gray-400">
                          {
                            item.vendor
                          }
                        </p>
                      )}

                      {item.sku && (
                        <p className="mt-1 text-xs text-gray-400">
                          SKU:{" "}
                          {
                            item.sku
                          }
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm font-medium text-gray-600">
                          Cantidad:{" "}
                          {
                            item.quantity
                          }
                        </span>

                        <span className="font-semibold text-gray-900">
                          {formatMoney(
                            item.totalPrice
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="mt-7 rounded-2xl border border-gray-200 bg-[#fafbf7] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Resumen
            </p>

            <div className="mt-4 space-y-3 text-sm">
              <OrderAmountRow
                label="Subtotal"
                value={formatMoney(
                  order.subtotal
                )}
              />

              <OrderAmountRow
                label="Envío"
                value={formatMoney(
                  order.totalShipping
                )}
              />

              <OrderAmountRow
                label="Impuestos"
                value={formatMoney(
                  order.totalTax
                )}
              />

              {Number(
                order
                  .totalRefunded
                  .amount
              ) >
                0 && (
                <OrderAmountRow
                  label="Reembolsado"
                  value={formatMoney(
                    order.totalRefunded
                  )}
                />
              )}

              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-gray-900">
                    Total
                  </span>

                  <span className="text-lg font-bold text-gray-950">
                    {formatMoney(
                      order.totalPrice
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {order.shippingAddress && (
            <div className="mt-7 rounded-2xl border border-gray-200 bg-[#fafbf7] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Dirección de envío
              </p>

              <div className="mt-3 text-sm leading-6 text-gray-600">
                <p className="font-semibold text-gray-900">
                  {[
                    order
                      .shippingAddress
                      .firstName,

                    order
                      .shippingAddress
                      .lastName,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      " "
                    )}
                </p>

                {order
                  .shippingAddress
                  .company && (
                  <p>
                    {
                      order
                        .shippingAddress
                        .company
                    }
                  </p>
                )}

                <p>
                  {
                    order
                      .shippingAddress
                      .address1
                  }
                </p>

                {order
                  .shippingAddress
                  .address2 && (
                  <p>
                    {
                      order
                        .shippingAddress
                        .address2
                    }
                  </p>
                )}

                <p>
                  {[
                    order
                      .shippingAddress
                      .zip,

                    order
                      .shippingAddress
                      .city,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      " "
                    )}
                </p>

                <p>
                  {[
                    order
                      .shippingAddress
                      .province,

                    order
                      .shippingAddress
                      .country,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      ", "
                    )}
                </p>

                {order
                  .shippingAddress
                  .phoneNumber && (
                  <p className="mt-1">
                    Tel.{" "}
                    {
                      order
                        .shippingAddress
                        .phoneNumber
                    }
                  </p>
                )}
              </div>
            </div>
          )}

          {order.confirmationNumber && (
            <p className="mt-5 text-xs text-gray-400">
              Referencia de confirmación:{" "}
              {
                order.confirmationNumber
              }
            </p>
          )}
        </div>
      )}
    </article>
  );
}

/* ============================================================
   ORDER AMOUNT ROW
   ============================================================ */

function OrderAmountRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-500">
        {label}
      </span>

      <span className="font-semibold text-gray-900">
        {value}
      </span>
    </div>
  );
}