import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  Boxes,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FilePlus2,
  History,
  LayoutDashboard,
  Lock,
  PackageCheck,
  PenLine,
  Search,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react'
import './App.css'

const today = new Date('2026-06-27T00:00:00')

const roles = [
  'Vista externa',
  'Responsable de atención',
  'Área técnica',
  'Inventario',
  'Jefatura técnica',
  'Compras',
  'Logística',
  'Cierre administrativo',
  'Administrador funcional',
]

const usersByRole = {
  'Vista externa': { name: 'Usuario externo', initials: 'UE' },
  'Responsable de atención': { name: 'Camila Soto', initials: 'CS' },
  'Área técnica': { name: 'Diego Lara', initials: 'DL' },
  Inventario: { name: 'Raul Torres', initials: 'RT' },
  'Jefatura técnica': { name: 'Marta Leiva', initials: 'ML' },
  Compras: { name: 'Elena Rivas', initials: 'ER' },
  Logística: { name: 'Julio Brenes', initials: 'JB' },
  'Cierre administrativo': { name: 'Iris Molina', initials: 'IM' },
  'Administrador funcional': { name: 'Admin QA', initials: 'AQ' },
}

const caseStates = [
  'Registrado',
  'Expediente pendiente',
  'Expediente completo',
  'En validación de disponibilidad',
  'Repuestos disponibles',
  'Repuestos pendientes',
  'Solicitud especial requerida',
  'Solicitud en seguimiento',
  'Disponibilidad parcial',
  'Disponibilidad completa',
  'Proforma adicional por daño oculto',
  'Compromiso pendiente',
  'Listo para cierre',
  'Cerrado',
]

const requestStates = ['Generada', 'Referenciada externamente', 'En seguimiento', 'En camino', 'Recibida parcial', 'Recibida completa']

