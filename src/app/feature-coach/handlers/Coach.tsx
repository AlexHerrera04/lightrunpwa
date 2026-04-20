import {
  FormEvent,
  FunctionComponent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from 'src/app/core/api/apiProvider';
import { useUser } from 'src/app/core/feature-user/provider/userProvider';
import withNavbar from 'src/app/core/handlers/withNavbar';

type PersonalityId = 'pragmatico' | 'motivador' | 'brutal';
type CoachTab = 'libre' | 'cerrado' | 'diagnostico';
type ChatMode = 'libre' | 'cerrado';
type CoachStep = 'personality' | 'coach';
type PanelKey = 'resumen' | 'contexto' | 'historial';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

type Goal = {
  id?: number | string;
  name?: string;
  title?: string;
  status?: string;
  priority?: string;
};

type Capacity = {
  aspect?: string;
  value?: number;
};

type HistorySession = {
  id: string;
  mode: ChatMode;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  personality: PersonalityId;
  messages: ChatMessage[];
};

type DiagnosticMeta = {
  generatedAt?: string;
  personality?: PersonalityId;
};

const COACH_API_URL =
  import.meta.env.VITE_COACH_API_URL || 'http://localhost:3001';

const FREE_CHAT_STORAGE_KEY = 'desktopCoachFreeMessages';
const CLOSED_CHAT_STORAGE_KEY = 'desktopCoachClosedMessages';
const PERSONALITY_KEY = 'desktopCoachPersonality';
const DIAGNOSTIC_STORAGE_KEY = 'desktopCoachDiagnosticReport';
const DIAGNOSTIC_META_STORAGE_KEY = 'desktopCoachDiagnosticMeta';
const CHAT_HISTORY_STORAGE_KEY = 'desktopCoachHistory';
const FREE_SESSION_STORAGE_KEY = 'desktopCoachFreeSessionId';
const CLOSED_SESSION_STORAGE_KEY = 'desktopCoachClosedSessionId';
const PERSONALITY_ONBOARDING_KEY = 'desktopCoachPersonalityChosen';

const DIAGNOSTIC_COOLDOWN_MS = 48 * 60 * 60 * 1000;

const PERSONALITIES: Record<
  PersonalityId,
  { label: string; emoji: string; description: string; prompt: string }
> = {
  pragmatico: {
    label: 'Pragmático',
    emoji: '⚡',
    description: 'Va al grano, con seriedad y cercanía.',
    prompt:
      'Eres un coach ejecutivo pragmático. Hablas de tú a tú, vas al grano, eres serio y cercano. Das contexto útil, pero no rodeos. Si detectas un problema, lo nombras con claridad y aterrizas en pasos concretos.',
  },
  motivador: {
    label: 'Motivador',
    emoji: '🌟',
    description: 'Anima y convierte energía en acción.',
    prompt:
      'Eres un coach ejecutivo motivador. Hablas de tú a tú con calidez, energía y cercanía. Das ánimo real, refuerzas lo valioso de la persona y conviertes esa energía en decisiones y acciones concretas.',
  },
  brutal: {
    label: 'Brutal',
    emoji: '👊',
    description: 'Frontal, exigente y útil.',
    prompt:
      'Eres un coach ejecutivo brutal. Hablas claro, detectas autoengaños y confrontas con firmeza. Puedes usar expresiones como "espabila", "deja de marearte" o similares si encajan, pero sin humillar. Tu objetivo es provocar avance real.',
  },
};

const CLOSED_ACTIONS = [
  '¿En qué debería enfocarme ahora mismo?',
  'Revisa mis metas y dime por dónde empezar.',
  'Dame un plan simple de 7 días para avanzar.',
  '¿Cuáles son mis fortalezas más aprovechables ahora mismo?',
];

const FREE_INITIAL_MESSAGE: ChatMessage = {
  id: 'free-initial-assistant',
  role: 'assistant',
  content:
    'Hola. Aquí puedes hablar conmigo con total libertad sobre tu situación, tus metas o cualquier bloqueo que quieras trabajar.',
};

const CLOSED_INITIAL_MESSAGE: ChatMessage = {
  id: 'closed-initial-assistant',
  role: 'assistant',
  content:
    'Esta es la conversación cerrada. No escribes libremente: eliges una acción y yo te respondo a partir de esa línea.',
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeParseJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeParseMessages(
  key: string,
  fallback: ChatMessage[]
): ChatMessage[] {
  const parsed = safeParseJson<ChatMessage[]>(key, fallback);
  return Array.isArray(parsed) && parsed.length ? parsed : fallback;
}

function safeReadString(key: string) {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function safeReadBoolean(key: string) {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function safeReadPersonality(): PersonalityId {
  const stored = safeReadString(PERSONALITY_KEY) as PersonalityId;
  return PERSONALITIES[stored] ? stored : 'pragmatico';
}

function safeReadDiagnosticMeta(): DiagnosticMeta {
  return safeParseJson<DiagnosticMeta>(DIAGNOSTIC_META_STORAGE_KEY, {});
}

function truncate(text: string, max = 52) {
  const value = text.trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function getModeLabel(mode: CoachTab | ChatMode) {
  if (mode === 'libre') return 'Conversación libre';
  if (mode === 'cerrado') return 'Conversación cerrada';
  return 'Diagnóstico';
}

function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dateString));
}

function buildContext(
  userAccountInfo: ReturnType<typeof useUser>['userAccountInfo'],
  goals: Goal[],
  capacities: Capacity[]
) {
  const topCapacities = [...capacities]
    .filter((item) => typeof item.value === 'number')
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 5)
    .map((item) => `${item.aspect}: ${item.value}%`);

  const pendingGoals = goals
    .filter((goal) => goal.status !== 'done')
    .slice(0, 6)
    .map(
      (goal) =>
        `- ${goal.name || goal.title || 'Meta sin nombre'} (${goal.status || 'sin estado'})`
    );

  const completedGoals = goals.filter((goal) => goal.status === 'done').length;

  const profileBits = [
    userAccountInfo?.public_name
      ? `Nombre público: ${userAccountInfo.public_name}`
      : null,
    userAccountInfo?.type ? `Tipo de cuenta: ${userAccountInfo.type}` : null,
    userAccountInfo?.profile?.length
      ? `Perfil: ${userAccountInfo.profile.join(', ')}`
      : null,
    userAccountInfo?.industry?.length
      ? `Industria: ${userAccountInfo.industry.join(', ')}`
      : null,
    userAccountInfo?.capacity?.length
      ? `Capacidades declaradas: ${userAccountInfo.capacity.join(', ')}`
      : null,
    userAccountInfo?.function?.length
      ? `Función: ${userAccountInfo.function.join(', ')}`
      : null,
    userAccountInfo?.level?.length
      ? `Nivel: ${userAccountInfo.level.join(', ')}`
      : null,
  ].filter(Boolean);

  return [
    'Contexto del usuario:',
    ...(profileBits.length ? profileBits : ['Sin datos de perfil disponibles.']),
    '',
    `Metas totales: ${goals.length}`,
    `Metas completadas: ${completedGoals}`,
    pendingGoals.length
      ? 'Metas pendientes:'
      : 'Metas pendientes: no se han detectado.',
    ...(pendingGoals.length ? pendingGoals : []),
    '',
    topCapacities.length
      ? 'Capacidades más fuertes:'
      : 'Capacidades más fuertes: sin datos.',
    ...(topCapacities.length ? topCapacities : []),
  ].join('\n');
}

function buildHistorySession(
  id: string,
  mode: ChatMode,
  messages: ChatMessage[],
  personality: PersonalityId,
  previous?: HistorySession
): HistorySession | null {
  const userMessages = messages.filter(
    (message) => message.role === 'user' && message.content.trim()
  );

  if (!userMessages.length) return null;

  const firstUserMessage = userMessages[0]?.content || '';
  const lastMessage = messages[messages.length - 1]?.content || firstUserMessage;
  const now = new Date().toISOString();

  return {
    id,
    mode,
    title: truncate(firstUserMessage, 40),
    preview: truncate(lastMessage, 72),
    createdAt: previous?.createdAt || now,
    updatedAt: now,
    personality,
    messages,
  };
}

function upsertHistorySession(
  history: HistorySession[],
  id: string,
  mode: ChatMode,
  messages: ChatMessage[],
  personality: PersonalityId
) {
  const existing = history.find((item) => item.id === id);
  const nextItem = buildHistorySession(id, mode, messages, personality, existing);

  if (!nextItem) {
    return history.filter((item) => item.id !== id);
  }

  return [nextItem, ...history.filter((item) => item.id !== id)]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 20);
}

