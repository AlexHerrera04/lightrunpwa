import {
  FunctionComponent,
  PropsWithChildren,
  useEffect,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'src/app/auth/provider/authProvider';
import { useUser } from 'src/app/core/feature-user/provider/userProvider';
import withNavbar from 'src/app/core/handlers/withNavbar';

type AccordionProps = PropsWithChildren<{
  title: string;
  defaultOpen?: boolean;
  lightMode: boolean;
}>;

const getStoredNumber = (
  key: string,
  allowedValues: number[],
  fallback: number
): number => {
  const storedValue = Number(localStorage.getItem(key));
  return allowedValues.includes(storedValue) ? storedValue : fallback;
};

const joinValues = (values?: Array<string> | null): string => {
  if (!values?.length) return '-';
  return values.filter(Boolean).join(', ');
};

const ProfileAccordion: FunctionComponent<AccordionProps> = ({
  title,
  children,
  defaultOpen = false,
  lightMode,
}) => {
  const [open, setOpen] = useState<boolean>(defaultOpen);

  return (
    <section
      className={`overflow-hidden rounded-3xl border transition-colors ${
        lightMode
          ? 'border-slate-200 bg-white shadow-sm'
          : 'border-slate-800 bg-slate-900/80 shadow-[0_20px_60px_rgba(0,0,0,0.25)]'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between px-5 py-4 text-left sm:px-6 ${
          lightMode ? 'hover:bg-slate-50' : 'hover:bg-slate-800/70'
        }`}
      >
        <span className="text-base font-semibold sm:text-lg">{title}</span>
        <svg
          className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open ? (
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
      ) : null}
    </section>
  );
};