const initialCases = [
  {
    id: 'CS-2410-018',
    client: 'Cliente Norte',
    unit: 'Unidad familiar 2024',
    unitCode: 'U-4821',
    owner: 'Camila Soto',
    state: 'Solicitud en seguimiento',
    listState: 'Solicitud especial activa',
    risk: 'Alto',
    budget: 'PR-2410-77',
    hasBudgetFile: true,
    requestId: 'SE-2410-031',
    requestState: 'Recibida parcial',
    externalRef: 'EXT-83019',
    supplier: 'Proveedor Delta',
    order: 'OC-4401',
    eta: '2026-08-02',
    originalEta: '2026-07-20',
    dateChanged: true,
    reception: 'Parcial',
    commitment: 'Instalacion pendiente',
    closureReady: false,
    availability: 72,
    lines: [
      { code: 'REP-1101', description: 'Conjunto frontal izquierdo', required: 2, available: 2, received: 2, state: 'Completa', request: '-' },
      { code: 'REP-1102', description: 'Soporte inferior', required: 1, available: 1, received: 1, state: 'Completa', request: '-' },
      { code: 'REP-1103', description: 'Cubierta lateral', required: 1, available: 1, received: 1, state: 'Completa', request: '-' },
      { code: 'REP-1104', description: 'Sensor auxiliar', required: 1, available: 1, received: 1, state: 'Completa', request: '-' },
      { code: 'REP-1105', description: 'Guia de ajuste', required: 2, available: 1, received: 1, state: 'Parcial', request: 'SE-2410-031' },
      { code: 'REP-1106', description: 'Moldura de cierre', required: 1, available: 0, received: 0, state: 'Pendiente', request: 'SE-2410-031' },
      { code: 'REP-1107', description: 'Clip de montaje', required: 3, available: 0, received: 0, state: 'Pendiente', request: 'SE-2410-031' },
    ],
    budgets: [
      { id: 'PR-2410-77', type: 'Inicial', document: 'Cargado', total: 1840, status: 'Autorizado' },
    ],
    log: [
      ['2026-06-19 08:10', 'Camila Soto', 'Responsable de atención', 'Estado', 'Expediente completo', 'Solicitud en seguimiento', 'Solicitud especial enviada'],
      ['2026-06-23 15:40', 'Julio Brenes', 'Logística', 'Fecha estimada', '20/07/2026', '02/08/2026', 'Retraso logistico'],
      ['2026-06-25 11:20', 'Elena Rivas', 'Compras', 'Recepción', 'Pendiente', 'Parcial', 'Llegaron algunas lineas'],
    ],
  },
  {
    id: 'CS-2410-019',
    client: 'Cliente Central',
    unit: 'Unidad compacta 2023',
    unitCode: 'U-1029',
    owner: 'Sofia Pineda',
    state: 'Disponibilidad completa',
    listState: 'Repuestos disponibles',
    risk: 'Bajo',
    budget: 'PR-2410-78',
    hasBudgetFile: true,
    requestId: '-',
    requestState: '-',
    externalRef: '-',
    supplier: '-',
    order: '-',
    eta: '2026-07-03',
    originalEta: '2026-07-03',
    dateChanged: false,
    reception: 'Completa',
    commitment: 'Sin compromisos',
    closureReady: false,
    availability: 100,
    lines: [
      { code: 'REP-2101', description: 'Kit de fijación', required: 1, available: 1, received: 1, state: 'Completa', request: '-' },
      { code: 'REP-2102', description: 'Cubierta protectora', required: 2, available: 2, received: 2, state: 'Completa', request: '-' },
      { code: 'REP-2103', description: 'Arnés auxiliar', required: 1, available: 1, received: 1, state: 'Completa', request: '-' },
    ],
    budgets: [{ id: 'PR-2410-78', type: 'Inicial', document: 'Cargado', total: 980, status: 'Autorizado' }],
    log: [
      ['2026-06-20 09:00', 'Raul Torres', 'Inventario', 'Disponibilidad', 'Pendiente', 'Completa', 'Inventario confirmado'],
    ],
  },
  {
    id: 'CS-2410-020',
    client: 'Cliente Pacifico',
    unit: 'Unidad ejecutiva 2022',
    unitCode: 'U-3901',
    owner: 'Camila Soto',
    state: 'Solicitud especial requerida',
    listState: 'Solicitud requerida',
    risk: 'Medio',
    budget: 'PR-2410-80',
    hasBudgetFile: true,
    requestId: 'SE-2410-032',
    requestState: 'Generada',
    externalRef: '',
    supplier: 'Proveedor Norte',
    order: 'Sin orden',
    eta: '2026-07-14',
    originalEta: '2026-07-14',
    dateChanged: false,
    reception: 'Pendiente',
    commitment: 'Validar proveedor',
    closureReady: false,
    availability: 55,
    lines: [
      { code: 'REP-3201', description: 'Modulo de ajuste', required: 2, available: 1, received: 0, state: 'Parcial', request: 'SE-2410-032' },
      { code: 'REP-3202', description: 'Base de refuerzo', required: 1, available: 0, received: 0, state: 'Pendiente', request: 'SE-2410-032' },
      { code: 'REP-3203', description: 'Cubierta superior', required: 1, available: 1, received: 1, state: 'Completa', request: '-' },
    ],
    budgets: [{ id: 'PR-2410-80', type: 'Inicial', document: 'Cargado', total: 1320, status: 'En revisión' }],
    log: [
      ['2026-06-22 10:15', 'Marta Leiva', 'Jefatura técnica', 'Solicitud especial', '-', 'SE-2410-032', 'Faltantes aprobados'],
    ],
  },
  {
    id: 'CS-2410-021',
    client: 'Cliente Sur',
    unit: 'Unidad comercial 2021',
    unitCode: 'U-7718',
    owner: 'Pablo Valle',
    state: 'Disponibilidad parcial',
    listState: 'Recepción parcial',
    risk: 'Alto',
    budget: 'PR-2410-81',
    hasBudgetFile: true,
    requestId: 'SE-2410-033',
    requestState: 'Recibida parcial',
    externalRef: 'EXT-88410',
    supplier: 'Proveedor Alfa',
    order: 'OC-4410',
    eta: '2026-07-19',
    originalEta: '2026-07-19',
    dateChanged: false,
    reception: 'Parcial',
    commitment: 'Reingreso técnico',
    closureReady: false,
    availability: 83,
    lines: [
      { code: 'REP-4101', description: 'Perfil externo', required: 2, available: 2, received: 2, state: 'Completa', request: 'SE-2410-033' },
      { code: 'REP-4102', description: 'Cierre interno', required: 1, available: 0, received: 0, state: 'Pendiente', request: 'SE-2410-033' },
      { code: 'REP-4103', description: 'Guía derecha', required: 1, available: 1, received: 1, state: 'Completa', request: '-' },
    ],
    budgets: [{ id: 'PR-2410-81', type: 'Inicial', document: 'Cargado', total: 1150, status: 'Autorizado' }],
    log: [
      ['2026-06-26 16:40', 'Elena Rivas', 'Compras', 'Recepción', 'Pendiente', 'Parcial', 'Se actualizo'],
    ],
  },
  {
    id: 'CS-2410-022',
    client: 'Cliente Lago',
    unit: 'Unidad operativa 2020',
    unitCode: 'U-2207',
    owner: 'Sofia Pineda',
    state: 'Solicitud en seguimiento',
    listState: 'Fecha vencida',
    risk: 'Critico',
    budget: 'PR-2410-82',
    hasBudgetFile: true,
    requestId: 'SE-2410-034',
    requestState: 'En seguimiento',
    externalRef: 'EXT-88411',
    supplier: 'Proveedor Sigma',
    order: 'OC-4412',
    eta: '2026-06-20',
    originalEta: '2026-06-20',
    dateChanged: false,
    reception: 'Pendiente',
    commitment: 'Cliente espera llamada',
    closureReady: false,
    availability: 44,
    lines: [
      { code: 'REP-5101', description: 'Conjunto de soporte', required: 2, available: 0, received: 0, state: 'Pendiente', request: 'SE-2410-034' },
      { code: 'REP-5102', description: 'Tapa de acceso', required: 1, available: 1, received: 0, state: 'Completa', request: '-' },
    ],
    budgets: [{ id: 'PR-2410-82', type: 'Inicial', document: 'Cargado', total: 760, status: 'Autorizado' }],
    log: [
      ['2026-06-17 13:00', 'Julio Brenes', 'Logística', 'Fecha estimada', '-', '20/06/2026', 'Fecha inicial'],
    ],
  },
  {
    id: 'CS-2410-023',
    client: 'Cliente Montaña',
    unit: 'Unidad utilitaria 2024',
    unitCode: 'U-7002',
    owner: 'Camila Soto',
    state: 'Proforma adicional por daño oculto',
    listState: 'Alcance nuevo',
    risk: 'Medio',
    budget: 'PR-2410-83',
    hasBudgetFile: true,
    requestId: 'SE-2410-035',
    requestState: 'Referenciada externamente',
    externalRef: 'EXT-89001',
    supplier: 'Proveedor Cobre',
    order: 'OC-4420',
    eta: '2026-07-24',
    originalEta: '2026-07-16',
    dateChanged: true,
    reception: 'Pendiente',
    commitment: 'Nueva proforma',
    closureReady: false,
    availability: 61,
    lines: [
      { code: 'REP-6101', description: 'Base secundaria', required: 1, available: 1, received: 1, state: 'Completa', request: '-' },
      { code: 'REP-6102', description: 'Sensor de apoyo', required: 1, available: 0, received: 0, state: 'Pendiente', request: 'SE-2410-035' },
    ],
    budgets: [
      { id: 'PR-2410-83', type: 'Inicial', document: 'Cargado', total: 1410, status: 'Autorizado' },
      { id: 'PR-2410-83-B', type: 'Daño oculto', document: 'Cargado', total: 420, status: 'Pendiente' },
    ],
    log: [
      ['2026-06-21 14:15', 'Diego Lara', 'Área técnica', 'Alcance', 'Inicial', 'Daño oculto', 'Se encontro alcance adicional'],
    ],
  },
  {
    id: 'CS-2410-024',
    client: 'Cliente Metro',
    unit: 'Unidad servicio 2022',
    unitCode: 'U-6200',
    owner: 'Pablo Valle',
    state: 'Compromiso pendiente',
    listState: 'Compromiso abierto',
    risk: 'Bajo',
    budget: 'PR-2410-84',
    hasBudgetFile: false,
    requestId: '-',
    requestState: '-',
    externalRef: '-',
    supplier: '-',
    order: '-',
    eta: '2026-07-05',
    originalEta: '2026-07-05',
    dateChanged: false,
    reception: 'Completa',
    commitment: 'Enviar evidencia de instalación',
    closureReady: false,
    availability: 100,
    lines: [
      { code: 'REP-7101', description: 'Elemento de ajuste', required: 1, available: 1, received: 1, state: 'Completa', request: '-' },
      { code: 'REP-7102', description: 'Cubierta menor', required: 1, available: 1, received: 1, state: 'Completa', request: '-' },
    ],
    budgets: [{ id: 'PR-2410-84', type: 'Inicial', document: 'Pendiente', total: 640, status: 'Autorizado' }],
    log: [
      ['2026-06-24 09:10', 'Iris Molina', 'Cierre administrativo', 'Compromiso', '-', 'Pendiente', 'Falta evidencia'],
    ],
  },
  {
    id: 'CS-2410-025',
    client: 'Cliente Bosque',
    unit: 'Unidad especial 2023',
    unitCode: 'U-9021',
    owner: 'Camila Soto',
    state: 'Listo para cierre',
    listState: 'Cierre listo',
    risk: 'Bajo',
    budget: 'PR-2410-85',
    hasBudgetFile: true,
    requestId: 'SE-2410-036',
    requestState: 'Recibida completa',
    externalRef: 'EXT-90011',
    supplier: 'Proveedor Prisma',
    order: 'OC-4431',
    eta: '2026-07-01',
    originalEta: '2026-07-01',
    dateChanged: false,
    reception: 'Completa',
    commitment: 'Sin compromisos',
    closureReady: true,
    availability: 100,
    lines: [
      { code: 'REP-8101', description: 'Kit de cierre', required: 1, available: 1, received: 1, state: 'Completa', request: 'SE-2410-036' },
      { code: 'REP-8102', description: 'Ajustador lateral', required: 2, available: 2, received: 2, state: 'Completa', request: 'SE-2410-036' },
    ],
    budgets: [{ id: 'PR-2410-85', type: 'Inicial', document: 'Cargado', total: 890, status: 'Autorizado' }],
    log: [
      ['2026-06-26 10:30', 'Iris Molina', 'Cierre administrativo', 'Checklist', 'Pendiente', 'Listo', 'Sin pendientes'],
    ],
  },
]