async function askCoach(input: string, instructions: string) {
  const response = await fetch(`${COACH_API_URL}/api/coach`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input,
      instructions,
      maxTokens: 900,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || 'No se ha podido obtener respuesta del coach.');
  }

  if (!data?.text?.trim()) {
    throw new Error('Respuesta vacía del coach.');
  }

  return data.text.trim();
}

const Coach: FunctionComponent = () => {
  const navigate = useNavigate();
  const { userAccountInfo } = useUser();

  const storedDiagnosticMeta = safeReadDiagnosticMeta();

  const [step, setStep] = useState<CoachStep>(() =>
    safeReadBoolean(PERSONALITY_ONBOARDING_KEY) ? 'coach' : 'personality'
  );
  const [activeTab, setActiveTab] = useState<CoachTab>('libre');
  const [freeSessionId, setFreeSessionId] = useState(
    () => safeReadString(FREE_SESSION_STORAGE_KEY) || createId()
  );
  const [closedSessionId, setClosedSessionId] = useState(
    () => safeReadString(CLOSED_SESSION_STORAGE_KEY) || createId()
  );
  const [freeMessages, setFreeMessages] = useState<ChatMessage[]>(() =>
    safeParseMessages(FREE_CHAT_STORAGE_KEY, [FREE_INITIAL_MESSAGE])
  );
  const [closedMessages, setClosedMessages] = useState<ChatMessage[]>(() =>
    safeParseMessages(CLOSED_CHAT_STORAGE_KEY, [CLOSED_INITIAL_MESSAGE])
  );
  const [historySessions, setHistorySessions] = useState<HistorySession[]>(() =>
    safeParseJson<HistorySession[]>(CHAT_HISTORY_STORAGE_KEY, [])
  );
  const [previewSession, setPreviewSession] = useState<HistorySession | null>(null);
  const [previewOriginTab, setPreviewOriginTab] = useState<CoachTab | null>(null);
  const [diagnosticReport, setDiagnosticReport] = useState<string>(() =>
    safeReadString(DIAGNOSTIC_STORAGE_KEY)
  );
  const [diagnosticGeneratedAt, setDiagnosticGeneratedAt] = useState(
    () => storedDiagnosticMeta.generatedAt || ''
  );
  const [diagnosticPersonality, setDiagnosticPersonality] = useState<
    PersonalityId | ''
  >(() => storedDiagnosticMeta.personality || '');
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticError, setDiagnosticError] = useState('');
  const [personality, setPersonality] = useState<PersonalityId>(() =>
    safeReadPersonality()
  );
  const [openPanels, setOpenPanels] = useState({
    resumen: true,
    contexto: false,
    historial: false,
  });

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const goalsQuery = useQuery<Goal[]>({
    queryKey: ['coach-goals'],
    queryFn: async () => {
      const { data } = await api.get(`${import.meta.env.VITE_API_URL}/goals`);
      return Array.isArray(data) ? data : [];
    },
  });

  const capacitiesQuery = useQuery<Capacity[]>({
    queryKey: ['coach-capacities'],
    queryFn: async () => {
      const { data } = await api.get(
        `${import.meta.env.VITE_API_URL}/diagnoses/capacities-comparison`
      );
      return Array.isArray(data) ? data : [];
    },
  });

  useEffect(() => {
    localStorage.setItem(FREE_CHAT_STORAGE_KEY, JSON.stringify(freeMessages));
  }, [freeMessages]);

  useEffect(() => {
    localStorage.setItem(CLOSED_CHAT_STORAGE_KEY, JSON.stringify(closedMessages));
  }, [closedMessages]);

  useEffect(() => {
    localStorage.setItem(PERSONALITY_KEY, personality);
  }, [personality]);

  useEffect(() => {
    localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(historySessions));
  }, [historySessions]);

  useEffect(() => {
    localStorage.setItem(FREE_SESSION_STORAGE_KEY, freeSessionId);
  }, [freeSessionId]);

  useEffect(() => {
    localStorage.setItem(CLOSED_SESSION_STORAGE_KEY, closedSessionId);
  }, [closedSessionId]);

  useEffect(() => {
    localStorage.setItem(DIAGNOSTIC_STORAGE_KEY, diagnosticReport);
  }, [diagnosticReport]);

  useEffect(() => {
    localStorage.setItem(
      DIAGNOSTIC_META_STORAGE_KEY,
      JSON.stringify({
        generatedAt: diagnosticGeneratedAt,
        personality: diagnosticPersonality,
      })
    );
  }, [diagnosticGeneratedAt, diagnosticPersonality]);

  useEffect(() => {
    setHistorySessions((current) =>
      upsertHistorySession(current, freeSessionId, 'libre', freeMessages, personality)
    );
  }, [freeMessages, freeSessionId, personality]);

  useEffect(() => {
    setHistorySessions((current) =>
      upsertHistorySession(
        current,
        closedSessionId,
        'cerrado',
        closedMessages,
        personality
      )
    );
  }, [closedMessages, closedSessionId, personality]);

  const currentMessages =
    activeTab === 'libre' ? freeMessages : closedMessages;

  const displayMessages = previewSession ? previewSession.messages : currentMessages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, activeTab, chatLoading, previewSession]);

  const pendingGoals = (goalsQuery.data || [])
    .filter((goal) => goal.status !== 'done')
    .slice(0, 3);

  const topCapacities = [...(capacitiesQuery.data || [])]
    .filter((item) => typeof item.value === 'number')
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 3);

  const completedGoalsCount = (goalsQuery.data || []).filter(
    (goal) => goal.status === 'done'
  ).length;

  const totalGoalsCount = (goalsQuery.data || []).length;

  const hasFreeConversation = freeMessages.length > 1;
  const hasClosedConversation = closedMessages.length > 1;
  const currentHasConversation =
    activeTab === 'libre' ? hasFreeConversation : hasClosedConversation;
  const displayHasConversation = previewSession
    ? previewSession.messages.length > 1
    : currentHasConversation;

  const diagnosticAvailableAt = diagnosticGeneratedAt
    ? new Date(
        new Date(diagnosticGeneratedAt).getTime() + DIAGNOSTIC_COOLDOWN_MS
      )
    : null;

  const canGenerateDiagnostic =
    !diagnosticGeneratedAt ||
    Date.now() >=
      new Date(diagnosticGeneratedAt).getTime() + DIAGNOSTIC_COOLDOWN_MS;

  const togglePanel = (panel: PanelKey) => {
    setOpenPanels((current) => ({
      ...current,
      [panel]: !current[panel],
    }));
  };

  const closePreview = () => {
    if (previewOriginTab) {
      setActiveTab(previewOriginTab);
    }
    setPreviewSession(null);
    setPreviewOriginTab(null);
  };

  const handleTabChange = (tab: CoachTab) => {
    setPreviewSession(null);
    setPreviewOriginTab(null);
    setActiveTab(tab);
  };

  const openPersonalityStep = () => {
    setPreviewSession(null);
    setPreviewOriginTab(null);
    setStep('personality');
  };

  const selectPersonality = (nextPersonality: PersonalityId) => {
    setPersonality(nextPersonality);
    localStorage.setItem(PERSONALITY_ONBOARDING_KEY, 'true');
    setStep('coach');
  };

  const sendPrompt = async (text: string, mode: ChatMode) => {
    const cleanText = text.trim();
    if (!cleanText || chatLoading || previewSession) return;

    setChatError('');

    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content: cleanText,
    };

    const sourceMessages = mode === 'libre' ? freeMessages : closedMessages;
    const nextMessages = [...sourceMessages, userMessage];

    if (mode === 'libre') {
      setFreeMessages(nextMessages);
      setInput('');
    } else {
      setClosedMessages(nextMessages);
    }

    setChatLoading(true);

    try {
      const history = nextMessages
        .slice(-8)
        .map((message) =>
          `${message.role === 'user' ? 'Usuario' : 'Coach'}: ${message.content}`
        )
        .join('\n\n');

      const context = buildContext(
        userAccountInfo,
        goalsQuery.data || [],
        capacitiesQuery.data || []
      );

      const modeInstruction =
        mode === 'libre'
          ? 'Modo conversación libre: responde con naturalidad, cercanía y foco. No suenes robótico.'
          : 'Modo conversación cerrada: responde solo a la acción elegida por el usuario. Ve al grano, sé útil y no abras líneas innecesarias.';

      const instructions = [
        PERSONALITIES[personality].prompt,
        'Responde siempre en español.',
        'Habla de tú a tú.',
        'Que la personalidad elegida se note de verdad.',
        'Mantén un tono humano, natural y cercano.',
        'Sé concreto.',
        'Cuando propongas acciones, prioriza 3 como máximo.',
        'Si faltan datos, dilo de forma breve y continúa con una recomendación útil.',
        modeInstruction,
      ].join('\n');

      const coachReply = await askCoach(
        `${context}\n\nConversación reciente:\n${history}\n\nÚltimo mensaje del usuario:\n${cleanText}`,
        instructions
      );

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: 'assistant',
        content: coachReply,
      };

      if (mode === 'libre') {
        setFreeMessages((current) => [...current, assistantMessage]);
      } else {
        setClosedMessages((current) => [...current, assistantMessage]);
      }
    } catch (err: any) {
      setChatError(err?.message || 'Error inesperado al contactar con el coach.');
    } finally {
      setChatLoading(false);
    }
  };

  const generateDiagnostic = async () => {
    if (diagnosticLoading) return;

    if (!canGenerateDiagnostic) {
      setDiagnosticError(
        diagnosticAvailableAt
          ? `El diagnóstico solo se puede generar una vez cada 48 h. Podrás crear uno nuevo a partir del ${formatDateTime(
              diagnosticAvailableAt.toISOString()
            )}.`
          : 'El diagnóstico sigue bloqueado temporalmente.'
      );
      return;
    }

    setDiagnosticLoading(true);
    setDiagnosticError('');

    try {
      const context = buildContext(
        userAccountInfo,
        goalsQuery.data || [],
        capacitiesQuery.data || []
      );

      const instructions = [
        PERSONALITIES[personality].prompt,
        'Responde siempre en español.',
        'No hagas preguntas.',
        'No actúes como chat.',
        'Habla directamente a la persona, de tú a tú.',
        'No uses listas de puntos ni respuestas robóticas.',
        'Puedes usar subtítulos muy breves si ayudan, pero la respuesta debe leerse como una conversación humana.',
        'Que se note claramente la personalidad elegida.',
        'Incluye de forma natural un resumen rápido, la lectura del contexto actual, las metas prioritarias y el foco de los próximos 30 días.',
        'Si eres motivador, da ánimo de forma creíble.',
        'Si eres pragmático, ve al grano pero mantén cercanía.',
        'Si eres brutal, confronta con firmeza y utilidad, sin humillar.',
        'Máximo 500 palabras.',
        'No inventes datos que no estén en el contexto.',
      ].join('\n');

      const report = await askCoach(
        `${context}\n\nElabora un diagnóstico ejecutivo del usuario a partir de su perfil, su ADN digital y sus metas actuales.`,
        instructions
      );

      setDiagnosticReport(report);
      setDiagnosticGeneratedAt(new Date().toISOString());
      setDiagnosticPersonality(personality);
    } catch (err: any) {
      setDiagnosticError(
        err?.message || 'No se ha podido generar el diagnóstico.'
      );
    } finally {
      setDiagnosticLoading(false);
    }
  };

  useEffect(() => {
    if (
      activeTab === 'diagnostico' &&
      !diagnosticReport &&
      canGenerateDiagnostic &&
      !diagnosticLoading &&
      !goalsQuery.isLoading &&
      !capacitiesQuery.isLoading
    ) {
      void generateDiagnostic();
    }
  }, [
    activeTab,
    diagnosticReport,
    canGenerateDiagnostic,
    diagnosticLoading,
    goalsQuery.isLoading,
    capacitiesQuery.isLoading,
  ]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendPrompt(input, 'libre');
  };

  const resetCurrentTab = () => {
    setPreviewSession(null);
    setPreviewOriginTab(null);
    setChatError('');
    setDiagnosticError('');
    setInput('');

    if (activeTab === 'libre') {
      setFreeSessionId(createId());
      setFreeMessages([FREE_INITIAL_MESSAGE]);
      return;
    }

    if (activeTab === 'cerrado') {
      setClosedSessionId(createId());
      setClosedMessages([CLOSED_INITIAL_MESSAGE]);
      return;
    }

    if (!canGenerateDiagnostic) return;

    setDiagnosticReport('');
    void generateDiagnostic();
  };

  const openHistorySession = (session: HistorySession) => {
    if (!previewSession) {
      setPreviewOriginTab(activeTab);
    }
    setStep('coach');
    setActiveTab(session.mode);
    setChatError('');
    setPreviewSession(session);
  };

  const clearHistory = () => {
    setHistorySessions([]);
    setPreviewSession(null);
    setPreviewOriginTab(null);
  };

  const tabButtonClass = (tab: CoachTab) =>
    `rounded-xl px-4 py-3 text-sm font-semibold transition ${
      activeTab === tab
        ? 'bg-primary-600 text-white'
        : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
    }`;

  const panelArrowClass = (isOpen: boolean) =>
    `text-xs text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`;

  const personalitySelectionContent = (
    <div className="container mx-auto flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-gray-800 p-6 md:p-8">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.22em] text-primary-300">
          Coach AI
        </p>
        <h1 className="mt-3 text-center text-2xl font-bold text-white md:text-3xl">
          Elige la personalidad con la que quieres entrar
        </h1>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {(Object.keys(PERSONALITIES) as PersonalityId[]).map((key) => {
            const item = PERSONALITIES[key];
            const active = key === personality;

            return (
              <div
                key={key}
                className={`rounded-2xl border p-5 text-left transition ${
                  active
                    ? 'border-primary-500 bg-primary-600/15 text-white'
                    : 'border-white/10 bg-gray-900 text-gray-100'
                }`}
              >
                <span className="block text-3xl">{item.emoji}</span>
                <span className="mt-4 block text-lg font-semibold">
                  {item.label}
                </span>
                <span className="mt-2 block text-sm text-gray-300">
                  {item.description}
                </span>

                <button
                  type="button"
                  onClick={() => selectPersonality(key)}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-500"
                >
                  Seleccionar
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const coachContent = (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Coach AI</h1>
          <p className="mt-2 text-sm text-gray-300">
            Elige cómo quieres interactuar con tu Coach AI.
          </p>
        </div>

        <button
          type="button"
          onClick={resetCurrentTab}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          {activeTab === 'diagnostico'
            ? canGenerateDiagnostic
              ? 'Generar nuevo diagnóstico'
              : 'Diagnóstico bloqueado 48 h'
            : 'Nueva conversación +'}
        </button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => handleTabChange('libre')}
          className={tabButtonClass('libre')}
        >
          Conversación libre
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('cerrado')}
          className={tabButtonClass('cerrado')}
        >
          Conversación cerrada
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('diagnostico')}
          className={tabButtonClass('diagnostico')}
        >
          Diagnóstico
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1.45fr)] xl:grid-cols-[300px_minmax(0,1.7fr)]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-gray-800 p-5">
            <button
              type="button"
              onClick={() => togglePanel('resumen')}
              className="flex w-full items-center justify-between text-left"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                Resumen rápido
              </h2>
              <span className={panelArrowClass(openPanels.resumen)}>{'>'}</span>
            </button>

            {openPanels.resumen && (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-gray-900 px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Metas
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {goalsQuery.isLoading ? '...' : totalGoalsCount}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">Totales</p>
                  </div>

                  <div className="rounded-xl bg-gray-900 px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      ADN
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {capacitiesQuery.isLoading ? '...' : topCapacities.length}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">Puntos clave</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-gray-900 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Modo activo
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {previewSession
                      ? `${getModeLabel(previewSession.mode)} del historial`
                      : getModeLabel(activeTab)}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {activeTab === 'libre' &&
                      !previewSession &&
                      'Espacio abierto para conversar sin restricciones.'}
                    {activeTab === 'cerrado' &&
                      !previewSession &&
                      'Interacción guiada mediante acciones predefinidas.'}
                    {activeTab === 'diagnostico' &&
                      !previewSession &&
                      'Lectura automática de perfil, ADN y metas.'}
                    {previewSession &&
                      'Estás viendo un chat guardado. Tu conversación actual sigue intacta.'}
                  </p>
                </div>

                <div className="mt-4 rounded-xl bg-gray-900 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Personalidad activa
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {PERSONALITIES[personality].emoji}{' '}
                    {PERSONALITIES[personality].label}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {PERSONALITIES[personality].description}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-gray-800 p-5">
            <button
              type="button"
              onClick={() => togglePanel('contexto')}
              className="flex w-full items-center justify-between text-left"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                Contexto actual
              </h2>
              <span className={panelArrowClass(openPanels.contexto)}>{'>'}</span>
            </button>

            {openPanels.contexto && (
              <>
                <div className="mt-4 space-y-3 text-sm text-gray-200">
                  <div>
                    <span className="text-gray-400">Usuario:</span>{' '}
                    {userAccountInfo?.public_name || 'Sin nombre público'}
                  </div>
                  <div>
                    <span className="text-gray-400">Metas pendientes:</span>{' '}
                    {goalsQuery.isLoading ? 'Cargando...' : pendingGoals.length}
                  </div>
                  <div>
                    <span className="text-gray-400">Metas completadas:</span>{' '}
                    {goalsQuery.isLoading ? 'Cargando...' : completedGoalsCount}
                  </div>
                  <div>
                    <span className="text-gray-400">Capacidades fuertes:</span>{' '}
                    {capacitiesQuery.isLoading ? 'Cargando...' : topCapacities.length}
                  </div>
                </div>

                {!!pendingGoals.length && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Metas prioritarias
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate('/home')}
                        className="rounded px-2 py-1 text-xs font-bold text-primary-300 transition hover:bg-white/10 hover:text-white"
                        aria-label="Ir a las metas"
                        title="Ir a las metas"
                      >
                        {'>'}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {pendingGoals.map((goal) => (
                        <span
                          key={String(goal.id || goal.name || goal.title)}
                          className="rounded-full bg-white/10 px-3 py-1 text-xs text-white"
                        >
                          {goal.name || goal.title || 'Meta'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!!topCapacities.length && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Top capacidades
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {topCapacities.map((item) => (
                        <span
                          key={`${item.aspect}-${item.value}`}
                          className="rounded-full bg-primary-600/20 px-3 py-1 text-xs text-white"
                        >
                          {item.aspect}: {item.value}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-gray-800 p-5">
            <button
              type="button"
              onClick={() => togglePanel('historial')}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                  Historial
                </h2>
                
              </div>
              <span className={panelArrowClass(openPanels.historial)}>{'>'}</span>
            </button>

            {openPanels.historial && (
              <>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
                    {historySessions.length}
                  </span>

                  <button
                    type="button"
                    onClick={clearHistory}
                    disabled={!historySessions.length}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Borrar historial
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {!historySessions.length && (
                    <div className="rounded-xl bg-gray-900 px-4 py-3 text-sm text-gray-400">
                      Aún no hay chats guardados.
                    </div>
                  )}

                  {historySessions.map((session) => {
                    const isPreview = previewSession?.id === session.id;
                    const isCurrent =
                      !previewSession &&
                      ((session.mode === 'libre' &&
                        session.id === freeSessionId) ||
                        (session.mode === 'cerrado' &&
                          session.id === closedSessionId));

                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => openHistorySession(session)}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                          isPreview || isCurrent
                            ? 'border-primary-500 bg-primary-600/15 text-white'
                            : 'border-white/10 bg-gray-900 text-gray-200 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            {getModeLabel(session.mode)}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {formatDateTime(session.updatedAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {session.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {session.preview}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-gray-800 p-5">
  <button
    type="button"
    onClick={openPersonalityStep}
    className="flex w-full items-center justify-between text-left transition hover:text-white"
  >
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
        Cambiar personalidad
      </h2>
    </div>
    <span className="text-xs text-gray-400">{'>'}</span>
  </button>
</div>
        </aside>

        <section className="rounded-2xl border border-white/10 bg-gray-800">
          {previewSession && activeTab !== 'diagnostico' && (
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Viendo historial
                  </p>
                  <p className="mt-1 text-sm text-gray-200">
                    Estás viendo un chat guardado. Tu conversación actual sigue en
                    el presente.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closePreview}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                >
                  Volver al presente
                </button>
              </div>
            </div>
          )}

          {activeTab !== 'diagnostico' && (
            <div
              className={`px-5 pt-5 ${
                displayHasConversation
                  ? 'h-[64vh] space-y-4 overflow-y-auto pb-5 xl:h-[68vh]'
                  : 'space-y-4 pb-2'
              }`}
            >
              {displayMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user'
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-4xl rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-900 text-gray-100'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              ))}

              {chatLoading && !previewSession && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-gray-900 px-4 py-3 text-sm text-gray-300">
                    Pensando respuesta...
                  </div>
                </div>
              )}

              {chatError && !previewSession && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {chatError}
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}

          {activeTab === 'libre' && !previewSession && (
            <form
              onSubmit={handleSubmit}
              className={`p-5 ${
                displayHasConversation ? 'border-t border-white/10' : 'pt-3'
              }`}
            >
              <div className="flex flex-col gap-3">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Escribe qué te preocupa, qué quieres desbloquear o qué quieres analizar..."
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-primary-500"
                />

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={chatLoading || !input.trim()}
                    className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'cerrado' && !previewSession && (
            <div
              className={`p-5 ${
                displayHasConversation ? 'border-t border-white/10' : 'pt-3'
              }`}
            >
              <p className="mb-4 text-sm text-gray-300">
                Selecciona una acción para continuar.
              </p>

              <div className="grid gap-3 md:grid-cols-2">
                {CLOSED_ACTIONS.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => void sendPrompt(action, 'cerrado')}
                    disabled={chatLoading}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-left text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {previewSession && activeTab !== 'diagnostico' && (
            <div className="border-t border-white/10 px-5 py-4 text-xs text-gray-400">
              Este historial es solo de lectura.
            </div>
          )}

          {activeTab === 'diagnostico' && (
            <div className="min-h-[64vh] px-5 py-5 xl:min-h-[68vh]">
              {diagnosticLoading && (
                <div className="rounded-2xl bg-gray-900 px-4 py-4 text-sm text-gray-300">
                  Generando diagnóstico...
                </div>
              )}

              {diagnosticError && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {diagnosticError}
                </div>
              )}

              {!diagnosticLoading &&
                !diagnosticReport &&
                !canGenerateDiagnostic && (
                  <div className="rounded-2xl bg-gray-900 px-4 py-4 text-sm text-gray-300">
                    Ya tienes un diagnóstico generado. Puedes seguir viéndolo,
                    pero no crear otro hasta que pasen 48 h.
                  </div>
                )}

              {!diagnosticLoading && !diagnosticError && diagnosticReport && (
                <div className="rounded-2xl bg-gray-900 px-5 py-5 text-sm leading-7 text-gray-100">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Informe generado
                      </p>
                      <p className="mt-1 text-sm text-gray-300">
                        Estilo aplicado:{' '}
                        {
                          PERSONALITIES[
                            (diagnosticPersonality as PersonalityId) || personality
                          ].label
                        }
                      </p>
                      {diagnosticGeneratedAt && (
                        <p className="mt-1 text-xs text-gray-400">
                          Generado el {formatDateTime(diagnosticGeneratedAt)}
                        </p>
                      )}
                      {!canGenerateDiagnostic && diagnosticAvailableAt && (
                        <p className="mt-1 text-xs text-gray-400">
                          Nuevo diagnóstico disponible a partir del{' '}
                          {formatDateTime(diagnosticAvailableAt.toISOString())}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void generateDiagnostic()}
                      disabled={diagnosticLoading || !canGenerateDiagnostic}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Generar nuevo
                    </button>
                  </div>

                  <div className="whitespace-pre-wrap">{diagnosticReport}</div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );

  return withNavbar({
    children: step === 'personality' ? personalitySelectionContent : coachContent,
  });
};

export default Coach;