const Profile: FunctionComponent = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { userInfo, userAccountInfo, setUserInfo, setUserAccountInfo } =
    useUser();

  const [darkMode, setDarkMode] = useState<boolean>(
    localStorage.getItem('darkMode') === 'false' ? false : true
  );
  const [numPreguntas, setNumPreguntas] = useState<number>(() =>
    getStoredNumber('numPreguntas', [5, 10, 15], 5)
  );
  const [frecDesafio, setFrecDesafio] = useState<number>(() =>
    getStoredNumber('frecDesafio', [3, 5, 7], 5)
  );
  const [personalidadCoach, setPersonalidadCoach] = useState<string>(
    localStorage.getItem('personalidadCoach') || 'Pragmático'
  );

  const lightMode = !darkMode;
  const opcionesPreguntas = [5, 10, 15];
  const opcionesFrecuencia = [3, 5, 7];
  const opcionesPersonalidad = ['Motivador', 'Pragmático', 'Brutal'];

  const targetSemanal = frecDesafio * numPreguntas;

  const historialCount = (() => {
    try {
      const savedHistory = JSON.parse(
        localStorage.getItem('historialContenidos') || '[]'
      ) as unknown;
      return Array.isArray(savedHistory) ? savedHistory.length : 0;
    } catch {
      return 0;
    }
  })();

  const likedCount = userAccountInfo?.liked_contents?.length || 0;

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('numPreguntas', String(numPreguntas));
  }, [numPreguntas]);

  useEffect(() => {
    localStorage.setItem('frecDesafio', String(frecDesafio));
  }, [frecDesafio]);

  useEffect(() => {
    localStorage.setItem('personalidadCoach', personalidadCoach);
  }, [personalidadCoach]);

  const handleLogout = () => {
    setUserInfo(null);
    setUserAccountInfo(null);
    logout();
    navigate('/login');
  };

  const itemClass = `flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition-colors sm:px-5 ${
    lightMode
      ? 'border-slate-200 bg-slate-50 text-slate-900'
      : 'border-slate-800 bg-slate-950/70 text-white'
  }`;

  const labelClass = lightMode
    ? 'text-sm font-medium text-slate-500'
    : 'text-sm font-medium text-slate-400';

  const valueClass = lightMode
    ? 'text-right text-sm font-semibold text-slate-900'
    : 'text-right text-sm font-semibold text-white';

  const selectorButtonClass = (
    active: boolean,
    disabled = false,
    tone: 'default' | 'danger' = 'default'
  ): string => {
    if (disabled) {
      return lightMode
        ? 'cursor-not-allowed rounded-full border border-dashed border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400'
        : 'cursor-not-allowed rounded-full border border-dashed border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-600';
    }

    if (tone === 'danger') {
      return active
        ? 'rounded-full border border-red-500 bg-red-500 px-3 py-2 text-sm font-semibold text-white'
        : lightMode
          ? 'rounded-full border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:border-red-400 hover:bg-red-50'
          : 'rounded-full border border-red-900/70 bg-slate-950 px-3 py-2 text-sm font-semibold text-red-400 hover:border-red-500 hover:bg-red-950/40';
    }

    return active
      ? 'rounded-full border border-purple-500 bg-purple-500 px-3 py-2 text-sm font-semibold text-white'
      : lightMode
        ? 'rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-purple-400 hover:text-purple-700'
        : 'rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-purple-500 hover:text-purple-300';
  };

  const pageContent = (
    <div
      className={`min-h-[calc(100vh-72px)] transition-colors ${
        lightMode
          ? 'bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] text-slate-900'
          : 'bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.18),_transparent_32%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white'
      }`}
    >
      <div className="container mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex items-center gap-4 sm:mb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors ${
              lightMode
                ? 'border-slate-200 bg-white text-slate-900 hover:bg-slate-100'
                : 'border-slate-800 bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div>
            <p
              className={`text-xs uppercase tracking-[0.35em] ${
                lightMode ? 'text-slate-500' : 'text-purple-300/80'
              }`}
            >
              Área personal
            </p>
            <h1 className="text-3xl font-black sm:text-4xl">Perfil</h1>
          </div>
        </div>

        <div className="mb-6 rounded-[28px] border border-purple-500/20 bg-purple-500/10 p-5 backdrop-blur sm:mb-8 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              
              <h2 className="text-2xl font-bold">
                {userAccountInfo?.public_name ||
                  userInfo?.username ||
                  'Usuario sin nombre público'}
              </h2>
              <p
                className={`mt-1 text-sm ${
                  lightMode ? 'text-slate-600' : 'text-slate-300'
                }`}
              >
                {userInfo?.email || 'Sin e-mail disponible'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('./change-password')}
                className={selectorButtonClass(false)}
              >
                Cambiar contraseña
              </button>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className={selectorButtonClass(false)}
              >
                Ver historial
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <ProfileAccordion
            title="Datos personales"
            defaultOpen={true}
            lightMode={lightMode}
          >
            <div className="space-y-3">
              <div className={itemClass}>
                <span className={labelClass}>Usuario</span>
                <span className={valueClass}>{userInfo?.username || '-'}</span>
              </div>
              <div className={itemClass}>
                <span className={labelClass}>Nombre público</span>
                <span className={valueClass}>
                  {userAccountInfo?.public_name || '-'}
                </span>
              </div>
              <div className={itemClass}>
                <span className={labelClass}>E-mail</span>
                <span className={valueClass}>{userInfo?.email || '-'}</span>
              </div>
              <div className={itemClass}>
                <span className={labelClass}>Nombre</span>
                <span className={valueClass}>{userInfo?.first_name || '-'}</span>
              </div>
              <div className={itemClass}>
                <span className={labelClass}>Apellido</span>
                <span className={valueClass}>{userInfo?.last_name || '-'}</span>
              </div>
              <div className={itemClass}>
                <span className={labelClass}>Mi score</span>
                <span className={valueClass}>
                  {userAccountInfo?.total_score ?? 0} puntos
                </span>
              </div>
            </div>
          </ProfileAccordion>

          <ProfileAccordion title="Perfil de empresa" lightMode={lightMode}>
            <div className="space-y-3">
              <div className={itemClass}>
                <span className={labelClass}>Empresa</span>
                <span className={valueClass}>
                  {userInfo?.organization || '-'}
                </span>
              </div>
              <div className={itemClass}>
                <span className={labelClass}>Industria</span>
                <span className={valueClass}>
                  {joinValues(userAccountInfo?.industry)}
                </span>
              </div>
              <div className={itemClass}>
                <span className={labelClass}>Función</span>
                <span className={valueClass}>
                  {joinValues(userAccountInfo?.function)}
                </span>
              </div>
              <div className={itemClass}>
                <span className={labelClass}>Nivel</span>
                <span className={valueClass}>
                  {joinValues(userAccountInfo?.level)}
                </span>
              </div>
              <div className={itemClass}>
                <span className={labelClass}>Tipo de cuenta</span>
                <span className={valueClass}>
                  {userAccountInfo?.type === 'company' ? 'Company' : 'Expert'}
                </span>
              </div>
            </div>
          </ProfileAccordion>

          <ProfileAccordion title="Contenido" lightMode={lightMode}>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate('/content')}
                className={`${itemClass} w-full`}
              >
                <span className={labelClass}>Contenido compartido</span>
                <span className={valueClass}>Ir al colaborador</span>
              </button>
              <div className={itemClass}>
                <span className={labelClass}>Mis favoritos</span>
                <span className={valueClass}>{likedCount} guardados</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className={`${itemClass} w-full`}
              >
                <span className={labelClass}>Mi historial</span>
                <span className={valueClass}>
                  {historialCount > 0
                    ? `${historialCount} vistos`
                    : 'Ver historial'}
                </span>
              </button>
            </div>
          </ProfileAccordion>

          <ProfileAccordion title="Preferencias" lightMode={lightMode}>
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => setDarkMode((current) => !current)}
                className={`${itemClass} w-full`}
              >
                <span className={labelClass}>Modo claro</span>
                <span className={valueClass}>{lightMode ? 'ON' : 'OFF'}</span>
              </button>

              <div className={itemClass}>
                <span className={labelClass}>Frecuencia de desafío semanal</span>
                <div className="flex flex-wrap justify-end gap-2">
                  {opcionesFrecuencia.map((option) => {
                    const blocked = option !== 5;

                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={blocked}
                        title={
                          blocked ? 'Temporalmente no disponible' : undefined
                        }
                        onClick={() => setFrecDesafio(option)}
                        className={selectorButtonClass(
                          frecDesafio === option,
                          blocked
                        )}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={itemClass}>
                <span className={labelClass}>Preguntas por desafío</span>
                <div className="flex flex-wrap justify-end gap-2">
                  {opcionesPreguntas.map((option) => {
                    const blocked = ![5, 10].includes(option);

                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={blocked}
                        title={
                          blocked ? 'Temporalmente no disponible' : undefined
                        }
                        onClick={() => setNumPreguntas(option)}
                        className={selectorButtonClass(
                          numPreguntas === option,
                          blocked
                        )}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={itemClass}>
                <span className={labelClass}>Target semanal</span>
                <span className={valueClass}>{targetSemanal} puntos</span>
              </div>

              <div className={itemClass}>
                <span className={labelClass}>Personalidad de mi Coach AI</span>
                <div className="flex flex-wrap justify-end gap-2">
                  {opcionesPersonalidad.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPersonalidadCoach(option)}
                      className={selectorButtonClass(
                        personalidadCoach === option
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/coach')}
                className={`${itemClass} w-full`}
              >
                <span className={labelClass}>
                  Recomendaciones de mi Coach AI
                </span>
                <span className={valueClass}>Ver</span>
              </button>
            </div>
          </ProfileAccordion>

          <ProfileAccordion title="Centro de ayuda" lightMode={lightMode}>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() =>
                  window.open('https://openkx.ai/support', '_blank')
                }
                className={`${itemClass} w-full`}
              >
                <span className={labelClass}>Soporte</span>
                <span className={valueClass}>Abrir centro de ayuda</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('./change-password')}
                className={`${itemClass} w-full`}
              >
                <span className={labelClass}>Privacidad y seguridad</span>
                <span className={valueClass}>Cambiar contraseña</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className={`${itemClass} w-full border-red-500/30 text-red-400`}
              >
                <span className="text-sm font-medium text-red-400">
                  Cerrar sesión
                </span>
                <span className="text-right text-sm font-semibold text-red-400">
                  Salir
                </span>
              </button>
            </div>
          </ProfileAccordion>
        </div>
      </div>
    </div>
  );

  return withNavbar({ children: pageContent });
};

export default Profile;