const alertSeed = [
  { id: 'A-01', title: 'Nueva validacion de inventario', detail: 'CS-2410-020 requiere revisar faltantes.', role: 'Inventario', tone: 'blue' },
  { id: 'A-02', title: 'Fecha vencida', detail: 'CS-2410-022 se vencio el 20/06/2026.', role: 'Vista externa', tone: 'red' },
  { id: 'A-03', title: 'Cambio de fecha', detail: 'CS-2410-018 cambio al 02/08/2026.', role: 'Responsable de atención', tone: 'orange' },
  { id: 'A-04', title: 'Recepcion completa', detail: 'CS-2410-025 aun aparece como alerta vencida.', role: 'Logística', tone: 'red' },
  { id: 'A-05', title: 'Compromiso pendiente', detail: 'CS-2410-024 no tiene evidencia cargada.', role: 'Cierre administrativo', tone: 'gray' },
]

const initialDraft = {
  client: '',
  unit: '',
  budget: '',
  eta: '2026-06-15',
  available: '5',
  required: '2',
  requestId: 'SE-2410-031',
}

function formatDate(dateValue) {
  if (!dateValue || dateValue === '-') return '-'
  const [year, month, day] = dateValue.split('-')
  return `${day}/${month}/${year}`
}

function isOverdue(dateValue) {
  if (!dateValue || dateValue === '-') return false
  return new Date(`${dateValue}T00:00:00`) < today
}

