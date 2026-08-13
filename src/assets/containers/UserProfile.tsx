import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useUser } from "./useUser";
import UserPedidosPanel from "./UserPedidosPanel";
import UserReturnsPanel from "./UserReturnsPanel";

import {
  importLibrary,
  setOptions,
} from "@googlemaps/js-api-loader";

type ProfileSection =
  | "datos"
  | "direcciones"
  | "pedidos"
  | "devoluciones"
  | "seguridad";

type ProfileForm = {
  first_name: string;
  last_name: string;
  phone: string;
};

type AddressRow = {
  id: string;
  user_id: string;
  label: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company: string | null;
  address_line1: string;
  address_line2: string | null;
  postal_code: string;
  city: string;
  region: string | null;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

type AddressForm = {
  label: string;
  first_name: string;
  last_name: string;
  phone: string;
  company: string;
  address_line1: string;
  address_line2: string;
  postal_code: string;
  city: string;
  region: string;
  country: string;
  is_default: boolean;
};

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

const emptyAddress: AddressForm = {
  label: "",
  first_name: "",
  last_name: "",
  phone: "",
  company: "",
  address_line1: "",
  address_line2: "",
  postal_code: "",
  city: "",
  region: "",
  country: "España",
  is_default: false,
};

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";

let googleMapsConfigured = false;

function configureGoogleMaps() {
  if (
    googleMapsConfigured ||
    !GOOGLE_MAPS_API_KEY
  ) {
    return;
  }

  setOptions({
    key: GOOGLE_MAPS_API_KEY,
    v: "weekly",
    language: "es",
    region: "ES",
  });

  googleMapsConfigured = true;
}

function getAddressComponent(
  components: google.maps.GeocoderAddressComponent[],
  type: string,
  useShortName = false
) {
  const component =
    components.find((item) =>
      item.types.includes(type)
    );

  if (!component) return "";

  return useShortName
    ? component.short_name
    : component.long_name;
}

export default function UserProfile() {
  const navigate = useNavigate();

  const {
    user,
    setUser,
    initializing,
  } = useUser();
  
  const [
    activeSection,
    setActiveSection,
  ] =
    useState<ProfileSection>(
      "datos"
    );

  const [profile, setProfile] =
    useState<ProfileForm>({
      first_name: "",
      last_name: "",
      phone: "",
    });

  const [
    addresses,
    setAddresses,
  ] = useState<AddressRow[]>([]);

  const [
    addressForm,
    setAddressForm,
  ] =
    useState<AddressForm>(
      emptyAddress
    );

  const addressAutocompleteInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const autocompleteInstanceRef =
    useRef<google.maps.places.Autocomplete | null>(
      null
    );

  const [mapsError, setMapsError] =
    useState<string | null>(null);

  const [
    editingAddressId,
    setEditingAddressId,
  ] =
    useState<string | null>(null);

  const [
    showAddressForm,
    setShowAddressForm,
  ] = useState(false);

  const [
    loadingProfile,
    setLoadingProfile,
  ] = useState(true);

  const [
    savingProfile,
    setSavingProfile,
  ] = useState(false);

  const [
    savingAddress,
    setSavingAddress,
  ] = useState(false);

  const [
    deletingAddressId,
    setDeletingAddressId,
  ] =
    useState<string | null>(null);

  const [
    sendingPasswordEmail,
    setSendingPasswordEmail,
  ] = useState(false);

  const [notice, setNotice] =
    useState<Notice>(null);

  useEffect(() => {
    if (initializing) return;

    if (!user) {
      navigate("/usuario", {
        replace: true,
      });
      return;
    }

    let alive = true;

    const loadAll = async () => {
      setLoadingProfile(true);
      setNotice(null);

      const [
        profileResult,
        addressesResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            `
              first_name,
              last_name,
              phone
            `
          )
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("user_addresses")
          .select("*")
          .eq(
            "user_id",
            user.id
          )
          .order("is_default", {
            ascending: false,
          })
          .order("created_at", {
            ascending: true,
          }),
      ]);

      if (!alive) return;

      if (
        profileResult.error
      ) {
        setNotice({
          type: "error",
          message:
            "No se han podido cargar tus datos: " +
            profileResult.error
              .message,
        });
      }

      setProfile({
        first_name:
          profileResult.data
            ?.first_name ??
          String(
            user.user_metadata
              ?.first_name ?? ""
          ),

        last_name:
          profileResult.data
            ?.last_name ??
          String(
            user.user_metadata
              ?.last_name ?? ""
          ),

        phone:
          profileResult.data
            ?.phone ?? "",
      });

      if (
        addressesResult.error
      ) {
        setNotice({
          type: "error",
          message:
            "No se han podido cargar tus direcciones: " +
            addressesResult.error
              .message,
        });

        setAddresses([]);
      } else {
        setAddresses(
          (addressesResult.data ??
            []) as AddressRow[]
        );
      }

      setLoadingProfile(false);
    };

    void loadAll();

    return () => {
      alive = false;
    };
  }, [
    initializing,
    navigate,
    user,
  ]);

  useEffect(() => {
    if (!showAddressForm) {
      return;
    }

    const input =
      addressAutocompleteInputRef.current;

    if (!input) return;

    if (!GOOGLE_MAPS_API_KEY) {
      setMapsError(
        "Falta configurar VITE_GOOGLE_MAPS_API_KEY en el archivo .env."
      );

      return;
    }

    let listener:
      | google.maps.MapsEventListener
      | null = null;

    let cancelled = false;

    const initializeAutocomplete =
      async () => {
        try {
          configureGoogleMaps();

          const placesLibrary =
            (await importLibrary(
              "places"
            )) as google.maps.PlacesLibrary;

          if (cancelled) return;

          const autocomplete =
            new placesLibrary.Autocomplete(
              input,
              {
                fields: [
                  "address_components",
                  "formatted_address",
                  "name",
                ],

                types: [
                  "address",
                ],

                componentRestrictions:
                  {
                    country:
                      "es",
                  },
              }
            );

          autocompleteInstanceRef.current =
            autocomplete;

          listener =
            autocomplete.addListener(
              "place_changed",
              () => {
                const place =
                  autocomplete.getPlace();

                const components =
                  place.address_components ??
                  [];

                if (
                  components.length ===
                  0
                ) {
                  setMapsError(
                    "Selecciona una dirección de la lista de Google para completar los campos."
                  );

                  return;
                }

                const streetNumber =
                  getAddressComponent(
                    components,
                    "street_number"
                  );

                const route =
                  getAddressComponent(
                    components,
                    "route"
                  );

                const addressLine1 =
                  [
                    route,
                    streetNumber,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(" ");

                const selectedAddress =
                  addressLine1 ||
                  place.name ||
                  input.value;

                input.value =
                  selectedAddress;

                const subpremise =
                  getAddressComponent(
                    components,
                    "subpremise"
                  );

                const postalCode =
                  getAddressComponent(
                    components,
                    "postal_code"
                  );

                const city =
                  getAddressComponent(
                    components,
                    "locality"
                  ) ||
                  getAddressComponent(
                    components,
                    "postal_town"
                  ) ||
                  getAddressComponent(
                    components,
                    "administrative_area_level_3"
                  );

                const region =
                  getAddressComponent(
                    components,
                    "administrative_area_level_2"
                  ) ||
                  getAddressComponent(
                    components,
                    "administrative_area_level_1"
                  );

                const country =
                  getAddressComponent(
                    components,
                    "country"
                  );

                setAddressForm(
                  (current) => ({
                    ...current,

                    address_line1:
                      selectedAddress ||
                      current.address_line1,

                    address_line2:
                      subpremise ||
                      current.address_line2,

                    postal_code:
                      postalCode ||
                      current.postal_code,

                    city:
                      city ||
                      current.city,

                    region:
                      region ||
                      current.region,

                    country:
                      country ||
                      current.country,
                  })
                );

                setMapsError(
                  null
                );
              }
            );

          setMapsError(null);
        } catch (error) {
          console.error(
            "Error cargando Google Places:",
            error
          );

          if (!cancelled) {
            setMapsError(
              "No se ha podido cargar el buscador de direcciones de Google. Revisa la API key y las APIs activadas."
            );
          }
        }
      };

    void initializeAutocomplete();

    return () => {
      cancelled = true;

      if (listener) {
        listener.remove();
      }

      autocompleteInstanceRef.current =
        null;
    };
  }, [
    editingAddressId,
    showAddressForm,
  ]);

  const reloadAddresses =
    async () => {
      if (!user) return;

      const {
        data,
        error,
      } = await supabase
        .from("user_addresses")
        .select("*")
        .eq(
          "user_id",
          user.id
        )
        .order("is_default", {
          ascending: false,
        })
        .order("created_at", {
          ascending: true,
        });

      if (error) {
        setNotice({
          type: "error",
          message:
            "No se han podido actualizar las direcciones: " +
            error.message,
        });

        return;
      }

      setAddresses(
        (data ??
          []) as AddressRow[]
      );
    };

  const changeSection = (
    section: ProfileSection
  ) => {
    setActiveSection(section);
    setNotice(null);
  };

  const updateProfileField = <
    K extends keyof ProfileForm
  >(
    field: K,
    value: ProfileForm[K]
  ) => {
    setProfile(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  };

  const updateAddressField = <
    K extends keyof AddressForm
  >(
    field: K,
    value: AddressForm[K]
  ) => {
    setAddressForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  };

  const openNewAddressForm =
    () => {
      setEditingAddressId(
        null
      );

      setAddressForm({
        ...emptyAddress,

        first_name:
          profile.first_name,

        last_name:
          profile.last_name,

        phone:
          profile.phone,

        is_default:
          addresses.length ===
          0,
      });

      setShowAddressForm(
        true
      );

      setNotice(null);
      setMapsError(null);
    };

  const openEditAddressForm = (
    address: AddressRow
  ) => {
    setEditingAddressId(
      address.id
    );

    setAddressForm({
      label:
        address.label ?? "",

      first_name:
        address.first_name ??
        "",

      last_name:
        address.last_name ??
        "",

      phone:
        address.phone ?? "",

      company:
        address.company ?? "",

      address_line1:
        address.address_line1,

      address_line2:
        address.address_line2 ??
        "",

      postal_code:
        address.postal_code,

      city:
        address.city,

      region:
        address.region ?? "",

      country:
        address.country ||
        "España",

      is_default:
        address.is_default,
    });

    setShowAddressForm(
      true
    );

    setNotice(null);
    setMapsError(null);
  };

  const closeAddressForm =
    () => {
      setShowAddressForm(
        false
      );

      setEditingAddressId(
        null
      );

      setAddressForm(
        emptyAddress
      );

      setMapsError(null);
    };

  const savePersonalData =
    async () => {
      if (!user) return;

      setSavingProfile(true);
      setNotice(null);

      const firstName =
        profile.first_name.trim();

      const lastName =
        profile.last_name.trim();

      const phone =
        profile.phone.trim();

      const {
        error: profileError,
      } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,

            first_name:
              firstName ||
              null,

            last_name:
              lastName ||
              null,

            phone:
              phone ||
              null,

            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "id",
          }
        );

      if (profileError) {
        setSavingProfile(
          false
        );

        setNotice({
          type: "error",
          message:
            "No se han podido guardar tus datos: " +
            profileError.message,
        });

        return;
      }

      const {
        data,
        error: authError,
      } =
        await supabase.auth.updateUser(
          {
            data: {
              first_name:
                firstName,
              last_name:
                lastName,
            },
          }
        );

      setSavingProfile(false);

      if (authError) {
        setNotice({
          type: "error",
          message:
            "Los datos se guardaron en el perfil, pero no se pudieron actualizar en la cuenta: " +
            authError.message,
        });

        return;
      }

      setUser(data.user);

      setNotice({
        type: "success",
        message:
          "Tus datos personales se han guardado correctamente.",
      });
    };

  const saveAddress =
    async () => {
      if (!user) return;

      const addressLine1 =
        addressForm.address_line1.trim();

      const postalCode =
        addressForm.postal_code.trim();

      const city =
        addressForm.city.trim();

      const country =
        addressForm.country.trim();

      if (
        !addressLine1 ||
        !postalCode ||
        !city ||
        !country
      ) {
        setNotice({
          type: "error",
          message:
            "Completa la dirección, el código postal, la localidad y el país.",
        });

        return;
      }

      setSavingAddress(true);
      setNotice(null);

      const payload = {
        user_id: user.id,

        label:
          addressForm.label.trim() ||
          null,

        first_name:
          addressForm.first_name.trim() ||
          null,

        last_name:
          addressForm.last_name.trim() ||
          null,

        phone:
          addressForm.phone.trim() ||
          null,

        company:
          addressForm.company.trim() ||
          null,

        address_line1:
          addressLine1,

        address_line2:
          addressForm.address_line2.trim() ||
          null,

        postal_code:
          postalCode,

        city,

        region:
          addressForm.region.trim() ||
          null,

        country,

        is_default:
          addresses.length === 0
            ? true
            : addressForm.is_default,
      };

      const result =
        editingAddressId
          ? await supabase
              .from(
                "user_addresses"
              )
              .update(
                payload
              )
              .eq(
                "id",
                editingAddressId
              )
              .eq(
                "user_id",
                user.id
              )
          : await supabase
              .from(
                "user_addresses"
              )
              .insert(
                payload
              );

      setSavingAddress(false);

      if (result.error) {
        setNotice({
          type: "error",
          message:
            "No se ha podido guardar la dirección: " +
            result.error
              .message,
        });

        return;
      }

      await reloadAddresses();

      closeAddressForm();

      setNotice({
        type: "success",
        message:
          editingAddressId
            ? "La dirección se ha actualizado correctamente."
            : "La dirección se ha añadido correctamente.",
      });
    };

  const setDefaultAddress =
    async (
      addressId: string
    ) => {
      if (!user) return;

      setNotice(null);

      const { error } =
        await supabase
          .from(
            "user_addresses"
          )
          .update({
            is_default:
              true,
          })
          .eq(
            "id",
            addressId
          )
          .eq(
            "user_id",
            user.id
          );

      if (error) {
        setNotice({
          type: "error",
          message:
            "No se ha podido marcar la dirección como principal: " +
            error.message,
        });

        return;
      }

      await reloadAddresses();

      setNotice({
        type: "success",
        message:
          "La dirección se ha establecido como principal.",
      });
    };

  const deleteAddress =
    async (
      address: AddressRow
    ) => {
      if (!user) return;

      const confirmed =
        window.confirm(
          "¿Quieres eliminar esta dirección?"
        );

      if (!confirmed) {
        return;
      }

      setDeletingAddressId(
        address.id
      );

      setNotice(null);

      const { error } =
        await supabase
          .from(
            "user_addresses"
          )
          .delete()
          .eq(
            "id",
            address.id
          )
          .eq(
            "user_id",
            user.id
          );

      if (error) {
        setDeletingAddressId(
          null
        );

        setNotice({
          type: "error",
          message:
            "No se ha podido eliminar la dirección: " +
            error.message,
        });

        return;
      }

      const remainingAddresses =
        addresses.filter(
          (item) =>
            item.id !==
            address.id
        );

      if (
        address.is_default &&
        remainingAddresses.length >
          0
      ) {
        await supabase
          .from(
            "user_addresses"
          )
          .update({
            is_default:
              true,
          })
          .eq(
            "id",
            remainingAddresses[0]
              .id
          )
          .eq(
            "user_id",
            user.id
          );
      }

      setDeletingAddressId(
        null
      );

      await reloadAddresses();

      if (
        editingAddressId ===
        address.id
      ) {
        closeAddressForm();
      }

      setNotice({
        type: "success",
        message:
          "La dirección se ha eliminado correctamente.",
      });
    };

  const sendPasswordResetEmail =
    async () => {
      if (!user?.email) {
        setNotice({
          type: "error",
          message:
            "No se ha encontrado un correo electrónico asociado a tu cuenta.",
        });

        return;
      }

      setSendingPasswordEmail(
        true
      );

      setNotice(null);

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          user.email,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );

      setSendingPasswordEmail(
        false
      );

      if (error) {
        setNotice({
          type: "error",
          message:
            "No se ha podido enviar el correo para cambiar la contraseña: " +
            error.message,
        });

        return;
      }

      setNotice({
        type: "success",
        message:
          "Te hemos enviado un correo con un enlace seguro para cambiar la contraseña.",
      });
    };

  const logout = async () => {
    await supabase.auth.signOut();

    setUser(null);

    navigate("/usuario", {
      replace: true,
    });
  };

  if (
    initializing ||
    loadingProfile
  ) {
    return (
      <section className="flex min-h-[520px] items-center justify-center bg-[#f5f1e8]">
        <p className="text-[#697361]">
          Cargando tu perfil…
        </p>
      </section>
    );
  }

  if (!user) return null;

  const menuClass = (
    section: ProfileSection
  ) =>
    `w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
      activeSection ===
      section
        ? "bg-white text-[#425530] shadow-sm"
        : "text-white/75 hover:bg-white/10 hover:text-white"
    }`;

  const inputClass =
    "mt-2 w-full rounded-xl border border-[#d6ddcf] bg-[#fbfcf9] px-4 py-3 text-[#26341f] outline-none transition placeholder:text-[#a1a99b] focus:border-[#718360] focus:ring-4 focus:ring-[#718360]/10";

  return (
    <section className="bg-[#f5f1e8] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid overflow-hidden rounded-[2rem] border border-[#d7dece] bg-white shadow-[0_22px_60px_rgba(49,65,34,0.14)] lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="relative overflow-hidden bg-[#425530] p-6 text-white sm:p-7">
            <div className="pointer-events-none absolute -left-20 top-8 h-52 w-52 rounded-full bg-white/10 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-[#aabb98]/20 blur-3xl" />

            <div className="relative z-10">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                Área personal
              </p>

              <h1 className="mt-3 text-2xl font-semibold">
                Mi perfil
              </h1>

              <p className="mt-2 break-all text-sm text-white/65">
                {user.email}
              </p>

              <nav className="mt-8 space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    changeSection(
                      "datos"
                    )
                  }
                  className={menuClass(
                    "datos"
                  )}
                >
                  Mis datos
                </button>

                <button
                  type="button"
                  onClick={() =>
                    changeSection(
                      "direcciones"
                    )
                  }
                  className={menuClass(
                    "direcciones"
                  )}
                >
                  Mis direcciones
                </button>

                <button
                  type="button"
                  onClick={() =>
                    changeSection(
                      "pedidos"
                    )
                  }
                  className={menuClass(
                    "pedidos"
                  )}
                >
                  Mis pedidos
                </button>

                {/* NUEVO */}
                <button
                  type="button"
                  onClick={() =>
                    changeSection(
                      "devoluciones"
                    )
                  }
                  className={menuClass(
                    "devoluciones"
                  )}
                >
                  Devoluciones
                </button>

                <button
                  type="button"
                  onClick={() =>
                    changeSection(
                      "seguridad"
                    )
                  }
                  className={menuClass(
                    "seguridad"
                  )}
                >
                  Cambiar contraseña
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="mt-6 w-full rounded-xl border border-white/20 px-4 py-3 text-left text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
                >
                  Cerrar sesión
                </button>
              </nav>
            </div>
          </aside>

          <div className="min-w-0 p-6 sm:p-8 lg:p-10">
            {notice && (
              <div
                className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
                  notice.type ===
                  "success"
                    ? "border-[#cadabd] bg-[#f2f7ee] text-[#34502a]"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {notice.message}
              </div>
            )}

            {activeSection ===
              "datos" && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7d8a70]">
                  Información personal
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-[#26341f]">
                  Mis datos
                </h2>

                <p className="mt-2 text-sm text-[#737d6c]">
                  Consulta y actualiza los datos asociados a tu cuenta.
                </p>

                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="profileFirstName"
                      className="block text-sm font-semibold text-[#34412d]"
                    >
                      Nombre
                    </label>

                    <input
                      id="profileFirstName"
                      type="text"
                      value={
                        profile.first_name
                      }
                      onChange={(
                        event
                      ) =>
                        updateProfileField(
                          "first_name",
                          event.target
                            .value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="profileLastName"
                      className="block text-sm font-semibold text-[#34412d]"
                    >
                      Apellidos
                    </label>

                    <input
                      id="profileLastName"
                      type="text"
                      value={
                        profile.last_name
                      }
                      onChange={(
                        event
                      ) =>
                        updateProfileField(
                          "last_name",
                          event.target
                            .value
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="profilePhone"
                      className="block text-sm font-semibold text-[#34412d]"
                    >
                      Teléfono
                    </label>

                    <input
                      id="profilePhone"
                      type="tel"
                      value={
                        profile.phone
                      }
                      onChange={(
                        event
                      ) =>
                        updateProfileField(
                          "phone",
                          event.target
                            .value
                        )
                      }
                      autoComplete="tel"
                      className={
                        inputClass
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="profileEmail"
                      className="block text-sm font-semibold text-[#34412d]"
                    >
                      Correo electrónico
                    </label>

                    <input
                      id="profileEmail"
                      type="email"
                      value={
                        user.email ??
                        ""
                      }
                      disabled
                      className="mt-2 w-full cursor-not-allowed rounded-xl border border-[#e0e4db] bg-[#f2f3ef] px-4 py-3 text-[#8a9184]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void savePersonalData()
                  }
                  disabled={
                    savingProfile
                  }
                  className="mt-8 rounded-xl bg-[#425530] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#344526] disabled:opacity-50"
                >
                  {savingProfile
                    ? "Guardando…"
                    : "Guardar datos"}
                </button>
              </section>
            )}

            {activeSection ===
              "direcciones" && (
              <section>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7d8a70]">
                      Datos de envío
                    </p>

                    <h2 className="mt-2 text-2xl font-semibold text-[#26341f]">
                      Mis direcciones
                    </h2>

                    <p className="mt-2 text-sm text-[#737d6c]">
                      Guarda varias direcciones y elige cuál quieres utilizar como principal.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      openNewAddressForm
                    }
                    className="rounded-xl bg-[#425530] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#344526]"
                  >
                    Añadir dirección
                  </button>
                </div>

                {addresses.length ===
                0 ? (
                  <div className="mt-8 rounded-2xl border border-dashed border-[#ccd5c3] bg-[#fafbf8] p-10 text-center">
                    <p className="font-semibold text-[#394631]">
                      Todavía no tienes direcciones
                    </p>

                    <p className="mt-2 text-sm text-[#788170]">
                      Añade una dirección para utilizarla en tus pedidos.
                    </p>
                  </div>
                ) : (
                  <div className="mt-8 grid gap-4 md:grid-cols-2">
                    {addresses.map(
                      (
                        address
                      ) => (
                        <article
                          key={
                            address.id
                          }
                          className={`relative rounded-2xl border p-5 ${
                            address.is_default
                              ? "border-[#718360] bg-[#f4f7f1]"
                              : "border-[#dce2d5] bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-[#2c3a25]">
                                  {address.label ||
                                    "Dirección"}
                                </h3>

                                {address.is_default && (
                                  <span className="rounded-full bg-[#425530] px-2.5 py-1 text-[11px] font-semibold text-white">
                                    Principal
                                  </span>
                                )}
                              </div>

                              <p className="mt-3 text-sm font-medium text-[#3c4935]">
                                {[
                                  address.first_name,
                                  address.last_name,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    " "
                                  )}
                              </p>

                              {address.company && (
                                <p className="mt-1 text-sm text-[#687261]">
                                  {
                                    address.company
                                  }
                                </p>
                              )}

                              <p className="mt-2 text-sm leading-6 text-[#687261]">
                                {
                                  address.address_line1
                                }

                                {address.address_line2
                                  ? `, ${address.address_line2}`
                                  : ""}

                                <br />

                                {
                                  address.postal_code
                                }{" "}
                                {
                                  address.city
                                }

                                {address.region
                                  ? `, ${address.region}`
                                  : ""}

                                <br />

                                {
                                  address.country
                                }
                              </p>

                              {address.phone && (
                                <p className="mt-2 text-sm text-[#687261]">
                                  Tel.{" "}
                                  {
                                    address.phone
                                  }
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-2">
                            {!address.is_default && (
                              <button
                                type="button"
                                onClick={() =>
                                  void setDefaultAddress(
                                    address.id
                                  )
                                }
                                className="rounded-xl border border-[#718360] px-3 py-2 text-xs font-semibold text-[#425530] transition hover:bg-[#f0f4ec]"
                              >
                                Hacer principal
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                openEditAddressForm(
                                  address
                                )
                              }
                              className="rounded-xl border border-[#d1d8ca] px-3 py-2 text-xs font-semibold text-[#52604b] transition hover:bg-[#f6f8f3]"
                            >
                              Modificar
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void deleteAddress(
                                  address
                                )
                              }
                              disabled={
                                deletingAddressId ===
                                address.id
                              }
                              className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingAddressId ===
                              address.id
                                ? "Eliminando…"
                                : "Eliminar"}
                            </button>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                )}

                {showAddressForm && (
                  <div className="mt-8 rounded-2xl border border-[#dce3d5] bg-[#f8faf6] p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-[#2c3a25]">
                          {editingAddressId
                            ? "Modificar dirección"
                            : "Añadir dirección"}
                        </h3>

                        <p className="mt-1 text-sm text-[#747e6d]">
                          Los campos con dirección, código postal, localidad y país son obligatorios.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={
                          closeAddressForm
                        }
                        className="rounded-lg px-3 py-2 text-sm font-semibold text-[#697361] hover:bg-white"
                      >
                        Cerrar
                      </button>
                    </div>

                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-[#34412d]">
                          Nombre de la dirección
                        </label>

                        <input
                          type="text"
                          value={
                            addressForm.label
                          }
                          onChange={(
                            event
                          ) =>
                            updateAddressField(
                              "label",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="Casa, trabajo, padres…"
                          className={
                            inputClass
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#34412d]">
                          Nombre
                        </label>

                        <input
                          type="text"
                          value={
                            addressForm.first_name
                          }
                          onChange={(
                            event
                          ) =>
                            updateAddressField(
                              "first_name",
                              event
                                .target
                                .value
                            )
                          }
                          className={
                            inputClass
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#34412d]">
                          Apellidos
                        </label>

                        <input
                          type="text"
                          value={
                            addressForm.last_name
                          }
                          onChange={(
                            event
                          ) =>
                            updateAddressField(
                              "last_name",
                              event
                                .target
                                .value
                            )
                          }
                          className={
                            inputClass
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#34412d]">
                          Teléfono
                        </label>

                        <input
                          type="tel"
                          value={
                            addressForm.phone
                          }
                          onChange={(
                            event
                          ) =>
                            updateAddressField(
                              "phone",
                              event
                                .target
                                .value
                            )
                          }
                          className={
                            inputClass
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#34412d]">
                          Empresa
                          <span className="ml-1 font-normal text-[#8b9385]">
                            (opcional)
                          </span>
                        </label>

                        <input
                          type="text"
                          value={
                            addressForm.company
                          }
                          onChange={(
                            event
                          ) =>
                            updateAddressField(
                              "company",
                              event
                                .target
                                .value
                            )
                          }
                          className={
                            inputClass
                          }
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-[#34412d]">
                          Dirección
                        </label>

                        <input
                          key={
                            editingAddressId ??
                            "new-address"
                          }
                          ref={
                            addressAutocompleteInputRef
                          }
                          type="text"
                          defaultValue={
                            addressForm.address_line1
                          }
                          onInput={(
                            event
                          ) =>
                            updateAddressField(
                              "address_line1",
                              event
                                .currentTarget
                                .value
                            )
                          }
                          placeholder="Empieza a escribir la calle y selecciona una opción"
                          autoComplete="off"
                          className={
                            inputClass
                          }
                        />

                        <p className="mt-2 text-xs leading-5 text-[#7b8574]">
                          Selecciona una sugerencia de Google para rellenar automáticamente el código postal, la localidad, la provincia y el país.
                        </p>

                        {mapsError && (
                          <p className="mt-2 text-xs leading-5 text-amber-700">
                            {
                              mapsError
                            }
                          </p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-[#34412d]">
                          Piso, puerta u otros datos
                          <span className="ml-1 font-normal text-[#8b9385]">
                            (opcional)
                          </span>
                        </label>

                        <input
                          type="text"
                          value={
                            addressForm.address_line2
                          }
                          onChange={(
                            event
                          ) =>
                            updateAddressField(
                              "address_line2",
                              event
                                .target
                                .value
                            )
                          }
                          className={
                            inputClass
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#34412d]">
                          Código postal
                        </label>

                        <input
                          type="text"
                          value={
                            addressForm.postal_code
                          }
                          onChange={(
                            event
                          ) =>
                            updateAddressField(
                              "postal_code",
                              event
                                .target
                                .value
                            )
                          }
                          className={
                            inputClass
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#34412d]">
                          Localidad
                        </label>

                        <input
                          type="text"
                          value={
                            addressForm.city
                          }
                          onChange={(
                            event
                          ) =>
                            updateAddressField(
                              "city",
                              event
                                .target
                                .value
                            )
                          }
                          className={
                            inputClass
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#34412d]">
                          Provincia o región
                        </label>

                        <input
                          type="text"
                          value={
                            addressForm.region
                          }
                          onChange={(
                            event
                          ) =>
                            updateAddressField(
                              "region",
                              event
                                .target
                                .value
                            )
                          }
                          className={
                            inputClass
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#34412d]">
                          País
                        </label>

                        <input
                          type="text"
                          value={
                            addressForm.country
                          }
                          onChange={(
                            event
                          ) =>
                            updateAddressField(
                              "country",
                              event
                                .target
                                .value
                            )
                          }
                          className={
                            inputClass
                          }
                        />
                      </div>

                      <label className="flex cursor-pointer items-center gap-3 sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={
                            addressForm.is_default
                          }
                          onChange={(
                            event
                          ) =>
                            updateAddressField(
                              "is_default",
                              event
                                .target
                                .checked
                            )
                          }
                          className="h-4 w-4 rounded border-[#cbd3c2] text-[#425530] focus:ring-[#718360]"
                        />

                        <span className="text-sm font-semibold text-[#44513e]">
                          Usar como dirección principal
                        </span>
                      </label>
                    </div>

                    <div className="mt-7 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          void saveAddress()
                        }
                        disabled={
                          savingAddress
                        }
                        className="rounded-xl bg-[#425530] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#344526] disabled:opacity-50"
                      >
                        {savingAddress
                          ? "Guardando…"
                          : editingAddressId
                          ? "Guardar cambios"
                          : "Añadir dirección"}
                      </button>

                      <button
                        type="button"
                        onClick={
                          closeAddressForm
                        }
                        className="rounded-xl border border-[#ccd5c3] bg-white px-6 py-3 text-sm font-semibold text-[#52604b] hover:bg-[#f4f6f1]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {activeSection ===
              "pedidos" && (
              <UserPedidosPanel />
            )}

            {/* NUEVO */}
            {activeSection ===
              "devoluciones" && (
              <UserReturnsPanel />
            )}

            {activeSection ===
              "seguridad" && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7d8a70]">
                  Seguridad
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-[#26341f]">
                  Cambiar contraseña
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#737d6c]">
                  Para proteger tu cuenta, te enviaremos un enlace seguro a tu correo electrónico.
                </p>

                <div className="mt-8 max-w-xl rounded-2xl border border-[#dce3d5] bg-[#f7f9f5] p-5 sm:p-6">
                  <p className="text-sm font-semibold text-[#34412d]">
                    Correo de recuperación
                  </p>

                  <div className="mt-3 rounded-xl border border-[#d7ddd0] bg-white px-4 py-3 text-sm text-[#53604b]">
                    {user.email}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void sendPasswordResetEmail()
                    }
                    disabled={
                      sendingPasswordEmail
                    }
                    className="mt-6 rounded-xl bg-[#425530] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#344526] disabled:opacity-50"
                  >
                    {sendingPasswordEmail
                      ? "Enviando correo…"
                      : "Enviar enlace para cambiar contraseña"}
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}