function countOpenRequests(casesData) {
  return casesData.filter((item) => item.requestId !== '-' && item.requestState !== 'Recibida completa').length + 1
}

function stateTone(value) {
  if (['Listo para cierre', 'Disponibilidad completa', 'Repuestos disponibles', 'Recibida completa', 'Completa', 'Cierre listo'].includes(value)) return 'green'
  if (['Critico', 'Alto', 'Fecha vencida', 'Pendiente'].includes(value)) return 'red'
  if (['Solicitud en seguimiento', 'Recibida parcial', 'Parcial', 'Disponibilidad parcial', 'Solicitud especial activa'].includes(value)) return 'orange'
  if (['Medio', 'Solicitud requerida', 'En seguimiento', 'En camino'].includes(value)) return 'gold'
  return 'blue'
}

function roleCan(role, action) {
  const permissions = {
    closeCase: ['Cierre administrativo', 'Administrador funcional', 'Compras'],
    editDocuments: ['Responsable de atención', 'Administrador funcional', 'Logística'],
    editLines: ['Inventario', 'Administrador funcional', 'Cierre administrativo'],
    editSupplier: ['Compras', 'Administrador funcional', 'Inventario'],
    changeDate: ['Compras', 'Logística', 'Responsable de atención', 'Administrador funcional'],
    receive: ['Compras', 'Logística', 'Administrador funcional'],
    createCase: ['Responsable de atención', 'Administrador funcional'],
  }
  return permissions[action]?.includes(role)
}

function App() {
  const [section, setSection] = useState('dashboard')
  const [role, setRole] = useState('Responsable de atención')
  const [casesData, setCasesData] = useState(initialCases)
  const [selectedId, setSelectedId] = useState(initialCases[0].id)
  const [caseTab, setCaseTab] = useState('Cierre')
  const [filters, setFilters] = useState({ query: '', state: 'Todos', owner: 'Todos', risk: 'Todos', request: 'Todos' })
  const [draft, setDraft] = useState(initialDraft)
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')

  const activeUser = usersByRole[role]
  const selectedCase = casesData.find((item) => item.id === selectedId) || casesData[0]

  const filteredCases = useMemo(() => {
    const query = filters.query.trim().toLowerCase()
    return casesData.filter((item) => {
      const requestFilter = filters.request === 'Todos'
        || (filters.request === 'Con solicitud' && item.requestId !== '-')
        || (filters.request === 'Sin solicitud' && item.requestId === '-')
      return (!query || `${item.id} ${item.client} ${item.unit} ${item.unitCode}`.toLowerCase().includes(query))
        && (filters.state === 'Todos' || item.state === filters.state)
        && (filters.owner === 'Todos' || item.owner === filters.owner)
        && (filters.risk === 'Todos' || item.risk === filters.risk)
        && requestFilter
    })
  }, [casesData, filters])

  const kpis = [
    { label: 'Casos abiertos', value: casesData.filter((item) => item.state !== 'Cerrado').length, icon: BriefcaseBusiness },
    { label: 'Expedientes pendientes', value: casesData.filter((item) => !item.hasBudgetFile || item.state === 'Expediente pendiente').length, icon: FilePlus2 },
    { label: 'Solicitudes abiertas', value: countOpenRequests(casesData), icon: Boxes },
    { label: 'Lineas vencidas', value: casesData.filter((item) => isOverdue(item.eta)).length, icon: CalendarClock },
    { label: 'Recepciones parciales', value: casesData.filter((item) => item.reception === 'Parcial').length, icon: PackageCheck },
    { label: 'Listos para cierre', value: casesData.filter((item) => item.closureReady).length, icon: ClipboardCheck },
  ]

  function openCase(caseId) {
    setSelectedId(caseId)
    setCaseTab('Cierre')
    setFilters({ query: '', state: 'Todos', owner: 'Todos', risk: 'Todos', request: 'Todos' })
    setSection('case')
  }

  function patchCase(caseId, patch) {
    setCasesData((current) => current.map((item) => (item.id === caseId ? { ...item, ...patch } : item)))
    setSelectedId(caseId)
  }

  function showMessage(message) {
    setToast(message)
    window.clearTimeout(showMessage.timer)
    showMessage.timer = window.setTimeout(() => setToast(''), 2200)
  }

  function handleAction(action) {
    if (action === 'Cerrar') {
      patchCase(selectedCase.id, { state: 'Cerrado', listState: 'Cerrado', closureReady: false })
      showMessage('Listo')
      setModal(null)
      return
    }
    if (action === 'Completar disponibilidad') {
      patchCase(selectedCase.id, { state: 'Disponibilidad completa', listState: 'Repuestos disponibles', availability: 100 })
      showMessage('Proceso realizado')
      setModal(null)
      return
    }
    if (action === 'Cambiar fecha') {
      patchCase(selectedCase.id, { eta: draft.eta, dateChanged: true })
      showMessage('Guardado correctamente')
      setModal(null)
      return
    }
    if (action === 'Recepción') {
      patchCase(selectedCase.id, { reception: 'Completa', requestState: 'Recibida completa', state: selectedCase.id === 'CS-2410-021' ? 'Disponibilidad completa' : selectedCase.state })
      showMessage('Operacion exitosa')
      setModal(null)
      return
    }
    if (action === 'Crear') {
      const nextId = draft.client.trim() ? `CS-2410-0${casesData.length + 18}` : 'CS-2410-018'
      const newCase = {
        ...initialCases[1],
        id: nextId,
        client: draft.client || '',
        unit: draft.unit || '',
        unitCode: 'U-NUEVO',
        owner: activeUser.name,
        state: 'Registrado',
        listState: 'Nuevo registro',
        budget: draft.budget || 'Sin presupuesto',
        hasBudgetFile: false,
        eta: draft.eta,
        requestId: draft.requestId,
        requestState: 'Generada',
        availability: 0,
        closureReady: false,
        lines: [
          { code: 'REP-N001', description: 'Linea capturada', required: Number(draft.required || 0), available: Number(draft.available || 0), received: 0, state: 'Pendiente', request: draft.requestId },
        ],
        budgets: [{ id: draft.budget || 'Sin presupuesto', type: 'Inicial', document: 'Pendiente', total: 0, status: 'Pendiente' }],
        log: [],
      }
      setCasesData((current) => [newCase, ...current])
      setSelectedId(newCase.id)
      setSection('case')
      setModal(null)
      showMessage('Se guardo')
    }
  }

  function renderSection() {
    if (section === 'dashboard') return <Dashboard kpis={kpis} alerts={alertSeed} casesData={casesData} onOpenCase={openCase} />
    if (section === 'cases') return <CasesList casesData={filteredCases} filters={filters} setFilters={setFilters} onOpenCase={openCase} />
    if (section === 'register') return <RegisterCase draft={draft} setDraft={setDraft} role={role} onProcess={() => setModal('Crear')} />
    if (section === 'case') {
      return (
        <CaseDetail
          role={role}
          item={selectedCase}
          tab={caseTab}
          setTab={setCaseTab}
          onBack={() => setSection('cases')}
          onModal={setModal}
          onPatch={patchCase}
        />
      )
    }
    return <Dashboard kpis={kpis} alerts={alertSeed} casesData={casesData} onOpenCase={openCase} />
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" type="button" onClick={() => setSection('dashboard')}>
          <span className="brand-logo">
            <img src={`${import.meta.env.BASE_URL}nara-logo.png`} alt="NARA Consultores" />
          </span>
          <span>
            <strong>Evaluación Proyecto</strong>
            <small>Portal de Seguimiento</small>
          </span>
        </button>

        <nav className="nav">
          <NavButton active={section === 'dashboard'} icon={LayoutDashboard} label="Dashboard" onClick={() => setSection('dashboard')} />
          <NavButton active={section === 'cases'} icon={BriefcaseBusiness} label="Bandeja de casos" onClick={() => setSection('cases')} />
          <NavButton active={section === 'register'} icon={FilePlus2} label="Registro" onClick={() => setSection('register')} />
          <NavButton active={section === 'case'} icon={ClipboardCheck} label="Detalle actual" onClick={() => setSection('case')} />
        </nav>

        <div className="role-card">
          <div className="role-head">
            <span className="avatar">{activeUser.initials}</span>
            <span>
              <strong>{activeUser.name}</strong>
              <small>{role}</small>
            </span>
          </div>
          <label>
            Cambiar rol activo
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              {roles.map((roleName) => <option key={roleName}>{roleName}</option>)}
            </select>
          </label>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p>NARA Consultores - Portal QA</p>
            <h1>{section === 'dashboard' ? 'Dashboard operativo' : section === 'cases' ? 'Bandeja de casos' : section === 'register' ? 'Registro de caso' : selectedCase.id}</h1>
          </div>
          <div className="top-actions">
            <span className="audit-badge">Ambiente de evaluación</span>
            <button className="secondary" type="button" onClick={() => showMessage('Accion completada')}>Exportar</button>
          </div>
        </header>
        <div className="content">{renderSection()}</div>
      </main>

      {modal && (
        <ActionModal
          name={modal}
          item={selectedCase}
          draft={draft}
          setDraft={setDraft}
          role={role}
          onClose={() => setModal(null)}
          onConfirm={() => handleAction(modal)}
        />
      )}

      {toast && <div className="toast"><CheckCircle2 size={18} /> {toast}</div>}
    </div>
  )
}

function NavButton({ active, icon: Icon, label, onClick }) {
  return (
    <button className={`nav-button ${active ? 'active' : ''}`} type="button" onClick={onClick}>
      <Icon size={17} />
      <span>{label}</span>
    </button>
  )
}

function Dashboard({ kpis, alerts, casesData, onOpenCase }) {
  return (
    <section className="stack">
      <div className="metrics-grid">
        {kpis.map((metric, index) => {
          const Icon = metric.icon
          return (
            <article className={`metric-card ${index === 2 ? 'odd-space' : ''}`} key={metric.label}>
              <Icon size={21} />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          )
        })}
      </div>

      <div className="two-column">
        <Panel title="Alertas internas" icon={AlertTriangle}>
          <div className="alert-list">
            {alerts.map((alert) => (
              <button className="alert-row" type="button" key={alert.id}>
                <Pill tone={alert.tone}>{alert.title}</Pill>
                <strong>{alert.detail}</strong>
                <span>Dirigido a: {alert.role}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Casos con mas fricción" icon={ShieldCheck}>
          <DataTable
            columns={['Caso', 'Unidad', 'Estado', 'Riesgo', 'Acción']}
            rows={casesData.slice(0, 5).map((item) => [
              item.id,
              item.unitCode,
              <Pill key="state" tone={stateTone(item.listState)}>{item.listState}</Pill>,
              <Pill key="risk" tone={stateTone(item.risk)}>{item.risk}</Pill>,
              <button key="open" className="row-action" type="button" onClick={() => onOpenCase(item.id)}>Abrir</button>,
            ])}
          />
        </Panel>
      </div>
    </section>
  )
}

function CasesList({ casesData, filters, setFilters, onOpenCase }) {
  const owners = ['Todos', ...Array.from(new Set(initialCases.map((item) => item.owner)))]
  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h2>Consulta de seguimiento</h2>
          <p>Filtre casos por estado, responsable, unidad, fecha, riesgo y solicitud especial.</p>
        </div>
        <button className="primary" type="button">Filtrar</button>
      </div>

      <div className="filter-grid">
        <label>
          Buscar
          <div className="input-icon">
            <Search size={16} />
            <input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Caso o unidad" />
          </div>
        </label>
        <label>
          Estado
          <select value={filters.state} onChange={(event) => setFilters({ ...filters, state: event.target.value })}>
            <option>Todos</option>
            {caseStates.map((state) => <option key={state}>{state}</option>)}
          </select>
        </label>
        <label>
          Responsable
          <select value={filters.owner} onChange={(event) => setFilters({ ...filters, owner: event.target.value })}>
            {owners.map((owner) => <option key={owner}>{owner}</option>)}
          </select>
        </label>
        <label>
          Riesgo
          <select value={filters.risk} onChange={(event) => setFilters({ ...filters, risk: event.target.value })}>
            {['Todos', 'Bajo', 'Medio', 'Alto', 'Critico'].map((risk) => <option key={risk}>{risk}</option>)}
          </select>
        </label>
        <label>
          Solicitud especial
          <select value={filters.request} onChange={(event) => setFilters({ ...filters, request: event.target.value })}>
            {['Todos', 'Con solicitud', 'Sin solicitud'].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <button className="secondary low-button" type="button" onClick={() => setFilters({ query: '', state: 'Todos', owner: 'Todos', risk: 'Todos', request: 'Todos' })}>Limpiar</button>
      </div>

      <DataTable
        columns={['Caso', 'Unidad', 'Responsable', 'Estado', 'Presupuesto', 'Solicitud especial', 'Fecha estimada', 'Disponibilidad', 'Riesgo', '']}
        rows={casesData.map((item) => [
          item.id,
          <span key="unit"><strong>{item.unit}</strong><small>{item.unitCode}</small></span>,
          item.owner,
          <Pill key="state" tone={stateTone(item.listState)} clipped>{item.listState}</Pill>,
          item.budget,
          item.requestId,
          formatDate(item.eta),
          <Progress key="availability" value={item.availability} />,
          <Pill key="risk" tone={stateTone(item.risk)}>{item.risk}</Pill>,
          <button key="open" className="row-action" type="button" onClick={() => onOpenCase(item.id)}>Abrir</button>,
        ])}
        looseDates
      />
    </section>
  )
}

function RegisterCase({ draft, setDraft, role, onProcess }) {
  const canCreate = roleCan(role, 'createCase')
  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h2>Registro de caso y expediente</h2>
          <p>Alta rápida para expediente, presupuesto/proforma y primera solicitud.</p>
        </div>
        <Pill tone={canCreate ? 'green' : 'gray'}>{canCreate ? 'Edición habilitada' : 'Solo consulta'}</Pill>
      </div>

      <div className="form-grid">
        <label>
          Cliente
          <input value={draft.client} onChange={(event) => setDraft({ ...draft, client: event.target.value })} placeholder="Cliente ficticio" />
        </label>
        <label>
          Unidad
          <input value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} placeholder="Unidad o identificador" />
        </label>
        <label>
          Presupuesto / proforma
          <input value={draft.budget} onChange={(event) => setDraft({ ...draft, budget: event.target.value })} placeholder="PR-0000-00" />
        </label>
        <label>
          Fecha estimada
          <input type="date" value={draft.eta} onChange={(event) => setDraft({ ...draft, eta: event.target.value })} />
        </label>
        <label>
          Cantidad requerida
          <input type="number" value={draft.required} onChange={(event) => setDraft({ ...draft, required: event.target.value })} />
        </label>
        <label>
          Cantidad disponible
          <input type="number" value={draft.available} onChange={(event) => setDraft({ ...draft, available: event.target.value })} />
        </label>
        <label>
          Solicitud especial
          <input value={draft.requestId} onChange={(event) => setDraft({ ...draft, requestId: event.target.value })} />
        </label>
      </div>

      <div className="notice">
        <AlertTriangle size={16} />
        Puede continuar sin cargar todos los documentos; revise despues si hace falta.
      </div>

      <div className="actions">
        <button className="primary" type="button" disabled={!canCreate} onClick={onProcess}>Procesar</button>
        <button className="secondary uneven" type="button">Guardar borrador</button>
      </div>
    </section>
  )
}

function CaseDetail({ role, item, tab, setTab, onBack, onModal, onPatch }) {
  const tabs = ['Cierre', 'Resumen', 'Proformas', 'Lineas', 'Solicitud especial', 'Recepción', 'Bitácora']
  return (
    <section className="stack">
      <div className="workspace-header">
        <button className="secondary fit" type="button" onClick={onBack}>Volver</button>
        <div>
          <p>{item.client} / {item.unitCode}</p>
          <h2>{item.id} · {item.unit}</h2>
        </div>
        <div className="header-pills">
          <Pill tone={stateTone(item.state)}>{item.state}</Pill>
          <Pill tone={stateTone(item.risk)}>{item.risk}</Pill>
          <Progress value={item.availability} />
        </div>
      </div>

      <div className="tabs" role="tablist">
        {tabs.map((tabName) => (
          <button key={tabName} type="button" className={tab === tabName ? 'active' : ''} onClick={() => setTab(tabName)}>{tabName}</button>
        ))}
      </div>

      {tab === 'Resumen' && <SummaryTab item={item} />}
      {tab === 'Proformas' && <BudgetsTab item={item} role={role} onPatch={onPatch} />}
      {tab === 'Lineas' && <LinesTab item={item} role={role} onPatch={onPatch} onModal={onModal} />}
      {tab === 'Solicitud especial' && <RequestTab item={item} role={role} onPatch={onPatch} onModal={onModal} />}
      {tab === 'Recepción' && <ReceptionTab item={item} role={role} onModal={onModal} />}
      {tab === 'Cierre' && <ClosingTab item={item} role={role} onModal={onModal} />}
      {tab === 'Bitácora' && <LogTab item={item} />}
    </section>
  )
}

function SummaryTab({ item }) {
  return (
    <div className="detail-grid">
      <InfoCard label="Caso" value={item.id} icon={Archive} />
      <InfoCard label="Unidad" value={`${item.unit} / ${item.unitCode}`} icon={BriefcaseBusiness} />
      <InfoCard label="Presupuesto" value={item.budget} icon={FileCheck2} />
      <InfoCard label="Solicitud especial" value={item.requestId} icon={Boxes} />
      <InfoCard label="Fecha estimada" value={formatDate(item.eta)} icon={CalendarClock} />
      <InfoCard label="Compromiso" value={item.commitment} icon={Lock} />
    </div>
  )
}

function BudgetsTab({ item, role, onPatch }) {
  return (
    <Panel title="Presupuestos y documentos" icon={FileCheck2}>
      <DataTable
        columns={['Proforma', 'Tipo', 'Documento', 'Monto', 'Estado', '']}
        rows={item.budgets.map((budget) => [
          budget.id,
          budget.type,
          <Pill key="doc" tone={budget.document === 'Cargado' ? 'green' : 'red'}>{budget.document}</Pill>,
          `$${budget.total}`,
          budget.status,
          <button
            key="edit"
            className="row-action"
            type="button"
            disabled={!roleCan(role, 'editDocuments')}
            onClick={() => onPatch(item.id, { hasBudgetFile: true })}
          >
            Editar
          </button>,
        ])}
      />
      <div className="notice">
        <PenLine size={16} />
        Logística puede ajustar documentos si recibe soporte operativo.
      </div>
    </Panel>
  )
}

function LinesTab({ item, role, onPatch, onModal }) {
  function updateLine(index, field, value) {
    if (!roleCan(role, 'editLines')) return
    const lines = item.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line))
    onPatch(item.id, { lines })
  }

  return (
    <Panel title="Líneas de repuesto" icon={PackageCheck}>
      <DataTable
        columns={['Código', 'Descripción', 'Req.', 'Disp.', 'Estado', 'Solicitud']}
        rows={item.lines.map((line, index) => [
          line.code,
          line.description,
          <input key="required" className="table-input number-field" type="number" value={line.required} onChange={(event) => updateLine(index, 'required', Number(event.target.value))} />,
          <input key="available" className="table-input number-field" type="number" value={line.available} onChange={(event) => updateLine(index, 'available', Number(event.target.value))} />,
          <Pill key="state" tone={stateTone(line.state)}>{line.state}</Pill>,
          line.request,
        ])}
      />
      <div className="actions">
        <button className="primary" type="button" onClick={() => onModal('Completar disponibilidad')}>Marcar completa</button>
        <button className="secondary uneven" type="button">Recalcular</button>
      </div>
    </Panel>
  )
}

function RequestTab({ item, role, onPatch, onModal }) {
  return (
    <Panel title="Solicitud especial, compras y logística" icon={Truck}>
      <div className="form-grid compact">
        <label>
          Referencia externa
          <input value={item.externalRef} onChange={(event) => onPatch(item.id, { externalRef: event.target.value })} placeholder="Sin referencia" />
        </label>
        <label>
          Proveedor
          <input disabled={!roleCan(role, 'editSupplier')} value={item.supplier} onChange={(event) => onPatch(item.id, { supplier: event.target.value })} />
        </label>
        <label>
          Orden
          <input value={item.order} onChange={(event) => onPatch(item.id, { order: event.target.value })} />
        </label>
        <label>
          Estado
          <select value={item.requestState} onChange={(event) => onPatch(item.id, { requestState: event.target.value })}>
            <option>-</option>
            {requestStates.map((state) => <option key={state}>{state}</option>)}
          </select>
        </label>
      </div>
      <div className="actions">
        <button className="primary" type="button" disabled={!roleCan(role, 'changeDate')} onClick={() => onModal('Cambiar fecha')}>Actualizar fecha</button>
        <button className="secondary uneven" type="button" onClick={() => onModal('Recepción')}>Registrar recepción</button>
      </div>
    </Panel>
  )
}

function ReceptionTab({ item, role, onModal }) {
  return (
    <Panel title="Recepción y continuidad técnica" icon={PackageCheck}>
      <DataTable
        columns={['Línea', 'Requerido', 'Recibido', 'Estado recepción', 'Continuidad']}
        rows={item.lines.map((line) => [
          line.code,
          line.required,
          line.received,
          <Pill key="state" tone={line.received >= line.required ? 'green' : line.received > 0 ? 'blue' : 'red'}>{line.received >= line.required ? 'Completa' : line.received > 0 ? 'Parcial' : 'Parcial'}</Pill>,
          line.received >= line.required ? 'Instalación' : 'Pendiente',
        ])}
      />
      <div className="actions">
        <button className="primary" type="button" disabled={!roleCan(role, 'receive')} onClick={() => onModal('Recepción')}>Procesar</button>
        <button className="secondary" type="button">Crear nueva proforma</button>
      </div>
    </Panel>
  )
}

function ClosingTab({ item, role, onModal }) {
  const pendingLine = item.lines.some((line) => line.state !== 'Completa')
  const blockers = [
    !item.hasBudgetFile ? 'Presupuesto sin documento asociado' : null,
    pendingLine ? 'Hay línea pendiente activa' : null,
    item.commitment !== 'Sin compromisos' ? item.commitment : null,
  ].filter(Boolean)

  return (
    <div className="closing-layout">
      <Panel title="Cierre administrativo" icon={ClipboardCheck}>
        <div className="checklist">
          <StatusLine label="Documentos" value={item.hasBudgetFile ? 'Completo' : 'Pendiente'} tone={item.hasBudgetFile ? 'green' : 'red'} />
          <StatusLine label="Montos" value="Cuadrado" tone="green" />
          <StatusLine label="Repuestos" value={pendingLine ? 'Pendiente' : 'Completo'} tone={pendingLine ? 'red' : 'green'} />
          <StatusLine label="Compromisos" value={item.commitment} tone={item.commitment === 'Sin compromisos' ? 'green' : 'orange'} />
        </div>
        <div className="actions">
          <button className="primary dangerish" type="button" disabled={!roleCan(role, 'closeCase')} onClick={() => onModal('Cerrar')}>Procesar</button>
          <button className="secondary uneven" type="button">Cerrar compromiso</button>
        </div>
      </Panel>
      <Panel title="Bloqueos detectados" icon={AlertTriangle}>
        {blockers.length ? (
          <ul className="blockers">
            {blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        ) : (
          <div className="empty-state">El caso esta listo para cierre.</div>
        )}
      </Panel>
    </div>
  )
}

function LogTab({ item }) {
  return (
    <Panel title="Bitácora" icon={History}>
      <DataTable columns={['Fecha', 'Usuario', 'Rol', 'Campo', 'Anterior', 'Nuevo', 'Comentario']} rows={item.log} />
    </Panel>
  )
}

function InfoCard({ label, value, icon: Icon }) {
  return (
    <article className="info-card">
      <Icon size={19} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <Icon size={19} />
        <h3>{title}</h3>
      </header>
      {children}
    </section>
  )
}

function DataTable({ columns, rows, looseDates = false }) {
  return (
    <div className={`table-wrap ${looseDates ? 'loose-dates' : ''}`}>
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${String(row[0])}`}>
              {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Pill({ tone = 'blue', clipped = false, children }) {
  return <span className={`pill ${tone} ${clipped ? 'clipped' : ''}`}>{children}</span>
}

function Progress({ value }) {
  return (
    <span className="progress">
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      <strong>{value}%</strong>
    </span>
  )
}

function StatusLine({ label, value, tone }) {
  return (
    <div className="status-line">
      <span>{label}</span>
      <Pill tone={tone}>{value}</Pill>
    </div>
  )
}

function ActionModal({ name, item, draft, setDraft, role, onClose, onConfirm }) {
  return (
    <div className="overlay">
      <div className="modal">
        <header>
          <div>
            <p>{role}</p>
            <h2>{modalTitle(name)}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </header>
        <div className="modal-body">
          {name === 'Cambiar fecha' && (
            <div className="form-grid modal-grid">
              <label>
                Fecha actual
                <input readOnly value={formatDate(item.eta)} />
              </label>
              <label>
                Nueva fecha
                <input type="date" value={draft.eta} onChange={(event) => setDraft({ ...draft, eta: event.target.value })} />
              </label>
              <label>
                Motivo
                <select>
                  <option>Proveedor</option>
                  <option>Logística</option>
                  <option>Otro</option>
                </select>
              </label>
              <label>
                Comentario
                <input placeholder="Opcional" />
              </label>
            </div>
          )}
          {name === 'Crear' && (
            <div className="notice">
              <FilePlus2 size={16} />
              Se creara el registro con la información capturada.
            </div>
          )}
          {name === 'Completar disponibilidad' && (
            <div className="notice">
              <PackageCheck size={16} />
              El caso quedara disponible para continuidad técnica.
            </div>
          )}
          {name === 'Recepción' && (
            <div className="notice">
              <Truck size={16} />
              Se registrara la recepción segun la selección actual.
            </div>
          )}
          {name === 'Cerrar' && (
            <div className="notice">
              <AlertTriangle size={16} />
              Acción administrativa para finalizar el caso.
            </div>
          )}
        </div>
        <footer>
          <button className="secondary" type="button" onClick={onClose}>Cancelar</button>
          <button className="primary" type="button" onClick={onConfirm}>Procesar</button>
        </footer>
      </div>
    </div>
  )
}

function modalTitle(name) {
  if (name === 'Crear') return 'Nuevo caso'
  if (name === 'Cerrar') return 'Cerrar caso'
  if (name === 'Recepción') return 'Registrar recepción'
  return name
}

export default App
