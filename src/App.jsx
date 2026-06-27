import { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Boxes,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Cog,
  Download,
  Eye,
  FileCheck2,
  FilePlus2,
  FileText,
  Filter,
  FolderPlus,
  History,
  Lock,
  PackageCheck,
  PenLine,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import './App.css'

const roles = [
  'Responsable del caso',
  'Bodega de Enderezado',
  'Jefe de Enderezado',
  'Compras',
  'Facturacion',
  'Administrador',
]

const initialUsersCatalog = [
  { id: 'USR-001', name: 'Ana Gomez', initials: 'AG', role: 'Responsable del caso', area: 'Responsable del caso', active: true, primary: true },
  { id: 'USR-002', name: 'Sofia Herrera', initials: 'SH', role: 'Responsable del caso', area: 'Responsable del caso', active: true, primary: false },
  { id: 'USR-003', name: 'Bruno Medina', initials: 'BM', role: 'Bodega de Enderezado', area: 'Bodega de Enderezado', active: true, primary: true },
  { id: 'USR-004', name: 'Carlos Ruiz', initials: 'CR', role: 'Jefe de Enderezado', area: 'Jefatura de Enderezado', active: true, primary: true },
  { id: 'USR-005', name: 'Lucia Morales', initials: 'LM', role: 'Compras', area: 'Compras', active: true, primary: true },
  { id: 'USR-006', name: 'Valeria Flores', initials: 'VF', role: 'Facturacion', area: 'Facturacion', active: true, primary: true },
  { id: 'USR-007', name: 'Mario Sandoval', initials: 'MS', role: 'Administrador', area: 'Administracion NARA', active: true, primary: true },
]

const initialReasonCatalogs = {
  dateChangeReasons: [
    { id: 'MOT-FECHA-001', label: 'Proveedor', active: true },
    { id: 'MOT-FECHA-002', label: 'Puerto', active: true },
    { id: 'MOT-FECHA-003', label: 'Aduana', active: true },
    { id: 'MOT-FECHA-004', label: 'Almacen', active: true },
    { id: 'MOT-FECHA-005', label: 'CPD', active: true },
    { id: 'MOT-FECHA-006', label: 'Fecha JDE actualizada', active: true },
    { id: 'MOT-FECHA-007', label: 'Otro', active: true },
  ],
}

const caseStates = [
  'Caso registrado',
  'Expediente pendiente de completar',
  'Expediente completo',
  'En validación de disponibilidad',
  'Repuestos disponibles',
  'Repuestos pendientes',
  'Pedido especial requerido',
  'Pedido especial en seguimiento',
  'Disponibilidad parcial actualizada',
  'Disponibilidad completa para el caso',
  'Presupuesto adicional por daño oculto',
  'Finiquito abierto',
  'Listo para cierre',
  'Cerrado',
]

const expedienteRestrictedStates = ['Expediente pendiente de completar', 'Expediente completo']

const baseDocumentMeta = {
  ot: { title: 'OT', required: true },
  proforma: { title: 'Presupuesto / Proforma', required: true },
  ocSeguro: { title: 'OC del seguro', required: true },
}

const postAvailabilityStates = [
  'Repuestos disponibles',
  'Repuestos pendientes',
  'Pedido especial requerido',
  'Pedido especial en seguimiento',
  'Disponibilidad parcial actualizada',
  'Disponibilidad completa para el caso',
  'Presupuesto adicional por daño oculto',
  'Finiquito abierto',
  'Listo para cierre',
]

const initialProformaActionHiddenStates = [
  'Expediente pendiente de completar',
  'Expediente completo',
  'En validación de disponibilidad',
]

function isAllowedCaseState(state) {
  return caseStates.includes(state)
}

function isPostAvailabilityState(state) {
  return postAvailabilityStates.includes(state)
}

function isInitialProformaStage(state) {
  return initialProformaActionHiddenStates.includes(state)
}

function numericValue(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0
}

function lineState(required, available) {
  if (available <= 0) return 'Pendiente'
  return available >= required ? 'Completo' : 'Parcial'
}

function normalizeProformaLine(line) {
  const required = numericValue(line.required)
  const available = numericValue(line.available)
  const missing = Math.max(required - available, 0)
  return {
    ...line,
    required,
    available,
    missing,
    state: lineState(required, available),
  }
}

function recalculateProforma(proforma) {
  const nextLines = (proforma.lines || []).map(normalizeProformaLine)
  const requiredTotal = nextLines.reduce((sum, line) => sum + numericValue(line.required), 0)
  const availableTotal = nextLines.reduce((sum, line) => sum + numericValue(line.available), 0)
  const availability = requiredTotal ? Math.min(100, Math.round((availableTotal / requiredTotal) * 100)) : 0
  return {
    ...proforma,
    availability,
    decisions: nextLines.filter((line) => line.authorization === 'No autorizado').length,
    lines: nextLines,
  }
}

function canEditProformaDetail(role, currentCase, proforma) {
  if (!proforma || proforma.excelState !== 'Valido') return false
  return (role === 'Administrador' || role === 'Bodega de Enderezado')
    && currentCase.state === 'En validación de disponibilidad'
    && !proforma.availabilityConfirmed
}

function canClearProformaDetail(role, currentCase, proforma) {
  return Boolean(proforma?.lines?.length) && proforma.availabilityConfirmed === false && canEditProformaDetail(role, currentCase, proforma)
}

function canRegisterJdeForPE(role, pe) {
  return (role === 'Bodega de Enderezado' || role === 'Administrador') && pe?.state === 'Generado'
}

function isPEComplete(pe) {
  return pe?.state === 'PE recibido completo'
}

function hasPEOC(pe) {
  return Boolean(pe?.oc && pe.oc !== '-' && pe.oc !== 'Sin OC')
}

function normalizePELine(line) {
  const requested = numericValue(line.requested)
  const received = Math.min(requested, numericValue(line.received))
  const hasStoredPending = line.pending !== undefined && line.pending !== null && line.pending !== ''
  const pending = hasStoredPending ? numericValue(line.pending) : Math.max(requested - received, 0)
  return {
    ...line,
    requested,
    received,
    pending,
    state: line.state || (pending === 0 ? 'Completo' : received > 0 ? 'Parcial' : 'Pendiente'),
    selected: Boolean(line.selected),
    receivedDraft: line.receivedDraft ?? received,
    estimatedDate: line.estimatedDate || '',
    lineOc: line.lineOc || '',
    requiredByWorkshop: line.requiredByWorkshop || 'Sí',
    receivedDate: line.receivedDate || '-',
  }
}

function normalizePELines(linesList) {
  return (linesList || []).map(normalizePELine)
}

function parseDateValue(value) {
  if (!value || value === 'Sin fecha' || value === '-') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`)
  const parts = value.split('/')
  if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`)
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function maxEstimatedDateForLines(linesList) {
  const datedLines = normalizePELines(linesList)
    .map((line) => ({ raw: line.estimatedDate, parsed: parseDateValue(line.estimatedDate) }))
    .filter((line) => line.raw && line.parsed)
  if (datedLines.length === 0) return 'Sin fecha'
  return datedLines.reduce((latest, line) => (line.parsed > latest.parsed ? line : latest), datedLines[0]).raw
}

function allOpenPELinesHaveEstimatedDate(linesList) {
  const lines = normalizePELines(linesList)
  return lines.length > 0 && lines.every((line) => line.pending === 0 || Boolean(parseDateValue(line.estimatedDate)))
}

function selectedOpenPELines(linesList) {
  return normalizePELines(linesList).filter((line) => line.selected && line.pending > 0)
}

function selectedDateAssignmentRequiresReason(linesList) {
  return selectedOpenPELines(linesList).some((line) => Boolean(parseDateValue(line.estimatedDate)))
}

function receiptCaptureValue(line) {
  return Math.min(numericValue(line.requested), numericValue(line.receivedDraft ?? line.received))
}

function selectedPELinesReadyForReceipt(linesList) {
  const selectedLines = selectedOpenPELines(linesList)
  return selectedLines.length > 0 && selectedLines.every((line) => {
    const captured = receiptCaptureValue(line)
    return captured > 0 && captured > numericValue(line.received)
  })
}

function canManagePEReceipt(role) {
  return role === 'Compras' || role === 'Administrador' || role === 'Bodega de Enderezado'
}

function hasInvalidReceiptCapture(line) {
  if (!line.selected || line.pending === 0) return false
  const captured = receiptCaptureValue(line)
  return !parseDateValue(line.estimatedDate) || captured <= 0 || captured <= numericValue(line.received)
}

function daysUntilDate(value) {
  const parsed = parseDateValue(value)
  if (!parsed) return 0
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.ceil((parsed.getTime() - startOfToday.getTime()) / 86400000)
}

function earlyReceiptLines(linesList) {
  return selectedOpenPELines(linesList).filter((line) => daysUntilDate(line.estimatedDate) > 7)
}

function peAvailabilityFromLines(linesList) {
  const lines = normalizePELines(linesList)
  const requestedTotal = lines.reduce((sum, line) => sum + line.requested, 0)
  const receivedTotal = lines.reduce((sum, line) => sum + line.received, 0)
  return requestedTotal ? Math.min(100, Math.round((receivedTotal / requestedTotal) * 100)) : 0
}

function caseAvailabilityFromPE(baseAvailability, peAvailability) {
  const base = numericValue(baseAvailability)
  return Math.min(100, Math.max(base, Math.round(base + ((100 - base) * peAvailability) / 100)))
}

function scopedAvailabilityBaseForPE(proforma, selectedLines) {
  const lines = proforma?.lines || []
  const availableUnits = lines.reduce((sum, line) => sum + Math.min(numericValue(line.required), numericValue(line.available)), 0)
  const selectedMissingUnits = selectedLines.reduce((sum, line) => sum + numericValue(line.missing), 0)
  const scopedTotal = availableUnits + selectedMissingUnits
  if (!scopedTotal) return numericValue(proforma?.availability)
  return Math.min(100, Math.round((availableUnits / scopedTotal) * 100))
}

function availabilityBaseForOrder(order, caseItem) {
  if (order?.availabilityBase !== undefined) return numericValue(order.availabilityBase)
  const caseAvailability = numericValue(caseItem?.availability)
  const peAvailability = numericValue(order?.availability)
  if (peAvailability >= 100) return 100
  const availabilityRatio = peAvailability / 100
  if (availabilityRatio >= 1) return caseAvailability
  return Math.max(0, Math.min(100, Math.round((caseAvailability - peAvailability) / (1 - availabilityRatio))))
}

function isConfirmedValidProforma(proforma) {
  return Boolean(proforma && proforma.excelState === 'Valido' && proforma.availabilityConfirmed !== false)
}

function isInitialConfirmedProforma(proforma) {
  return proforma?.type === 'Inicial' && isConfirmedValidProforma(proforma)
}

function hasInitialConfirmedProforma(caseId, proformasList) {
  return proformasList.some((proforma) => proforma.caseId === caseId && isInitialConfirmedProforma(proforma))
}

function caseHasFiniquito(caseItem) {
  return Boolean(caseItem?.hasFiniquito || caseItem?.finiquito === 'Si' || numericValue(caseItem?.finiquitosCount) > 0)
}

function caseFiniquitosCount(caseItem) {
  const explicitCount = numericValue(caseItem?.finiquitosCount)
  if (explicitCount > 0) return explicitCount
  return caseItem?.finiquito === 'Si' ? 1 : 0
}

function normalizeCaseFiniquito(caseItem) {
  const count = caseFiniquitosCount(caseItem)
  return {
    ...caseItem,
    hasFiniquito: caseHasFiniquito(caseItem),
    finiquitosCount: count,
  }
}

function selectedPELinesForProforma(proforma) {
  return (proforma?.lines || []).filter((line) => line.peSelected && numericValue(line.missing) > 0)
}

function unselectedMissingLinesForProforma(proforma) {
  return (proforma?.lines || []).filter((line) => numericValue(line.missing) > 0 && !line.peSelected)
}

function shouldShowPEProcessFields(role, currentCase, proforma) {
  if (role === 'Bodega de Enderezado') return false
  if (!proforma || currentCase.state === 'En validación de disponibilidad') return false
  return Boolean(proforma.peSelectionEnabled || proforma.peGenerated || proforma.peId || proforma.peCount > 0)
}

function proformaTemplateHref() {
  const headers = ['ITEM', 'SKU', 'DESCRIPCION', 'REQ', 'DISP', 'AUTORIZACION SEGURO']
  const sample = ['001', 'FAR-001', 'Faro delantero', '2', '1', 'No autorizado']
  return `data:text/csv;charset=utf-8,${encodeURIComponent(`${headers.join(',')}\n${sample.join(',')}\n`)}`
}

function demoDocument(title, reference, description, status = 'Cargado') {
  return {
    title,
    reference,
    description,
    status,
    fileName: `${reference || title}.pdf`.replaceAll(' ', '-'),
    preview: `${title} ${reference}. Documento demo cargado para revision del expediente.`,
  }
}

function pendingDocument(title, reference, description) {
  return {
    title,
    reference: '',
    referencePlaceholder: reference || '',
    description,
    status: 'Pendiente',
    fileName: '',
    preview: '',
  }
}

function registeredDocument(title, reference, description, fileName = '') {
  const normalizedReference = reference || 'Sin referencia'
  return {
    title,
    reference: normalizedReference,
    description,
    status: 'Cargado',
    fileName: fileName || `${normalizedReference}.pdf`.replaceAll(' ', '-'),
    preview: `${title} ${normalizedReference}. Documento registrado en el expediente.`,
  }
}

function uploadedDocument(title, reference, referencePlaceholder, description, fileName = '') {
  const visibleReference = reference || referencePlaceholder || title
  return {
    title,
    reference: reference || '',
    referencePlaceholder: referencePlaceholder || reference || '',
    description,
    status: 'Cargado',
    fileName: fileName || `${visibleReference}.pdf`.replaceAll(' ', '-'),
    preview: `${title} ${visibleReference}. Documento registrado en el expediente.`,
  }
}

function documentPack({ ot, proforma, ocSeguro, otStatus = 'Cargado', proformaStatus = 'Valido', ocSeguroStatus = 'Cargado', additional = [], supplementalSets = [], futureGroups = [] }) {
  return {
    ot: ot ? demoDocument('OT', ot, 'Orden de taller asociada al caso', otStatus) : pendingDocument('OT', 'Sin referencia', 'Orden de taller pendiente'),
    proforma: proforma ? demoDocument('Presupuesto / Proforma', proforma, 'Presupuesto base cargado por el responsable', proformaStatus) : pendingDocument('Presupuesto / Proforma', 'Sin referencia', 'Presupuesto pendiente'),
    ocSeguro: ocSeguro ? demoDocument('OC del seguro', ocSeguro, 'Orden de compra del seguro asociada al expediente', ocSeguroStatus) : pendingDocument('OC del seguro', 'Sin referencia', 'OC del seguro pendiente'),
    additional: additional.map((document, index) => ({ id: document.id || `AD-DEMO-${index + 1}`, ...document })),
    supplementalSets,
    futureGroups,
  }
}

function initialProformaRecord(id, caseId, type = 'Inicial') {
  return {
    id,
    caseId,
    type,
    excelState: 'Pendiente',
    availability: 0,
    peCount: 0,
    decisions: 0,
    availabilityConfirmed: false,
    peProcessApproved: false,
    lines: [],
  }
}

function uniqueProformaId(preferredId, proformasList) {
  const baseId = preferredId || `PF-${String(proformasList.length + 1).padStart(3, '0')}`
  if (!proformasList.some((item) => item.id === baseId)) return baseId
  let suffix = 2
  let nextId = `${baseId}-${suffix}`
  while (proformasList.some((item) => item.id === nextId)) {
    suffix += 1
    nextId = `${baseId}-${suffix}`
  }
  return nextId
}

function initialCaseDocuments({ ot, proforma, clientAssumes = false }) {
  return {
    ot: pendingDocument('OT', ot || 'Sin referencia', 'Orden de taller pendiente'),
    proforma: pendingDocument('Presupuesto / Proforma', proforma || 'Sin referencia', 'Presupuesto pendiente'),
    ...(clientAssumes ? {} : { ocSeguro: pendingDocument('OC del seguro', 'Sin referencia', 'OC del seguro pendiente') }),
    additional: [],
    supplementalSets: [],
    futureGroups: [],
  }
}

const cases = [
  {
    id: 'CP-000123',
    client: 'Juan Perez',
    vehicle: 'Toyota Hilux 2022',
    plate: 'M123456',
    owner: 'Ana Gomez',
    registeredBy: 'Ana Gomez',
    state: 'Pedido especial en seguimiento',
    availability: 72,
    openPE: 1,
    finiquito: 'Si',
    nextAction: 'Compras confirma recepcion',
    updated: '18/06/2026 10:35',
    documents: documentPack({
      ot: 'OT-10245',
      proforma: 'PF-001',
      ocSeguro: 'OCS-3441',
      ocSeguroStatus: 'Requiere correccion',
      additional: [demoDocument('Cedula del cliente', 'ID-7781', 'Identificacion anexada al expediente')],
      supplementalSets: [
        {
          id: 'set-damage-001',
          type: 'Daño oculto',
          reason: 'Daño oculto detectado en desmontaje',
          documents: {
            ot: pendingDocument('OT adicional', 'Opcional', 'OT opcional para daño oculto'),
            proforma: demoDocument('Proforma adicional', 'PF-002', 'Proforma por daño oculto', 'Pendiente'),
            ocSeguro: pendingDocument('OC del seguro adicional', 'Pendiente', 'OC del seguro por daño oculto'),
          },
        },
      ],
    }),
  },
  {
    id: 'CP-000124',
    client: 'Maria Lopez',
    vehicle: 'Kia Sportage 2021',
    plate: 'M778901',
    owner: 'Sofia Herrera',
    registeredBy: 'Sofia Herrera',
    state: 'En validación de disponibilidad',
    availability: 48,
    openPE: 0,
    finiquito: 'No',
    nextAction: 'Bodega valida faltantes',
    updated: '18/06/2026 09:10',
    documents: documentPack({ ot: 'OT-10246', proforma: 'PF-010', ocSeguro: 'OCS-3452' }),
  },
  {
    id: 'CP-000125',
    client: 'Roberto Silva',
    vehicle: 'Nissan Frontier 2020',
    plate: 'M445120',
    owner: 'Ana Gomez',
    registeredBy: 'Ana Gomez',
    state: 'Expediente pendiente de completar',
    availability: 0,
    openPE: 0,
    finiquito: 'No',
    nextAction: 'Cargar detalle de proforma',
    updated: '17/06/2026 16:42',
    documents: documentPack({}),
  },
  {
    id: 'CP-000126',
    client: 'Taller Central',
    vehicle: 'Hyundai Tucson 2023',
    plate: 'M552900',
    owner: 'Sofia Herrera',
    registeredBy: 'Sofia Herrera',
    state: 'Expediente completo',
    availability: 0,
    openPE: 0,
    finiquito: 'No',
    nextAction: 'Enviar a Bodega',
    updated: '18/06/2026 08:18',
    documents: documentPack({ ot: 'OT-10247', proforma: 'PF-009', ocSeguro: 'OCS-3460' }),
  },
  {
    id: 'CP-000127',
    client: 'Diana Castro',
    vehicle: 'Toyota Corolla Cross 2024',
    plate: 'M990771',
    owner: 'Ana Gomez',
    registeredBy: 'Ana Gomez',
    state: 'Expediente pendiente de completar',
    availability: 0,
    openPE: 0,
    finiquito: 'No',
    nextAction: 'Cargar OC del seguro',
    updated: '18/06/2026 11:05',
    documents: documentPack({ ot: 'OT-10248', proforma: 'PF-011', ocSeguro: null }),
  },
  {
    id: 'CP-000128',
    client: 'Ramon Mejia',
    vehicle: 'Isuzu D-Max 2022',
    plate: 'M773102',
    owner: 'Ana Gomez',
    registeredBy: 'Ana Gomez',
    state: 'En validación de disponibilidad',
    availability: 35,
    openPE: 0,
    finiquito: 'No',
    nextAction: 'Bodega confirma disponibilidad',
    updated: '18/06/2026 12:25',
    documents: documentPack({ ot: 'OT-10249', proforma: 'PF-012', ocSeguro: 'OCS-3466' }),
  },
  {
    id: 'CP-000129',
    client: 'Carla Molina',
    vehicle: 'Suzuki Vitara 2020',
    plate: 'M661245',
    owner: 'Sofia Herrera',
    registeredBy: 'Sofia Herrera',
    state: 'Finiquito abierto',
    availability: 100,
    openPE: 1,
    finiquito: 'Si',
    nextAction: 'Facturacion da seguimiento a finiquito',
    updated: '17/06/2026 15:40',
    documents: documentPack({
      ot: 'OT-10250',
      proforma: 'PF-013',
      ocSeguro: 'OCS-3470',
      additional: [demoDocument('Finiquito', 'FIN-0008', 'Finiquito abierto asociado al caso')],
    }),
  },
  {
    id: 'CP-000130',
    client: 'Luis Bermudez',
    vehicle: 'Mitsubishi L200 2021',
    plate: 'M335781',
    owner: 'Ana Gomez',
    registeredBy: 'Ana Gomez',
    state: 'Disponibilidad parcial actualizada',
    availability: 78,
    openPE: 1,
    finiquito: 'No',
    nextAction: 'Compras confirma pendientes',
    updated: '18/06/2026 13:12',
    documents: documentPack({ ot: 'OT-10251', proforma: 'PF-014', ocSeguro: 'OCS-3475' }),
  },
  {
    id: 'CP-000131',
    client: 'Paola Duarte',
    vehicle: 'Toyota RAV4 2024',
    plate: 'M998002',
    owner: 'Ana Gomez',
    registeredBy: 'Ana Gomez',
    state: 'Disponibilidad completa para el caso',
    availability: 100,
    openPE: 1,
    finiquito: 'No',
    nextAction: 'Validar cierre',
    updated: '18/06/2026 14:03',
    documents: documentPack({ ot: 'OT-10252', proforma: 'PF-015', ocSeguro: 'OCS-3480' }),
  },
  {
    id: 'CP-000132',
    client: 'Ricardo Aguilar',
    vehicle: 'Kia Sorento 2022',
    plate: 'M238712',
    owner: 'Sofia Herrera',
    registeredBy: 'Sofia Herrera',
    state: 'Pedido especial en seguimiento',
    availability: 62,
    openPE: 1,
    finiquito: 'No',
    nextAction: 'Compras registra fecha estimada',
    updated: '18/06/2026 14:52',
    documents: documentPack({ ot: 'OT-10253', proforma: 'PF-016', ocSeguro: 'OCS-3488' }),
  },
]

const lines = [
  {
    item: '001',
    sku: 'FAR-001',
    description: 'Faro delantero',
    required: 2,
    available: 1,
    missing: 1,
    state: 'Parcial',
    authorization: 'Autorizado',
    decision: 'No aplica',
    eligible: 'Si',
    pe: 'PE-00045',
    note: 'Solicitar unidad faltante',
  },
  {
    item: '002',
    sku: 'MOL-002',
    description: 'Moldura lateral',
    required: 1,
    available: 0,
    missing: 1,
    state: 'Pendiente',
    authorization: 'No autorizado',
    decision: 'Aprobado operativo',
    eligible: 'Si',
    pe: 'PE-00045',
    note: 'Cliente requiere continuidad',
  },
  {
    item: '003',
    sku: 'GRP-003',
    description: 'Grapas internas',
    required: 10,
    available: 0,
    missing: 10,
    state: 'Pendiente',
    authorization: 'No autorizado',
    decision: 'Rechazado operativo',
    eligible: 'No',
    pe: '',
    note: 'No bloquea cierre',
  },
  {
    item: '004',
    sku: 'BUM-004',
    description: 'Base bumper',
    required: 1,
    available: 0,
    missing: 1,
    state: 'Pendiente',
    authorization: 'No autorizado',
    decision: 'Pendiente',
    eligible: 'No',
    pe: '',
    note: 'Requiere decision del jefe',
  },
]

const proformas = [
  {
    id: 'PF-001',
    caseId: 'CP-000123',
    type: 'Inicial',
    excelState: 'Valido',
    availability: 72,
    peCount: 1,
    decisions: 2,
    lines,
  },
  {
    id: 'PF-002',
    caseId: 'CP-000123',
    type: 'Daño oculto',
    excelState: 'Pendiente',
    availability: 0,
    peCount: 0,
    decisions: 0,
    lines: [],
  },
  {
    id: 'PF-010',
    caseId: 'CP-000124',
    type: 'Inicial',
    excelState: 'Valido',
    availability: 48,
    peCount: 1,
    decisions: 1,
    lines,
  },
  {
    id: 'PF-012',
    caseId: 'CP-000128',
    type: 'Inicial',
    excelState: 'Valido',
    availability: 35,
    peCount: 0,
    decisions: 1,
    lines,
  },
  {
    id: 'PF-013',
    caseId: 'CP-000129',
    type: 'Finiquito',
    excelState: 'Valido',
    availability: 100,
    peCount: 1,
    decisions: 0,
    lines: lines.map((line) => ({ ...line, available: line.required, missing: 0, state: 'Completo' })),
  },
  {
    id: 'PF-014',
    caseId: 'CP-000130',
    type: 'Inicial',
    excelState: 'Valido',
    availability: 78,
    peCount: 1,
    decisions: 1,
    lines,
  },
  {
    id: 'PF-015',
    caseId: 'CP-000131',
    type: 'Inicial',
    excelState: 'Valido',
    availability: 100,
    peCount: 1,
    decisions: 0,
    lines: lines.map((line) => ({ ...line, available: line.required, missing: 0, state: 'Completo', eligible: 'No aplica' })),
  },
  {
    id: 'PF-016',
    caseId: 'CP-000132',
    type: 'Inicial',
    excelState: 'Valido',
    availability: 62,
    peCount: 1,
    decisions: 1,
    lines,
  },
]

const specialOrders = [
  {
    id: 'PE-00045',
    caseId: 'CP-000123',
    client: 'Juan Perez',
    proforma: 'PF-001',
    state: 'PE en camino',
    jde: '98765',
    oc: 'OC-4455',
    eta: '20/09/2026',
    alert: '30 dias',
    availability: 50,
    pendingLines: 2,
    nextAction: 'Confirmar disponibilidad fisica',
  },
  {
    id: 'PE-00046',
    caseId: 'CP-000124',
    client: 'Maria Lopez',
    proforma: 'PF-010',
    state: 'Generado',
    jde: 'Sin JDE',
    oc: '-',
    eta: 'Sin fecha',
    alert: 'Sin fecha estimada',
    availability: 0,
    pendingLines: 4,
    nextAction: 'Registrar JDE',
  },
  {
    id: 'PE-00047',
    caseId: 'CP-000126',
    client: 'Taller Central',
    proforma: 'PF-009',
    state: 'PE recibido parcial',
    jde: '99120',
    oc: 'OC-4490',
    eta: '04/06/2026',
    alert: 'Vencida',
    availability: 75,
    pendingLines: 1,
    nextAction: 'Confirmar disponibilidad fisica',
  },
  {
    id: 'PE-00048',
    caseId: 'CP-000129',
    client: 'Carla Molina',
    proforma: 'PF-013',
    state: 'PE recibido completo',
    jde: '99201',
    oc: 'OC-4502',
    eta: '12/06/2026',
    alert: 'Completado',
    availability: 100,
    pendingLines: 0,
    nextAction: 'Facturacion da seguimiento a finiquito',
  },
  {
    id: 'PE-00049',
    caseId: 'CP-000131',
    client: 'Paola Duarte',
    proforma: 'PF-015',
    state: 'PE recibido completo',
    jde: '99245',
    oc: 'OC-4510',
    eta: '18/06/2026',
    alert: 'Completado',
    availability: 100,
    pendingLines: 0,
    nextAction: 'Validar cierre del caso',
  },
  {
    id: 'PE-00050',
    caseId: 'CP-000132',
    client: 'Ricardo Aguilar',
    proforma: 'PF-016',
    state: 'PE solicitado en JDE',
    jde: '99310',
    oc: 'OC-4522',
    eta: 'Sin fecha',
    alert: 'Sin fecha estimada',
    availability: 25,
    pendingLines: 3,
    nextAction: 'Compras registra fecha estimada',
  },
]

const peLines = [
  {
    line: '001',
    sku: 'FAR-001',
    description: 'Faro delantero',
    requested: 1,
    received: 0,
    pending: 1,
    state: 'Pendiente',
    receivedDate: '-',
    user: 'Compras',
    note: 'En transito',
  },
  {
    line: '002',
    sku: 'MOL-002',
    description: 'Moldura lateral',
    requested: 1,
    received: 1,
    pending: 0,
    state: 'Completo',
    receivedDate: '18/06/2026',
    user: 'Compras',
    note: 'Disponible en CPD',
  },
]

const sixHoursMs = 6 * 60 * 60 * 1000

function nowMs() {
  return Date.now()
}

const initialBitacoraEvents = [
  {
    scope: 'PE',
    entityId: 'PE-00045',
    row: ['18/06/2026 10:15', 'Recepcion parcial registrada', '0', '1', 'Compras', 'CPD', 'Recepcion parcial registrada'],
  },
  {
    scope: 'PE',
    entityId: 'PE-00045',
    row: ['17/06/2026 14:20', 'OC JDE', '-', 'OC-4455', 'Compras', 'Fecha JDE actualizada', 'Referencia confirmada'],
  },
  {
    scope: 'PE',
    entityId: 'PE-00045',
    row: ['16/06/2026 11:40', 'Fecha inicial', '-', '20/09/2026', 'Compras', 'Proveedor', 'Fecha estimada inicial'],
  },
  {
    scope: 'Caso',
    entityId: 'CP-000123',
    row: ['18/06/2026 10:15', 'Disponibilidad caso', '65%', '72%', 'Compras', 'Recepcion de Pedido Especial', 'Caso con disponibilidad parcial actualizada'],
  },
]

function isReceptionSnapshotActive(snapshot) {
  return Boolean(snapshot?.createdAt && nowMs() - snapshot.createdAt <= sixHoursMs)
}

const permissions = {
  'Responsable del caso': ['Crear caso', 'Registrar comunicacion manual', 'Ver caso', 'Aprobar correo'],
  'Bodega de Enderezado': [
    'Cargar Excel',
    'Modificar detalle',
    'Registrar JDE',
  ],
  'Jefe de Enderezado': ['Crear caso', 'Registrar comunicacion manual', 'Validar cierre', 'Ver caso', 'Aprobar correo'],
  Compras: ['Registrar JDE', 'Registrar OC JDE', 'Actualizar fecha', 'Confirmar disponibilidad fisica', 'Registrar cantidades recibidas', 'Sincronizacion completa'],
  Facturacion: ['Aplicar finiquito', 'Cargar documento', 'Asociar PE/linea'],
  Administrador: ['Todo'],
}

const caseTabs = ['Expediente', 'Proformas', 'Pedidos Especiales']
const peTabs = ['Detalle']

const caseFilters = [
  {
    label: 'Estado del caso',
    options: caseStates,
  },
  { label: 'Responsable del caso', options: ['Ana Gomez', 'Sofia Herrera', 'Responsable sin asignar'] },
  { label: 'Cliente', options: ['Juan Perez', 'Maria Lopez', 'Roberto Silva', 'Diana Castro', 'Ramon Mejia'] },
  { label: 'Placa', options: ['M123456', 'M778901', 'M445120', 'M990771', 'M773102'] },
  { label: 'OT', options: ['OT-10245', 'OT-10246', 'OT-10247', 'Sin OT'] },
  { label: 'Proforma', options: ['PF-001', 'PF-002', 'PF-010', 'PF-014', 'Sin proforma valida'] },
]

function activeUsersByRole(usersCatalog, targetRole) {
  return usersCatalog.filter((user) => user.role === targetRole && user.active)
}

function caseFiltersForUsers(usersCatalog) {
  const responsibleUsers = activeUsersByRole(usersCatalog, 'Responsable del caso').map((user) => user.name)
  return caseFilters.map((filter) => (
    filter.label === 'Responsable del caso'
      ? { ...filter, options: responsibleUsers.length ? responsibleUsers : filter.options }
      : filter
  ))
}

function activeDateChangeReasons(reasonCatalogs) {
  const reasons = reasonCatalogs.dateChangeReasons?.filter((reason) => reason.active && reason.label.trim()).map((reason) => reason.label.trim()) || []
  return reasons.length ? reasons : ['Proveedor']
}

const orderFilters = [
  {
    label: 'Estado PE',
    options: [
      'Generado',
      'PE solicitado en JDE',
      'PE en seguimiento',
      'PE en camino',
      'PE recibido parcial',
      'PE recibido completo',
      'Sin JDE',
      'Sin fecha estimada',
      'Fecha vencida',
      'Pedido parcial',
      'Pedido completado',
    ],
  },
  { label: 'Caso', options: ['CP-000123', 'CP-000124', 'CP-000126', 'CP-000129', 'CP-000132'] },
  { label: 'Cliente', options: ['Juan Perez', 'Maria Lopez', 'Taller Central', 'Carla Molina', 'Ricardo Aguilar'] },
  { label: 'Proforma', options: ['PF-001', 'PF-009', 'PF-010', 'PF-013', 'PF-016'] },
  { label: 'Solicitud JDE', options: ['Sin JDE', '98765', '99120', '99201', '99310'] },
  { label: 'OC JDE', options: ['Sin OC', 'OC-4455', 'OC-4490', 'OC-4502', 'OC-4522'] },
  { label: 'Disponibilidad', options: ['0%', '25%', '50%', '75%', '100%'] },
]

function can(role, action) {
  return permissions[role]?.includes('Todo') || permissions[role]?.includes(action)
}

function getActiveUser(role, usersCatalog = initialUsersCatalog) {
  const activeUsers = activeUsersByRole(usersCatalog, role)
  const selectedUser = activeUsers.find((user) => user.primary) || activeUsers[0] || initialUsersCatalog.find((user) => user.role === role) || initialUsersCatalog[0]
  return {
    name: selectedUser.name,
    initials: selectedUser.initials,
    area: selectedUser.area,
  }
}

function getDocumentStatus(document) {
  if (!document) return 'Pendiente'
  if (typeof document === 'string') return document
  return document.status || 'Pendiente'
}

function hasDocumentFile(document) {
  if (!document || typeof document === 'string') return getDocumentStatus(document) !== 'Pendiente'
  return Boolean(document.fileName) && getDocumentStatus(document) !== 'Pendiente'
}

function isDocumentReady(document) {
  return ['Cargado', 'Valido'].includes(getDocumentStatus(document))
}

const placeholderReferences = new Set(['Sin referencia', 'Opcional', 'Pendiente', 'OT opcional'])

function hasActualDocumentReference(document) {
  const reference = String(document?.reference || '').trim()
  return Boolean(reference && !placeholderReferences.has(reference))
}

function supplementalSetForProforma(caseItem, proformaId) {
  const sets = normalizeDocuments(caseItem?.documents).supplementalSets
  return sets.find((set) => (
    set.proformaId === proformaId
    || set.documents?.proforma?.reference === proformaId
    || set.documents?.proforma?.referencePlaceholder === proformaId
  ))
}

function hiddenDamageDocumentsReady(caseItem, proforma) {
  if (!proforma || proforma.type !== 'Daño oculto') return true
  const set = supplementalSetForProforma(caseItem, proforma.id)
  if (!set) return false
  return Boolean(isDocumentReady(set.documents?.proforma) && (set.clientAssumes || isDocumentReady(set.documents?.ocSeguro)))
}

function hiddenDamageCanAdvanceInventory(caseItem, proforma) {
  if (!proforma || proforma.type !== 'Daño oculto') return true
  const set = supplementalSetForProforma(caseItem, proforma.id)
  return Boolean(set?.sentToBodega && hiddenDamageDocumentsReady(caseItem, proforma))
}

function hiddenDamageSetReadyForBodega(caseItem, set) {
  if (!set || set.type !== 'Daño oculto') return false
  const documents = set.documents || {}
  return isDocumentReady(documents.proforma) && (set.clientAssumes || isDocumentReady(documents.ocSeguro))
}

function hasActiveHiddenDamage(caseItem, proformasList = []) {
  if (!caseItem) return false
  const proformas = Array.isArray(proformasList) ? proformasList : []
  const sets = normalizeDocuments(caseItem?.documents).supplementalSets.filter((set) => set.type === 'Daño oculto')
  return sets.some((set) => {
    const proforma = proformas.find((item) => item.caseId === caseItem.id && item.id === set.proformaId)
    return !set.sentToBodega || !proforma?.availabilityConfirmed
  })
}

function latestHiddenDamageSet(caseItem) {
  const sets = normalizeDocuments(caseItem?.documents).supplementalSets.filter((set) => set.type === 'Daño oculto')
  return sets[sets.length - 1] || null
}

function otReferenceContextForExecution(caseItem) {
  const latestSet = latestHiddenDamageSet(caseItem)
  if (latestSet) {
    const document = latestSet.documents?.ot
    return {
      document,
      label: 'OT del daño oculto',
      target: { scope: 'set', setId: latestSet.id, key: 'ot', title: document?.title || 'OT daño oculto' },
    }
  }
  const document = normalizeDocuments(caseItem?.documents).ot
  return {
    document,
    label: 'OT',
    target: { scope: 'base', key: 'ot', title: document?.title || 'OT' },
  }
}

function hasOTReference(caseItem) {
  return hasActualDocumentReference(otReferenceContextForExecution(caseItem).document)
}

function isExpedienteRestricted(caseItem) {
  return expedienteRestrictedStates.includes(caseItem.state)
}

function canManageCaseDocuments(role, currentCase, activeUser) {
  if (role === 'Administrador' || role === 'Jefe de Enderezado') return true
  if (role === 'Compras') return true
  return role === 'Responsable del caso' && (currentCase.registeredBy === activeUser.name || currentCase.owner === activeUser.name)
}

function canAddHiddenDamageDocuments(role, currentCase, activeUser) {
  const canUseHiddenDamage = role === 'Jefe de Enderezado' || role === 'Administrador'
  return canUseHiddenDamage && canManageCaseDocuments(role, currentCase, activeUser) && currentCase.otExecutionApproved && isPostAvailabilityState(currentCase.state) && currentCase.state !== 'Cerrado'
}

function canAddFiniquitoDocument(role, currentCase, proformasList = []) {
  if (!currentCase) return false
  const hasAvailabilityWindow = numericValue(currentCase.availability) < 100 || hasActiveHiddenDamage(currentCase, proformasList)
  return (role === 'Facturacion' || role === 'Administrador' || role === 'Compras') && currentCase.otExecutionApproved && currentCase.state !== 'Cerrado' && hasAvailabilityWindow
}

function canAttemptCloseCase(role, currentCase, activeUser) {
  return Boolean(currentCase && currentCase.state !== 'Cerrado' && (
    role === 'Administrador'
    || role === 'Jefe de Enderezado'
    || role === 'Compras'
    || (role === 'Responsable del caso' && (currentCase.registeredBy === activeUser.name || currentCase.owner === activeUser.name))
  ))
}

function canCloseCase(role, currentCase, activeUser) {
  if (role === 'Compras') return Boolean(currentCase && currentCase.state !== 'Cerrado')
  return canAttemptCloseCase(role, currentCase, activeUser)
    && currentCase.otExecutionApproved
    && numericValue(currentCase.availability) === 100
    && currentCase.state === 'Disponibilidad completa para el caso'
}

function canProceedOTAtCaseLevel(role, currentCase, ordersData, proformasList) {
  if (!(role === 'Administrador' || role === 'Jefe de Enderezado')) return false
  if (!currentCase || currentCase.otExecutionApproved) return false
  if (!hasConfirmedValidProforma(currentCase.id, proformasList)) return false
  const hasCasePE = ordersData.some((order) => order.caseId === currentCase.id)
  return (currentCase.state === 'Disponibilidad completa para el caso' && currentCase.availability === 100)
    || currentCase.state === 'Pedido especial requerido'
    || hasCasePE
}

function hasJefeVisibleProforma(caseId, proformasList) {
  return hasInitialConfirmedProforma(caseId, proformasList)
}

function hasConfirmedValidProforma(caseId, proformasList) {
  return proformasList.some((proforma) => proforma.caseId === caseId && isConfirmedValidProforma(proforma))
}

function casePassedInitialInventoryValidation(caseItem, proformasList) {
  return hasInitialConfirmedProforma(caseItem.id, proformasList)
}

function canSeeCase(caseItem, role, activeUser, proformasList) {
  if (!isAllowedCaseState(caseItem.state)) return role === 'Administrador'
  if (role === 'Administrador') return true
  if (role === 'Jefe de Enderezado') return hasJefeVisibleProforma(caseItem.id, proformasList)
  if (role === 'Responsable del caso') return caseItem.registeredBy === activeUser.name || caseItem.owner === activeUser.name
  if (isExpedienteRestricted(caseItem)) return false
  if (role === 'Bodega de Enderezado') {
    return ['En validación de disponibilidad', 'Pedido especial requerido', 'Pedido especial en seguimiento', 'Disponibilidad parcial actualizada', 'Disponibilidad completa para el caso'].includes(caseItem.state)
      || casePassedInitialInventoryValidation(caseItem, proformasList)
  }
  if (role === 'Compras') {
    return ['Pedido especial requerido', 'Pedido especial en seguimiento', 'Disponibilidad parcial actualizada', 'Disponibilidad completa para el caso', 'Finiquito abierto', 'Listo para cierre'].includes(caseItem.state)
  }
  if (role === 'Facturacion') {
    return caseItem.otExecutionApproved || caseHasFiniquito(caseItem) || caseItem.state === 'Finiquito abierto'
  }
  return true
}

function visibleCaseTabsFor(currentCase, ordersData, proformasList) {
  if (currentCase.state === 'Expediente pendiente de completar') return ['Expediente']
  const hasCaseOrders = ordersData.some((order) => order.caseId === currentCase.id)
  const hasValidProforma = hasConfirmedValidProforma(currentCase.id, proformasList)
  return caseTabs.filter((tab) => {
    if (tab === 'Pedidos Especiales') return hasCaseOrders
    if (!hasValidProforma && tab !== 'Expediente' && tab !== 'Proformas') return false
    return true
  })
}

function normalizeDocuments(documents = {}) {
  return {
    ot: documents.ot || pendingDocument('OT', 'Sin referencia', 'Orden de taller pendiente'),
    proforma: documents.proforma || pendingDocument('Presupuesto / Proforma', 'Sin referencia', 'Presupuesto pendiente'),
    ocSeguro: documents.ocSeguro || pendingDocument('OC del seguro', 'Sin referencia', 'OC del seguro pendiente'),
    additional: documents.additional || [],
    supplementalSets: documents.supplementalSets || [],
    futureGroups: documents.futureGroups || [],
  }
}

function defaultProformaIdForCase(caseItem, proformasList) {
  const caseProformas = proformasList.filter((item) => item.caseId === caseItem.id)
  const pendingHiddenDamage = caseProformas.find((item) => (
    item.type === 'Daño oculto'
    && item.excelState === 'Pendiente'
    && hiddenDamageCanAdvanceInventory(caseItem, item)
  ))
  if (pendingHiddenDamage) return pendingHiddenDamage.id
  const referencedProforma = normalizeDocuments(caseItem.documents).proforma?.reference
  return caseProformas.find((item) => item.id === referencedProforma)?.id || caseProformas[0]?.id || ''
}

function patchDocumentAt(documents, target, updater) {
  const next = normalizeDocuments(documents)
  if (target.scope === 'base') {
    next[target.key] = updater(next[target.key])
  }
  if (target.scope === 'additional') {
    next.additional = next.additional.map((document) => document.id === target.id ? updater(document) : document)
  }
  if (target.scope === 'set') {
    next.supplementalSets = next.supplementalSets.map((set) => {
      if (set.id !== target.setId) return set
      return {
        ...set,
        documents: {
          ...set.documents,
          [target.key]: updater(set.documents[target.key]),
        },
      }
    })
  }
  return next
}

function downloadHrefFor(document) {
  if (document?.url) return document.url
  const content = [
    document?.title || 'Documento',
    `Referencia: ${document?.reference || 'Sin referencia'}`,
    `Descripcion: ${document?.description || 'Sin descripcion'}`,
    document?.preview || 'Documento demo del expediente.',
  ].join('\n')
  return `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`
}

function App() {
  const [casesData, setCasesData] = useState(() => cases.map(normalizeCaseFiniquito))
  const [ordersData, setOrdersData] = useState(specialOrders)
  const [proformasData, setProformasData] = useState(proformas)
  const [peLinesData, setPeLinesData] = useState(peLines)
  const [usersCatalog, setUsersCatalog] = useState(initialUsersCatalog)
  const [reasonCatalogs, setReasonCatalogs] = useState(initialReasonCatalogs)
  const [lastReceptionSnapshot, setLastReceptionSnapshot] = useState(null)
  const [bitacoraData, setBitacoraData] = useState(initialBitacoraEvents)
  const [toast, setToast] = useState('')
  const [section, setSection] = useState('cases')
  const [role, setRole] = useState('Bodega de Enderezado')
  const [selectedCase, setSelectedCase] = useState(null)
  const [selectedPE, setSelectedPE] = useState(null)
  const [selectedProformaId, setSelectedProformaId] = useState('PF-001')
  const [caseTab, setCaseTab] = useState('Expediente')
  const [peTab, setPeTab] = useState('Detalle')
  const [modal, setModal] = useState(null)
  const [drawer, setDrawer] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [orderFiltersOpen, setOrderFiltersOpen] = useState(true)
  const toastTimer = useRef(null)

  const activeUser = getActiveUser(role, usersCatalog)
  const caseFiltersData = useMemo(() => caseFiltersForUsers(usersCatalog), [usersCatalog])
  const dateChangeReasons = useMemo(() => activeDateChangeReasons(reasonCatalogs), [reasonCatalogs])
  const visibleCases = useMemo(() => casesData.filter((item) => canSeeCase(item, role, activeUser, proformasData)), [activeUser, casesData, proformasData, role])
  const currentCase = casesData.find((item) => item.id === selectedCase?.id) || visibleCases[0] || casesData[0]
  const currentPE = ordersData.find((item) => item.id === selectedPE?.id) || ordersData[0]
  const currentPECase = casesData.find((item) => item.id === currentPE.caseId) || currentCase
  const currentCaseProformas = proformasData.filter((item) => item.caseId === currentCase.id)
  const currentJefeProformas = currentCaseProformas.filter(isConfirmedValidProforma)
  const currentProforma = role === 'Jefe de Enderezado'
    ? currentJefeProformas.find((item) => item.id === selectedProformaId) || currentJefeProformas[0]
    : currentCaseProformas.find((item) => item.id === selectedProformaId) || currentCaseProformas[0]

  const pageTitle = useMemo(() => {
    if (section === 'cases' && !selectedCase) return 'Casos'
    if (section === 'cases') return `Caso ${currentCase.id}`
    if (section === 'orders' && !selectedPE) return 'Pedidos Especiales'
    if (section === 'orders') return currentPE.id
    return 'Administracion'
  }, [currentCase.id, currentPE.id, section, selectedCase, selectedPE])

  function openCase(item = casesData[0]) {
    setSelectedCase(item)
    setSelectedPE(null)
    setSection('cases')
    setCaseTab('Expediente')
    setSelectedProformaId(defaultProformaIdForCase(item, proformasData))
  }

  function openPE(item = ordersData[0]) {
    setSelectedPE(item)
    setSelectedCase(null)
    setSection('orders')
    setPeTab('Detalle')
  }

  function openPEBitacora(item) {
    setSelectedPE(item)
    setDrawer('Bitacora del PE')
  }

  function openJDERegistration(item) {
    setSelectedPE(item)
    setModal('Registrar JDE / OC JDE')
  }

  function handleRoleChange(nextRole) {
    setRole(nextRole)
    setSelectedCase(null)
    setSelectedPE(null)
    setSection(nextRole === 'Compras' ? 'orders' : 'cases')
    setCaseTab('Expediente')
    setPeTab('Detalle')
  }

  function resetToList(target) {
    if (target === 'cases') {
      setSelectedCase(null)
      setSection('cases')
    }
    if (target === 'orders') {
      setSelectedPE(null)
      setSection('orders')
    }
  }

  function addBitacora(scope, entityId, event, previousValue, newValue, reason, comment) {
    const now = new Date().toLocaleString('es-NI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    setBitacoraData((current) => [{
      scope,
      entityId,
      row: [now, event, previousValue, newValue, role, reason, comment],
    }, ...current])
  }

  function addCaseBitacora(caseId, event, previousValue, newValue, reason, comment) {
    addBitacora('Caso', caseId, event, previousValue, newValue, reason, comment)
  }

  function addPEBitacora(peId, event, previousValue, newValue, reason, comment) {
    addBitacora('PE', peId, event, previousValue, newValue, reason, comment)
  }

  function showToast(message, duration = 2600) {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(''), duration)
  }

  function handleUpdateUserCatalog(userId, field, value) {
    const previousUser = usersCatalog.find((user) => user.id === userId)
    if (field === 'name' && previousUser?.name && value.trim() && previousUser.name !== value) {
      setCasesData((current) => current.map((item) => ({
        ...item,
        owner: item.owner === previousUser.name ? value : item.owner,
        registeredBy: item.registeredBy === previousUser.name ? value : item.registeredBy,
      })))
      setSelectedCase((current) => current ? {
        ...current,
        owner: current.owner === previousUser.name ? value : current.owner,
        registeredBy: current.registeredBy === previousUser.name ? value : current.registeredBy,
      } : current)
    }
    setUsersCatalog((current) => {
      let next = current.map((user) => (user.id === userId ? { ...user, [field]: value } : user))
      const updatedUser = next.find((user) => user.id === userId)
      if (!updatedUser) return current
      if (field === 'primary' && value) {
        next = next.map((user) => (
          user.role === updatedUser.role
            ? { ...user, primary: user.id === userId, active: user.id === userId ? true : user.active }
            : user
        ))
      }
      if (field === 'active' && !value) {
        next = next.map((user) => (user.id === userId ? { ...user, active: false, primary: false } : user))
      }
      if (field === 'role') {
        next = next.map((user) => (user.id === userId ? { ...user, primary: false } : user))
      }
      return next
    })
  }

  function handleAddUserCatalog() {
    setUsersCatalog((current) => {
      let nextNumber = current.length + 1
      let nextId = `USR-${String(nextNumber).padStart(3, '0')}`
      while (current.some((user) => user.id === nextId)) {
        nextNumber += 1
        nextId = `USR-${String(nextNumber).padStart(3, '0')}`
      }
      return [
        ...current,
        {
          id: nextId,
          name: 'Nuevo usuario',
          initials: 'NU',
          role: 'Responsable del caso',
          area: 'Responsable del caso',
          active: true,
          primary: false,
        },
      ]
    })
    showToast('Usuario agregado al catalogo')
  }

  function handleUpdateReasonCatalog(reasonId, field, value) {
    setReasonCatalogs((current) => ({
      ...current,
      dateChangeReasons: current.dateChangeReasons.map((reason) => (
        reason.id === reasonId ? { ...reason, [field]: value } : reason
      )),
    }))
  }

  function handleAddReasonCatalog() {
    setReasonCatalogs((current) => {
      let nextNumber = current.dateChangeReasons.length + 1
      let nextId = `MOT-FECHA-${String(nextNumber).padStart(3, '0')}`
      while (current.dateChangeReasons.some((reason) => reason.id === nextId)) {
        nextNumber += 1
        nextId = `MOT-FECHA-${String(nextNumber).padStart(3, '0')}`
      }
      return {
        ...current,
        dateChangeReasons: [
          ...current.dateChangeReasons,
          { id: nextId, label: 'Nuevo motivo', active: true },
        ],
      }
    })
    showToast('Motivo agregado al catalogo')
  }

  function handleModalConfirm(name, values) {
    if (name === 'Crear caso') {
      const nextId = `CP-${String(casesData.length + 123).padStart(6, '0')}`
      const requestedProformaId = values.proforma.trim()
      const nextProformaId = requestedProformaId ? uniqueProformaId(requestedProformaId, proformasData) : ''
      const clientAssumes = Boolean(values.clientAssumes)
      const nextCase = {
        id: nextId,
        client: values.client || 'Cliente nuevo',
        vehicle: values.vehicle || 'Vehiculo pendiente',
        plate: values.plate || 'Sin placa',
        insurer: clientAssumes ? '' : values.insurer,
        clientAssumes,
        owner: activeUser.name,
        registeredBy: activeUser.name,
        state: 'Expediente pendiente de completar',
        availability: 0,
        openPE: 0,
        finiquito: 'No',
        hasFiniquito: false,
        finiquitosCount: 0,
        nextAction: values.proforma ? 'Cargar detalle de proforma' : 'Completar expediente',
        updated: 'Ahora',
        documents: initialCaseDocuments({
          ot: values.ot,
          proforma: nextProformaId,
          clientAssumes,
        }),
      }
      setCasesData((current) => [nextCase, ...current])
      if (nextProformaId) {
        setProformasData((current) => [initialProformaRecord(nextProformaId, nextId), ...current])
        setSelectedProformaId(nextProformaId)
      } else {
        setSelectedProformaId('')
      }
      setSelectedCase(nextCase)
      setSection('cases')
      setCaseTab('Expediente')
      addCaseBitacora(nextId, 'Caso creado', '-', nextId, 'Creacion manual', `Caso asociado a ${activeUser.name}`)
      showToast(`Caso ${nextId} creado`)
      return
    }

    if (name === 'Generar PE') {
      if (role === 'Bodega de Enderezado') {
        showToast('Bodega queda como visor despues de confirmar disponibilidad')
        return
      }
      const targetProforma = currentProforma ? recalculateProforma(currentProforma) : null
      const selectedLines = selectedPELinesForProforma(targetProforma)
      if (!targetProforma || targetProforma.peGenerated || selectedLines.length === 0) {
        showToast('Seleccione al menos un item faltante para generar PE')
        return
      }
      if (!hiddenDamageCanAdvanceInventory(currentCase, targetProforma)) {
        showToast('Complete y envie el expediente de daño oculto a Bodega antes de generar PE')
        return
      }
      const nextId = `PE-${String(ordersData.length + 45).padStart(5, '0')}`
      const availabilityBase = scopedAvailabilityBaseForPE(targetProforma, selectedLines)
      const nextPE = {
        id: nextId,
        caseId: currentCase.id,
        client: currentCase.client,
        proforma: targetProforma.id,
        state: 'Generado',
        jde: 'Sin JDE',
        oc: '-',
        eta: 'Sin fecha',
        alert: 'Sin fecha estimada',
        availability: 0,
        availabilityBase,
        pendingLines: selectedLines.length,
        nextAction: 'Bodega carga en JDE',
      }
      setOrdersData((current) => [nextPE, ...current])
      setPeLinesData(selectedLines.map((line) => ({
        line: line.item,
        sku: line.sku,
        description: line.description,
        requested: numericValue(line.missing),
        received: 0,
        pending: numericValue(line.missing),
        state: 'Pendiente',
        selected: false,
        estimatedDate: '',
        lineOc: '',
        requiredByWorkshop: 'Sí',
        receivedDate: '-',
        user: 'Bodega',
        note: line.authorization === 'No autorizado' ? 'Seleccionado por Jefe sin autorizacion de seguro' : 'Autorizado por seguro',
      })))
      setProformasData((current) => current.map((item) => item.id === targetProforma.id ? recalculateProforma({
        ...item,
        peCount: (item.peCount || 0) + 1,
        peGenerated: true,
        peId: nextId,
        peProcessApproved: true,
        peSelectionEnabled: false,
        lines: item.lines.map((line) => {
          if (line.peSelected && numericValue(line.missing) > 0) {
            return {
              ...line,
              pe: nextId,
              eligible: 'Si',
              decision: line.authorization === 'Autorizado' ? 'Aprobado seguro' : 'Aprobado por Jefe',
            }
          }
          if (numericValue(line.missing) > 0) {
            return {
              ...line,
              eligible: line.eligible || 'No',
              decision: line.decision || 'No solicitado',
            }
          }
          return {
            ...line,
            eligible: 'No aplica',
            decision: 'No aplica',
          }
        }),
      }) : item))
      setCasesData((current) => current.map((item) => item.id === currentCase.id ? {
        ...item,
        openPE: item.openPE + 1,
        state: 'Pedido especial requerido',
        availability: availabilityBase,
        nextAction: 'Bodega carga en JDE',
        updated: 'Ahora',
      } : item))
      setSelectedCase((current) => current?.id === currentCase.id ? {
        ...current,
        openPE: current.openPE + 1,
        state: 'Pedido especial requerido',
        availability: availabilityBase,
        nextAction: 'Bodega carga en JDE',
        updated: 'Ahora',
      } : current)
      addPEBitacora(nextId, 'PE generado', '-', nextId, 'Items seleccionados por Jefe', 'Solicitud enviada al equipo de Bodega para su carga en JDE')
      addCaseBitacora(currentCase.id, 'PE generado', '-', nextId, 'Items seleccionados por Jefe', `Disponibilidad recalculada a ${availabilityBase}% excluyendo faltantes no enviados a PE`)
      showToast('Solicitud enviada al equipo de Bodega para su carga en JDE', 5000)
      window.setTimeout(() => setModal('Proceder con OT'), 0)
      return
    }

    if (name === 'Registrar JDE / OC JDE') {
      const targetId = currentPE.id
      const registeringJde = role === 'Bodega de Enderezado' || (role === 'Administrador' && currentPE.state === 'Generado')
      const nextJde = registeringJde ? values.jde.trim() || currentPE.jde || 'Sin JDE' : currentPE.jde
      const nextOc = registeringJde ? currentPE.oc : values.oc || currentPE.oc || 'OC-4455'
      const nextPEState = registeringJde ? 'PE solicitado en JDE' : currentPE.state
      const nextPENextAction = registeringJde ? 'Compras genera OC correspondiente' : 'Asignar fecha estimada'
      setOrdersData((current) => current.map((item) => item.id === targetId ? { ...item, jde: nextJde, oc: nextOc, state: nextPEState, nextAction: nextPENextAction } : item))
      setSelectedPE((current) => current ? { ...current, jde: nextJde, oc: nextOc, state: nextPEState, nextAction: nextPENextAction } : current)
      if (registeringJde) {
        setCasesData((current) => current.map((item) => item.id === currentPE.caseId ? {
          ...item,
          state: 'Pedido especial en seguimiento',
          nextAction: 'Compras genera OC correspondiente',
          updated: 'Ahora',
        } : item))
        setSelectedCase((current) => current?.id === currentPE.caseId ? {
          ...current,
          state: 'Pedido especial en seguimiento',
          nextAction: 'Compras genera OC correspondiente',
          updated: 'Ahora',
        } : current)
        addPEBitacora(targetId, 'Solicitud JDE registrada', currentPE.jde, nextJde, 'Bodega registra solicitud JDE', 'Notificacion enviada a Compras para generar OC')
        addCaseBitacora(currentPE.caseId, 'Pedido especial en seguimiento', currentPE.state, nextPEState, 'Bodega registra solicitud JDE', `PE ${targetId} asociado a ${nextJde}`)
        showToast('Notificación enviada a Compras', 5000)
        return
      }
      addPEBitacora(targetId, 'OC JDE registrada', currentPE.oc, nextOc, 'Compras registra OC', values.comment || 'OC JDE registrada por Compras')
      showToast('OC JDE registrada')
      return
    }

    if (name === 'Cambiar fecha') {
      const linesToUpdate = selectedOpenPELines(peLinesData)
      if (linesToUpdate.length === 0) {
        showToast('Seleccione al menos una linea pendiente para asignar fecha')
        return
      }
      const requiresReason = selectedDateAssignmentRequiresReason(peLinesData)
      const nextDate = values.newDate || '20/09/2026'
      const nextLines = normalizePELines(peLinesData).map((line) => {
        if (!line.selected || line.pending === 0) return line
        return {
          ...line,
          selected: false,
          estimatedDate: nextDate,
          lineOc: line.lineOc || currentPE.oc,
          user: 'Compras',
        }
      })
      const nextEta = maxEstimatedDateForLines(nextLines)
      const nextAction = allOpenPELinesHaveEstimatedDate(nextLines) ? 'Confirmar disponibilidad fisica' : 'Asignar fecha estimada'
      setPeLinesData(nextLines)
      setOrdersData((current) => current.map((item) => item.id === currentPE.id ? {
        ...item,
        eta: nextEta,
        alert: '30 dias',
        state: 'PE en camino',
        nextAction,
      } : item))
      setSelectedPE((current) => current ? {
        ...current,
        eta: nextEta,
        alert: '30 dias',
        state: 'PE en camino',
        nextAction,
      } : current)
      const eventName = requiresReason ? 'Cambio de fecha PE' : 'Asignación de fecha PE'
      const eventReason = requiresReason ? (values.reason || 'Cambio de fecha') : 'Fecha nueva'
      if (eventReason !== 'Otro') {
        addPEBitacora(currentPE.id, eventName, currentPE.eta, nextEta, eventReason, values.comment || `Fecha ${nextDate} asignada a ${linesToUpdate.length} linea(s)`)
        addCaseBitacora(currentPE.caseId, eventName, currentPE.eta, nextEta, eventReason, `PE ${currentPE.id}: fecha ${nextDate} asignada a ${linesToUpdate.length} linea(s)`)
      }
      showToast('Se actualizo', 5000)
      return
    }

    if (name === 'Confirmar disponibilidad fisica y cantidades') {
      if (!canManagePEReceipt(role)) {
        showToast('Confirmación disponible solo para Compras')
        return
      }
      const linesToReceive = selectedOpenPELines(peLinesData)
      if (linesToReceive.length === 0) {
        showToast('Seleccione al menos una linea pendiente para confirmar disponibilidad')
        return
      }
      if (!selectedPELinesReadyForReceipt(peLinesData)) {
        showToast('Todas las lineas seleccionadas deben tener recibida mayor que cero y mayor a lo ya confirmado')
        return
      }
      const relatedCaseBefore = casesData.find((item) => item.id === currentPE.caseId) || currentPECase
      const baseAvailability = availabilityBaseForOrder(currentPE, relatedCaseBefore)
      setLastReceptionSnapshot({
        peId: currentPE.id,
        caseId: currentPE.caseId,
        createdAt: nowMs(),
        order: currentPE,
        caseItem: relatedCaseBefore,
        peLines: normalizePELines(peLinesData),
        revertedLines: linesToReceive.map((line) => `${line.line} / ${line.sku} / recibida ${receiptCaptureValue(line)}`),
      })
      const today = new Date().toLocaleDateString('es-NI')
      const nextLines = normalizePELines(peLinesData).map((line) => {
        if (!line.selected || line.pending === 0) return line
        const received = receiptCaptureValue(line)
        const pending = Math.max(line.requested - received, 0)
        return {
          ...line,
          selected: false,
          received,
          receivedDraft: received,
          pending,
          state: pending === 0 ? 'Completo' : received > 0 ? 'Parcial' : 'Pendiente',
          receivedDate: received > 0 ? today : line.receivedDate,
          user: 'Compras',
          note: values.comment || line.note,
        }
      })
      const nextPEAvailability = peAvailabilityFromLines(nextLines)
      const complete = nextLines.every((line) => line.pending === 0)
      const nextState = complete ? 'PE recibido completo' : 'PE recibido parcial'
      const nextPending = nextLines.filter((line) => line.pending > 0).length
      const previousCaseAvailability = numericValue(relatedCaseBefore?.availability)
      const nextCaseAvailability = caseAvailabilityFromPE(baseAvailability, nextPEAvailability)
      setPeLinesData(nextLines)
      setOrdersData((current) => current.map((item) => item.id === currentPE.id ? {
        ...item,
        state: nextState,
        availability: nextPEAvailability,
        availabilityBase: baseAvailability,
        pendingLines: nextPending,
        alert: complete ? 'Completado' : item.alert,
        nextAction: complete ? 'Validar disponibilidad del caso' : 'Dar seguimiento a pendientes',
      } : item))
      setSelectedPE((current) => current ? {
        ...current,
        state: nextState,
        availability: nextPEAvailability,
        availabilityBase: baseAvailability,
        pendingLines: nextPending,
        alert: complete ? 'Completado' : current.alert,
        nextAction: complete ? 'Validar disponibilidad del caso' : 'Dar seguimiento a pendientes',
      } : current)
      setCasesData((current) => current.map((item) => {
        if (item.id !== currentPE.caseId) return item
        return {
          ...item,
          availability: nextCaseAvailability,
          state: nextCaseAvailability >= 100 ? 'Disponibilidad completa para el caso' : 'Disponibilidad parcial actualizada',
          nextAction: nextCaseAvailability >= 100 ? 'Validar cierre' : 'Compras confirma pendientes',
          updated: 'Ahora',
        }
      }))
      setSelectedCase((current) => {
        if (!current || current.id !== currentPE.caseId) return current
        return {
          ...current,
          availability: nextCaseAvailability,
          state: nextCaseAvailability >= 100 ? 'Disponibilidad completa para el caso' : 'Disponibilidad parcial actualizada',
          nextAction: nextCaseAvailability >= 100 ? 'Validar cierre' : 'Compras confirma pendientes',
          updated: 'Ahora',
        }
      })
      addPEBitacora(currentPE.id, 'Disponibilidad fisica PE', `${currentPE.availability}%`, `${nextPEAvailability}%`, 'Compras confirma recepcion', complete ? 'PE recibido completo' : 'PE recibido parcial')
      addCaseBitacora(currentPE.caseId, 'Disponibilidad caso', `${previousCaseAvailability}%`, `${nextCaseAvailability}%`, 'Recepcion de Pedido Especial', nextCaseAvailability >= 100 ? 'Caso con disponibilidad completa' : 'Caso con disponibilidad parcial actualizada')
      showToast('Listo', 5000)
      return
    }

    if (name === 'Agregar finiquito') {
      if (!canAddFiniquitoDocument(role, currentCase, proformasData)) {
        showToast('Finiquito disponible solo para Facturacion con OT en ejecucion y ventana de disponibilidad abierta')
        return
      }
      const nextFiniquitoCount = caseFiniquitosCount(currentCase) + 1
      const reference = values.finiquitoReference?.trim() || `FIN-${currentCase.id.replace('CP-', '')}-${String(nextFiniquitoCount).padStart(2, '0')}`
      const description = values.finiquitoDescription?.trim() || 'Finiquito registrado desde la bandeja documental'
      const fileName = values.finiquitoFileName?.trim()
      const finiquitoDocument = fileName
        ? registeredDocument(`Finiquito ${nextFiniquitoCount}`, reference, description, fileName)
        : {
          ...pendingDocument(`Finiquito ${nextFiniquitoCount}`, reference, description),
          reference,
          referencePlaceholder: reference,
          status: 'Registrado',
          preview: 'Finiquito registrado sin adjunto.',
        }
      updateCaseDocuments(currentCase.id, (documents) => {
        const nextDocuments = normalizeDocuments(documents)
        return {
          ...nextDocuments,
          additional: [
            ...nextDocuments.additional,
            {
              id: `FIN-${String(nextDocuments.additional.length + 1).padStart(3, '0')}`,
              ...finiquitoDocument,
            },
          ],
        }
      })
      setCasesData((current) => current.map((item) => item.id === currentCase.id ? {
        ...item,
        finiquito: 'Si',
        hasFiniquito: true,
        finiquitosCount: caseFiniquitosCount(item) + 1,
        finiquitoApplied: true,
        otExecutionApproved: false,
        nextAction: 'Finiquito aplicado',
        updated: 'Ahora',
      } : item))
      setSelectedCase((current) => current ? {
        ...current,
        finiquito: 'Si',
        hasFiniquito: true,
        finiquitosCount: caseFiniquitosCount(current) + 1,
        finiquitoApplied: true,
        otExecutionApproved: false,
        nextAction: 'Finiquito aplicado',
        updated: 'Ahora',
      } : current)
      addCaseBitacora(currentCase.id, 'Finiquito aplicado', '-', reference, 'Facturacion registra finiquito', `${fileName ? description : `${description} (sin adjunto)`}. OT en ejecucion marcada No.`)
      showToast('Finiquito aplicado al expediente')
      return
    }

    if (name === 'Marcar expediente como completo') {
      setCasesData((current) => current.map((item) => item.id === currentCase.id ? {
        ...item,
        state: 'En validación de disponibilidad',
        nextAction: 'Bodega valida disponibilidades',
        updated: 'Ahora',
      } : item))
      setSelectedCase((current) => current ? { ...current, state: 'En validación de disponibilidad', nextAction: 'Bodega valida disponibilidades', updated: 'Ahora' } : current)
      addCaseBitacora(currentCase.id, 'Expediente enviado a Bodega', 'Expediente pendiente de completar', 'En validación de disponibilidad', 'Responsable confirma expediente', 'Solicitud enviada al equipo de Bodega')
      showToast('Se proceso el expediente', 10000)
      return
    }

    if (name === 'Agregar documento al expediente') {
      const title = values.documentTitle?.trim() || values.documentType || 'Documento adicional'
      const reference = values.documentReference?.trim() || 'AD-SIN-REF'
      const description = values.documentDescription?.trim() || 'Documento adicional del expediente'
      const fileName = values.documentFileName?.trim() || ''
      updateCaseDocuments(currentCase.id, (documents) => {
        const nextDocuments = normalizeDocuments(documents)
        let nextId = nextDocuments.additional.length + 1
        let documentId = `AD-${String(nextId).padStart(3, '0')}`
        while (nextDocuments.additional.some((document) => document.id === documentId)) {
          nextId += 1
          documentId = `AD-${String(nextId).padStart(3, '0')}`
        }
        return {
          ...nextDocuments,
          additional: [
            ...nextDocuments.additional,
            {
              id: documentId,
              ...pendingDocument(title, reference, description),
              reference,
              referencePlaceholder: reference,
              status: fileName ? 'Cargado' : 'Pendiente',
              fileName,
              preview: fileName ? `${fileName} cargado desde el popup documental.` : '',
            },
          ],
        }
      })
      showToast('Documento adicional agregado')
      return
    }

    if (name === 'Agregar daño oculto') {
      if (!canAddHiddenDamageDocuments(role, currentCase, activeUser)) {
        showToast('Daño oculto disponible solo para Jefe con OT en ejecucion')
        return
      }
      const reason = values.hiddenDamageReason.trim()
      if (!reason) {
        showToast('Indique el motivo del daño oculto')
        return
      }
      const proformaReference = values.hiddenDamageProforma.trim()
      const proformaId = uniqueProformaId(proformaReference, proformasData)
      const ocReference = values.hiddenDamageOC.trim()
      const otReference = values.hiddenDamageOT.trim()
      const clientAssumes = Boolean(values.clientAssumes)
      const existingSets = normalizeDocuments(currentCase.documents).supplementalSets
      let nextSetNumber = existingSets.length + 1
      let nextSetId = `DO-${String(nextSetNumber).padStart(3, '0')}`
      while (existingSets.some((set) => set.id === nextSetId)) {
        nextSetNumber += 1
        nextSetId = `DO-${String(nextSetNumber).padStart(3, '0')}`
      }
      const nextSetDocuments = {
        proforma: values.hiddenDamageProformaFileName
          ? uploadedDocument('Proforma daño oculto', proformaReference, proformaId, reason, values.hiddenDamageProformaFileName)
          : pendingDocument('Proforma daño oculto', proformaId, reason),
      }
      if (!clientAssumes) {
        nextSetDocuments.ocSeguro = values.hiddenDamageOCFileName
          ? uploadedDocument('OC del seguro daño oculto', ocReference, ocReference || 'Pendiente', 'OC del seguro asociada al daño oculto', values.hiddenDamageOCFileName)
          : pendingDocument('OC del seguro daño oculto', ocReference || 'Pendiente', 'OC del seguro asociada al daño oculto')
      }
      nextSetDocuments.ot = otReference
        ? registeredDocument('OT daño oculto', otReference, 'OT opcional asociada al daño oculto', values.hiddenDamageOTFileName)
        : values.hiddenDamageOTFileName
          ? uploadedDocument('OT daño oculto', '', 'Opcional', 'OT opcional asociada al daño oculto', values.hiddenDamageOTFileName)
          : pendingDocument('OT daño oculto', 'Opcional', 'OT opcional asociada al daño oculto')
      const nextSet = {
        id: nextSetId,
        proformaId,
        type: 'Daño oculto',
        reason,
        clientAssumes,
        sentToBodega: false,
        createdAt: 'Ahora',
        documents: nextSetDocuments,
      }
      setProformasData((current) => [initialProformaRecord(proformaId, currentCase.id, 'Daño oculto'), ...current])
      setSelectedProformaId(proformaId)
      setCasesData((current) => current.map((item) => item.id === currentCase.id ? {
        ...item,
        state: 'Presupuesto adicional por daño oculto',
        nextAction: 'Cargar detalle de proforma por daño oculto',
        updated: 'Ahora',
        documents: {
          ...normalizeDocuments(item.documents),
          supplementalSets: [...normalizeDocuments(item.documents).supplementalSets, nextSet],
        },
      } : item))
      setSelectedCase((current) => current ? {
        ...current,
        state: 'Presupuesto adicional por daño oculto',
        nextAction: 'Cargar detalle de proforma por daño oculto',
        updated: 'Ahora',
        documents: {
          ...normalizeDocuments(current.documents),
          supplementalSets: [...normalizeDocuments(current.documents).supplementalSets, nextSet],
        },
      } : current)
      addCaseBitacora(currentCase.id, 'Daño oculto', '-', proformaId, 'Jefe registra daño oculto', reason)
      showToast('Daño oculto agregado al expediente')
      return
    }

    if (name === 'Cerrar caso') {
      if (!canCloseCase(role, currentCase, activeUser)) {
        showToast('Cierre disponible solo con disponibilidad al 100%')
        return
      }
      setCasesData((current) => current.map((item) => item.id === currentCase.id ? {
        ...item,
        state: 'Cerrado',
        otExecutionApproved: false,
        nextAction: 'Caso cerrado',
        updated: 'Ahora',
      } : item))
      setSelectedCase((current) => current ? { ...current, state: 'Cerrado', otExecutionApproved: false, nextAction: 'Caso cerrado', updated: 'Ahora' } : current)
      addCaseBitacora(currentCase.id, 'Cierre de caso', currentCase.state, 'Cerrado', 'Disponibilidad completa', 'Caso cerrado desde el workspace. OT en ejecucion marcada No.')
      showToast('Listo')
      return
    }

    if (name === 'Proceder con OT') {
      handleProceedOT(values)
      return
    }

    if (name === 'Confirmar disponibilidad') {
      handleConfirmAvailability()
      return
    }

    if (name === 'Decision operativa') {
      if (role === 'Bodega de Enderezado') {
        showToast('La decision de elegibilidad PE corresponde a Jefe de Enderezado')
        return
      }
      if (!currentProforma) {
        showToast('Seleccione una proforma para aprobar el proceso')
        return
      }
      setProformasData((current) => current.map((item) => item.id === currentProforma.id ? {
        ...item,
        peProcessApproved: true,
        lines: item.lines.map((line) => ({
          ...line,
          decision: line.missing > 0 ? line.decision || 'Pendiente' : 'No aplica',
          eligible: line.missing > 0 && line.authorization === 'No autorizado' ? line.eligible || 'Si' : 'No aplica',
        })),
      } : item))
      showToast('Proceso de Pedido Especial aprobado por Jefe')
      return
    }

    if (name === 'Validar cierre') {
      showToast('Cierre bloqueado: existen PE, lineas o finiquitos pendientes')
    }

    if (name === 'Revertir ultima confirmacion') {
      handleRevertLastReception()
    }
  }

  function updateCaseDocuments(caseId, updater) {
    setCasesData((current) => current.map((item) => {
      if (item.id !== caseId) return item
      return {
        ...item,
        documents: updater(normalizeDocuments(item.documents)),
      }
    }))
  }

  function handleLoadDocument(target, file) {
    updateCaseDocuments(currentCase.id, (documents) => patchDocumentAt(documents, target, (document) => {
      const title = target.title || document?.title || baseDocumentMeta[target.key]?.title || 'Documento'
      if (!file) return demoDocument(title, document?.reference || document?.referencePlaceholder || 'REF-DEMO', document?.description || 'Documento cargado', 'Cargado')
      return {
        ...document,
        title,
        status: 'Cargado',
        fileName: file.name,
        preview: `${file.name} cargado localmente para vista previa del expediente.`,
        url: URL.createObjectURL(file),
      }
    }))
    showToast(`${target.title || 'Documento'} cargado`)
  }

  function handleUpdateDocumentMeta(target, field, value) {
    updateCaseDocuments(currentCase.id, (documents) => patchDocumentAt(documents, target, (document) => ({
      ...document,
      [field]: value,
    })))
  }

  function handleRemoveDocument(target) {
    if (target.scope === 'additional') {
      updateCaseDocuments(currentCase.id, (documents) => ({
        ...normalizeDocuments(documents),
        additional: normalizeDocuments(documents).additional.filter((document) => document.id !== target.id),
      }))
      showToast('Documento adicional eliminado')
      return
    }
    if (target.scope === 'base' && target.key === 'proforma') {
      setProformasData((current) => current.filter((item) => item.caseId !== currentCase.id))
      setSelectedProformaId('')
    }
    updateCaseDocuments(currentCase.id, (documents) => patchDocumentAt(documents, target, (document) => pendingDocument(document?.title || target.title || 'Documento', document?.reference || document?.referencePlaceholder || 'Sin referencia', document?.description || 'Documento pendiente')))
    showToast(`${target.title || 'Documento'} eliminado`)
  }

  function handleAddAdditionalDocument() {
    setModal('Agregar documento al expediente')
  }

  function handleAddHiddenDamage() {
    setModal('Agregar daño oculto')
  }

  function handleAddFiniquito() {
    setModal('Agregar finiquito')
  }

  function handleMarkHiddenDamageComplete(setId) {
    const documents = normalizeDocuments(currentCase.documents)
    const targetSet = documents.supplementalSets.find((set) => set.id === setId)
    if (!targetSet || targetSet.type !== 'Daño oculto') {
      showToast('Seleccione un expediente de daño oculto')
      return
    }
    if (!hiddenDamageSetReadyForBodega(currentCase, targetSet)) {
      showToast(targetSet.clientAssumes ? 'Cargue Proforma para enviar el daño oculto a Bodega' : 'Cargue Proforma y OC del seguro para enviar el daño oculto a Bodega')
      return
    }
    const proformaId = targetSet.proformaId || targetSet.documents?.proforma?.reference
    const updateDocuments = (sourceDocuments) => {
      const nextDocuments = normalizeDocuments(sourceDocuments)
      return {
        ...nextDocuments,
        supplementalSets: nextDocuments.supplementalSets.map((set) => set.id === setId ? {
          ...set,
          sentToBodega: true,
          sentAt: 'Ahora',
        } : set),
      }
    }
    setCasesData((current) => current.map((item) => item.id === currentCase.id ? {
      ...item,
      state: 'En validación de disponibilidad',
      nextAction: 'Bodega valida disponibilidad de daño oculto',
      updated: 'Ahora',
      documents: updateDocuments(item.documents),
    } : item))
    setSelectedCase((current) => current ? {
      ...current,
      state: 'En validación de disponibilidad',
      nextAction: 'Bodega valida disponibilidad de daño oculto',
      updated: 'Ahora',
      documents: updateDocuments(current.documents),
    } : current)
    if (proformaId) setSelectedProformaId(proformaId)
    addCaseBitacora(currentCase.id, 'Expediente daño oculto enviado a Bodega', '-', proformaId || setId, 'Jefe completa documentos minimos', 'Bodega puede cargar disponibilidad de la proforma de daño oculto')
    showToast('Solicitud enviada al equipo de Bodega', 10000)
  }

  function handleRenameProforma(proformaId, nextId) {
    const normalizedId = nextId.trim()
    if (!normalizedId) {
      showToast('El consecutivo de proforma no puede quedar vacio')
      return false
    }
    if (normalizedId === proformaId) return true
    if (proformasData.some((item) => item.id === normalizedId && item.id !== proformaId)) {
      showToast('Ya existe una proforma con ese consecutivo')
      return false
    }
    setProformasData((current) => current.map((item) => item.id === proformaId ? { ...item, id: normalizedId } : item))
    setOrdersData((current) => current.map((item) => item.proforma === proformaId ? { ...item, proforma: normalizedId } : item))
    setCasesData((current) => current.map((item) => {
      if (item.id !== currentCase.id) return item
      return {
        ...item,
        documents: patchDocumentAt(item.documents, { scope: 'base', key: 'proforma', title: 'Presupuesto / Proforma' }, (document) => ({
          ...document,
          reference: document.reference === proformaId ? normalizedId : document.reference,
          fileName: document.fileName === `${proformaId}.xlsx` ? `${normalizedId}.xlsx` : document.fileName,
        })),
      }
    }))
    if (selectedProformaId === proformaId) setSelectedProformaId(normalizedId)
    showToast('Consecutivo de proforma actualizado')
    return true
  }

  function handleRequestAvailabilityValidation() {
    setCasesData((current) => current.map((item) => item.id === currentCase.id ? {
      ...item,
      state: 'En validación de disponibilidad',
      nextAction: 'Bodega valida disponibilidades',
      updated: 'Ahora',
    } : item))
    showToast('Solicitud de validación enviada')
  }

  function handleProformaLineChange(proformaId, lineIndex, field, value) {
    if (role === 'Bodega de Enderezado' && field === 'item') return
    setProformasData((current) => current.map((proforma) => {
      if (proforma.id !== proformaId) return proforma
      const nextLines = proforma.lines.map((line, index) => {
        if (index !== lineIndex) return line
        if (field === 'peSelected') {
          return {
            ...line,
            peSelected: value,
            eligible: value ? 'Si' : 'No',
            decision: value ? 'Aprobado por Jefe' : 'Pendiente Jefe',
          }
        }
        return {
          ...line,
          [field]: field === 'required' || field === 'available' ? numericValue(value) : value,
        }
      })
      const changedLine = proforma.lines[lineIndex]
      const skipsRefresh = field === 'available'
        && numericValue(changedLine?.available) === 0
        && numericValue(value) > 0
        && numericValue(value) < numericValue(changedLine?.required)
      const nextProforma = {
        ...proforma,
        lines: nextLines,
      }
      return skipsRefresh ? nextProforma : recalculateProforma(nextProforma)
    }))
  }

  function handlePrepareSpecialOrder(proformaId) {
    const targetProforma = proformasData.find((item) => item.id === proformaId)
    if (!(role === 'Administrador' || role === 'Jefe de Enderezado') || currentCase.state !== 'Pedido especial requerido' || !isConfirmedValidProforma(targetProforma) || targetProforma.peGenerated) {
      showToast('Pedido Especial disponible solo para proformas validas pendientes de solicitud')
      return
    }
    if (!hiddenDamageCanAdvanceInventory(currentCase, targetProforma)) {
      showToast('Complete y envie el expediente de daño oculto a Bodega antes de solicitar PE')
      return
    }
    setProformasData((current) => current.map((item) => item.id === proformaId ? recalculateProforma({
      ...item,
      peSelectionEnabled: true,
      peProcessApproved: true,
      lines: item.lines.map((line) => {
        const hasShortage = numericValue(line.missing) > 0
        if (!hasShortage) {
          return {
            ...line,
            peSelected: false,
            eligible: 'No aplica',
            decision: 'No aplica',
          }
        }
        const preselected = line.authorization === 'Autorizado'
        return {
          ...line,
          peSelected: preselected,
          eligible: preselected ? 'Si' : line.eligible || 'No',
          decision: preselected ? 'Aprobado seguro' : line.decision || 'Pendiente Jefe',
        }
      }),
    }) : item))
    showToast('Seleccione los items para Pedido Especial')
  }

  function handleProceedOT(values = {}) {
    if (!(role === 'Administrador' || role === 'Jefe de Enderezado') || currentCase.otExecutionApproved) return
    const nextOtReference = values.otExecutionNumber?.trim()
    const otContext = otReferenceContextForExecution(currentCase)
    if (!hasActualDocumentReference(otContext.document) && !nextOtReference) {
      showToast('Ingrese el numero de OT para marcar ejecucion')
      return
    }
    const nextAction = currentCase.state === 'Pedido especial requerido' ? 'OT en ejecucion con PE pendiente' : 'OT en ejecucion'
    const activeOtReference = nextOtReference || otContext.document?.reference || ''
    const updateOTDocument = (documents) => patchDocumentAt(documents, otContext.target, (document) => {
      const nextDocument = document || pendingDocument(otContext.target.title, nextOtReference || '', 'Orden de taller asociada al caso')
      return {
        ...nextDocument,
        title: nextDocument.title || otContext.target.title,
        reference: activeOtReference,
        referencePlaceholder: nextDocument.referencePlaceholder || activeOtReference,
        description: nextDocument.description || 'Orden de taller asociada al caso',
        status: nextDocument.status || 'Pendiente',
      }
    })
    setCasesData((current) => current.map((item) => item.id === currentCase.id ? {
      ...item,
      otExecutionApproved: true,
      nextAction,
      updated: 'Ahora',
      documents: nextOtReference ? updateOTDocument(item.documents) : item.documents,
    } : item))
    setSelectedCase((current) => current ? {
      ...current,
      otExecutionApproved: true,
      nextAction,
      updated: 'Ahora',
      documents: nextOtReference ? updateOTDocument(current.documents) : current.documents,
    } : current)
    addCaseBitacora(currentCase.id, 'OT en ejecucion', '-', 'Aprobada', 'Jefe de Enderezado aprueba ejecucion', activeOtReference ? `OT ${activeOtReference}` : (currentCase.state === 'Pedido especial requerido' ? 'Ejecucion con PE pendiente' : 'Disponibilidad completa'))
    showToast('OT marcada en ejecucion')
  }

  function handlePELineSelection(lineIndex, selected) {
    if (!canManagePEReceipt(role) || !hasPEOC(currentPE) || isPEComplete(currentPE)) return
    setPeLinesData((current) => normalizePELines(current).map((line, index) => (
      index === lineIndex && line.pending > 0 ? { ...line, selected } : line
    )))
  }

  function handleToggleAllPELines(selected) {
    if (!canManagePEReceipt(role) || !hasPEOC(currentPE) || isPEComplete(currentPE)) return
    setPeLinesData((current) => normalizePELines(current).map((line) => (
      line.pending > 0 ? { ...line, selected } : { ...line, selected: false }
    )))
  }

  function handlePELineFieldChange(lineIndex, field, value) {
    if (isPEComplete(currentPE)) return
    setPeLinesData((current) => normalizePELines(current).map((line, index) => {
      if (index !== lineIndex) return line
      if (field === 'requiredByWorkshop' && !(role === 'Bodega de Enderezado' || role === 'Administrador')) return line
      if (field === 'lineOc' && !(role === 'Compras' || role === 'Administrador')) return line
      if (field === 'lineOc' && (line.state === 'Completo' || line.pending === 0)) return line
      if (field === 'received' && (!canManagePEReceipt(role) || !line.selected)) return line
      if (field === 'received') {
        return {
          ...line,
          receivedDraft: Math.min(line.requested, numericValue(value)),
        }
      }
      if (field === 'lineOc') {
        addPEBitacora(currentPE.id, 'OC linea PE', line.lineOc || '-', value || '-', 'Compras ajusta OC por linea', `${currentPE.id} / ${line.sku}`)
      }
      if (field === 'requiredByWorkshop') {
        addPEBitacora(currentPE.id, 'Requerido por Taller', line.requiredByWorkshop || 'Sí', value, 'Bodega ajusta requerimiento', `${currentPE.id} / ${line.sku}`)
      }
      return {
        ...line,
        [field]: value,
      }
    }))
  }

  function handleRevertLastReception() {
    if (!canManagePEReceipt(role) || !lastReceptionSnapshot || lastReceptionSnapshot.peId !== currentPE.id || !isReceptionSnapshotActive(lastReceptionSnapshot)) {
      showToast('No hay una confirmación reciente para revertir')
      return
    }
    const currentCaseBeforeRevert = casesData.find((item) => item.id === lastReceptionSnapshot.caseId) || currentPECase
    setPeLinesData(lastReceptionSnapshot.peLines)
    setOrdersData((current) => current.map((item) => item.id === lastReceptionSnapshot.peId ? lastReceptionSnapshot.order : item))
    setSelectedPE((current) => current?.id === lastReceptionSnapshot.peId ? lastReceptionSnapshot.order : current)
    setCasesData((current) => current.map((item) => item.id === lastReceptionSnapshot.caseId ? lastReceptionSnapshot.caseItem : item))
    setSelectedCase((current) => current?.id === lastReceptionSnapshot.caseId ? lastReceptionSnapshot.caseItem : current)
    addPEBitacora(currentPE.id, 'Reversion disponibilidad fisica', currentPE.state, lastReceptionSnapshot.order.state, 'Compras revierte ultima confirmacion', `PE ${currentPE.id}`)
    addCaseBitacora(lastReceptionSnapshot.caseId, 'Reversion disponibilidad caso', `${numericValue(currentCaseBeforeRevert?.availability)}%`, `${numericValue(lastReceptionSnapshot.caseItem?.availability)}%`, 'Reversion de recepcion PE', `Caso ${lastReceptionSnapshot.caseId}`)
    setLastReceptionSnapshot(null)
    showToast('Notificación enviada a los involucrados del caso', 5000)
  }

  function handleLoadExcelDetail(proformaId = selectedProformaId) {
    const parts = [
      ['FAR', 'Faro delantero'],
      ['MOL', 'Moldura lateral'],
      ['GRP', 'Grapas internas'],
      ['BUM', 'Base bumper'],
      ['CAP', 'Capo'],
      ['SOP', 'Soporte radiador'],
      ['GUI', 'Guia bumper'],
      ['RET', 'Retrovisor'],
    ]
    const seed = (proformaId || currentCase.id || '').length
    const nextLines = Array.from({ length: 6 }, (_, index) => {
      const [prefix, description] = parts[(index + seed) % parts.length]
      const required = (index % 4) + 1
      const shortage = index % 3
      const available = Math.max(required - shortage, 0)
      const missing = required - available
      return {
        item: String(index + 1).padStart(3, '0'),
        sku: `${prefix}-${String(120 + seed + index * 17).padStart(3, '0')}`,
        description,
        required,
        available,
        missing,
        state: available === 0 ? 'Pendiente' : available >= required ? 'Completo' : 'Parcial',
        authorization: missing > 0 ? 'No autorizado' : 'Autorizado',
        decision: '',
        eligible: '',
        pe: '',
        note: missing > 0 ? 'Faltante importado del Excel' : 'Disponible',
      }
    })
    const existingTargetProforma = currentCaseProformas.find((item) => item.id === proformaId) || currentCaseProformas.find((item) => item.excelState === 'Pendiente')
    if (!can(role, 'Cargar Excel') || !existingTargetProforma || existingTargetProforma.excelState !== 'Pendiente' || currentCase.state !== 'En validación de disponibilidad') {
      showToast('La carga de detalle solo esta disponible en validación de disponibilidad')
      return
    }
    let nextNumber = proformasData.length + 1
    let targetProformaId = existingTargetProforma?.id || `PF-${String(nextNumber).padStart(3, '0')}`
    while (!existingTargetProforma && proformasData.some((item) => item.id === targetProformaId)) {
      nextNumber += 1
      targetProformaId = `PF-${String(nextNumber).padStart(3, '0')}`
    }
    const requiredTotal = nextLines.reduce((sum, line) => sum + line.required, 0)
    const availableTotal = nextLines.reduce((sum, line) => sum + line.available, 0)
    const availability = requiredTotal ? Math.round((availableTotal / requiredTotal) * 100) : 0
    const decisions = nextLines.filter((line) => line.authorization === 'No autorizado').length
    if (existingTargetProforma?.type === 'Daño oculto' && !hiddenDamageCanAdvanceInventory(currentCase, existingTargetProforma)) {
      showToast('Complete y envie el expediente de daño oculto a Bodega antes de cargar detalle')
      return
    }
    const hiddenDamageSet = existingTargetProforma?.type === 'Daño oculto'
      ? supplementalSetForProforma(currentCase, existingTargetProforma.id)
      : null

    setProformasData((current) => {
      const nextProforma = recalculateProforma({
        id: targetProformaId,
        caseId: currentCase.id,
        type: existingTargetProforma?.type || (currentCaseProformas.length === 0 ? 'Inicial' : 'Daño oculto'),
        excelState: 'Valido',
        peCount: existingTargetProforma?.peCount || 0,
        decisions,
        availabilityConfirmed: false,
        peProcessApproved: false,
        lines: nextLines,
      })
      if (existingTargetProforma) {
        return current.map((item) => item.id === targetProformaId ? nextProforma : item)
      }
      return [...current, nextProforma]
    })
    setSelectedProformaId(targetProformaId)
    setCasesData((current) => current.map((item) => item.id === currentCase.id ? {
      ...item,
      availability,
      nextAction: 'Confirmar disponibilidad',
      updated: 'Ahora',
      documents: patchDocumentAt(item.documents, hiddenDamageSet
        ? { scope: 'set', setId: hiddenDamageSet.id, key: 'proforma', title: 'Proforma daño oculto' }
        : { scope: 'base', key: 'proforma', title: 'Presupuesto / Proforma' }, (document) => ({
        ...document,
        status: 'Valido',
        fileName: document.fileName || `${targetProformaId}.xlsx`,
        preview: `Excel de ${targetProformaId} cargado con lineas importadas.`,
      })),
    } : item))
    addCaseBitacora(currentCase.id, 'Detalle de proforma cargado', '-', targetProformaId, 'Bodega carga detalle', `Disponibilidad preliminar ${availability}%`)
    showToast('Detalle de proforma cargado')
  }

  function handleClearProformaDetail(proformaId) {
    const targetProforma = proformasData.find((item) => item.id === proformaId)
    if (!canClearProformaDetail(role, currentCase, targetProforma)) {
      showToast('El detalle ya no puede limpiarse en esta etapa')
      return
    }
    setProformasData((current) => current.map((item) => item.id === proformaId ? {
      ...item,
      excelState: 'Pendiente',
      availability: 0,
      decisions: 0,
      availabilityConfirmed: false,
      peProcessApproved: false,
      lines: [],
    } : item))
    setCasesData((current) => current.map((item) => item.id === currentCase.id ? {
      ...item,
      availability: 0,
      nextAction: 'Cargar detalle de proforma',
      updated: 'Ahora',
    } : item))
    addCaseBitacora(currentCase.id, 'Detalle de proforma limpiado', targetProforma.id, '-', 'Bodega limpia detalle', 'Disponibilidad preliminar reiniciada')
    showToast('Detalle de proforma limpiado')
  }

  function handleConfirmAvailability() {
    const targetProforma = currentProforma ? recalculateProforma(currentProforma) : null
    if (!hiddenDamageCanAdvanceInventory(currentCase, targetProforma)) {
      showToast('Complete y envie el expediente de daño oculto a Bodega antes de confirmar disponibilidad')
      return
    }
    const complete = targetProforma.availability >= 100
    const nextState = complete ? 'Disponibilidad completa para el caso' : 'Pedido especial requerido'
    const nextAction = complete ? 'Jefe valida inicio de reparacion' : 'Jefe aprueba items para Pedido Especial'
    setProformasData((current) => current.map((item) => item.id === targetProforma.id ? { ...targetProforma, availabilityConfirmed: true } : item))
    setCasesData((current) => current.map((item) => item.id === currentCase.id ? {
      ...item,
      state: nextState,
      availability: targetProforma.availability,
      nextAction,
      updated: 'Ahora',
    } : item))
    setSelectedCase((current) => current ? { ...current, state: nextState, availability: targetProforma.availability, nextAction, updated: 'Ahora' } : current)
    addCaseBitacora(currentCase.id, 'Disponibilidad confirmada', currentCase.state, nextState, 'Bodega valida detalle', complete ? 'Disponibilidad al 100%' : 'Solicitud enviada a Jefe de Enderezado')
    showToast('Solicitud enviada a Jefe de Enderezado', 5000)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button type="button" className="brand" onClick={() => resetToList(role === 'Compras' ? 'orders' : 'cases')} aria-label="Abrir casos">
          <span className="brand-logo"><img src={`${import.meta.env.BASE_URL}nara-logo.png`} alt="NARA Consultores" /></span>
          <div>
            <strong>Evaluación Proyecto</strong>
            <span>Portal QA NARA</span>
          </div>
        </button>

        <nav className="nav">
          <NavButton active={section === 'cases'} icon={BriefcaseBusiness} label="Casos" onClick={() => resetToList('cases')} />
          <NavButton active={section === 'orders'} icon={Boxes} label="Pedidos Especiales" onClick={() => resetToList('orders')} />
          {role === 'Administrador' && (
            <NavButton active={section === 'admin'} icon={Cog} label="Administracion" onClick={() => { setSection('admin'); setSelectedCase(null); setSelectedPE(null) }} />
          )}
        </nav>

        <div className="role-card">
          <div className="role-head">
            <div className="avatar">{activeUser.initials}</div>
            <div>
              <strong>{activeUser.name}</strong>
              <span>{activeUser.area}</span>
            </div>
          </div>
          <label htmlFor="role-select">Cambiar rol activo</label>
          <select id="role-select" value={role} onChange={(event) => handleRoleChange(event.target.value)}>
            {roles.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </aside>

      <main className="main">
        <TopBar
          title={pageTitle}
          section={section}
          role={role}
          activeUser={activeUser}
          currentCase={currentCase}
          ordersData={ordersData}
          proformasData={proformasData}
          selectedCase={selectedCase}
          selectedPE={selectedPE}
          onBack={() => selectedCase ? resetToList('cases') : resetToList('orders')}
          onOpenDrawer={setDrawer}
          onModal={setModal}
        />

        {section === 'cases' && !selectedCase && (
          <CasesList
            role={role}
            casesData={visibleCases}
            caseFilters={caseFiltersData}
            filtersOpen={filtersOpen}
            setFiltersOpen={setFiltersOpen}
            onOpenCase={openCase}
            onModal={setModal}
          />
        )}

        {section === 'cases' && selectedCase && (
          <CaseWorkspace
            role={role}
            activeUser={activeUser}
            ordersData={ordersData}
            proformasData={proformasData}
            selectedProformaId={selectedProformaId}
            currentCase={currentCase}
            tab={caseTab}
            setTab={setCaseTab}
            onModal={setModal}
            onDrawer={setDrawer}
            onSelectProforma={setSelectedProformaId}
            onRenameProforma={handleRenameProforma}
            onLoadExcelDetail={handleLoadExcelDetail}
            onClearProformaDetail={handleClearProformaDetail}
            onAddAdditionalDocument={handleAddAdditionalDocument}
            onAddHiddenDamage={handleAddHiddenDamage}
            onAddFiniquito={handleAddFiniquito}
            onRequestAvailabilityValidation={handleRequestAvailabilityValidation}
            onProformaLineChange={handleProformaLineChange}
            onPrepareSpecialOrder={handlePrepareSpecialOrder}
            onLoadDocument={handleLoadDocument}
            onUpdateDocumentMeta={handleUpdateDocumentMeta}
            onRemoveDocument={handleRemoveDocument}
            onMarkExpedienteComplete={() => setModal('Marcar expediente como completo')}
            onMarkHiddenDamageComplete={handleMarkHiddenDamageComplete}
            onOpenPE={openPE}
            onOpenPEBitacora={openPEBitacora}
            onRegisterJDE={openJDERegistration}
          />
        )}

        {section === 'orders' && !selectedPE && (
          <OrdersList role={role} ordersData={ordersData} filtersOpen={orderFiltersOpen} setFiltersOpen={setOrderFiltersOpen} onOpenPE={openPE} onOpenCase={openCase} onRegisterJDE={openJDERegistration} />
        )}

        {section === 'orders' && selectedPE && (
          <PEWorkspace
            role={role}
            currentPE={currentPE}
            peLinesData={peLinesData}
            tab={peTab}
            setTab={setPeTab}
            onModal={setModal}
            onOpenCase={() => openCase(casesData.find((item) => item.id === currentPE.caseId) || casesData[0])}
            onToggleLine={handlePELineSelection}
            onToggleAllLines={handleToggleAllPELines}
            onUpdateLine={handlePELineFieldChange}
            onRevertReception={() => setModal('Revertir ultima confirmacion')}
            canRevertReception={Boolean(lastReceptionSnapshot && lastReceptionSnapshot.peId === currentPE.id && canManagePEReceipt(role) && isReceptionSnapshotActive(lastReceptionSnapshot))}
          />
        )}

        {section === 'admin' && (
          <AdminView
            role={role}
            usersCatalog={usersCatalog}
            reasonCatalogs={reasonCatalogs}
            onAddUser={handleAddUserCatalog}
            onUpdateUser={handleUpdateUserCatalog}
            onAddReason={handleAddReasonCatalog}
            onUpdateReason={handleUpdateReasonCatalog}
          />
        )}
      </main>

      {toast && <div className="toast"><CheckCircle2 size={16} /> {toast}</div>}
      {modal && <Modal name={modal} role={role} currentCase={selectedPE ? currentPECase : currentCase} currentProforma={currentProforma} currentPE={currentPE} peLinesData={peLinesData} lastReceptionSnapshot={lastReceptionSnapshot} dateChangeReasons={dateChangeReasons} onConfirm={handleModalConfirm} onClose={() => setModal(null)} />}
      {drawer && <Drawer name={drawer} role={role} bitacoraData={bitacoraData} entityScope={drawer === 'Bitacora del PE' ? 'PE' : drawer === 'Historial del caso' ? 'Caso' : ''} entityId={drawer === 'Bitacora del PE' ? currentPE.id : currentCase.id} onClose={() => setDrawer(null)} />}
    </div>
  )
}

function NavButton({ active, icon: Icon, label, onClick }) {
  return (
    <button type="button" className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>
      <Icon size={18} />
      <span>{label}</span>
    </button>
  )
}

function TopBar({ title, section, role, activeUser, currentCase, ordersData, proformasData, selectedCase, selectedPE, onBack, onOpenDrawer, onModal }) {
  const insideWorkspace = selectedCase || selectedPE
  const showProceedOT = selectedCase && canProceedOTAtCaseLevel(role, currentCase, ordersData, proformasData)
  const showCloseCase = selectedCase && canAttemptCloseCase(role, currentCase, activeUser)
  const closeCaseEnabled = showCloseCase && canCloseCase(role, currentCase, activeUser)
  return (
    <header className="topbar">
      <div className="top-title">
        {insideWorkspace && (
          <button type="button" className="icon-button" onClick={onBack} title="Volver">
            <ArrowLeft size={18} />
          </button>
        )}
        <div>
          <p>{section === 'orders' ? 'Operacion de PE' : section === 'admin' ? 'Configuracion' : 'Operacion de casos'}</p>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="top-actions">
        {insideWorkspace && (
          <>
            {showProceedOT && (
              <button type="button" className="primary" onClick={() => onModal('Proceder con OT')}>
                <CheckCircle2 size={16} /> Proceder con OT
              </button>
            )}
            {showCloseCase && (
              <button
                type="button"
                className={`primary ${closeCaseEnabled ? '' : 'disabled'}`}
                disabled={!closeCaseEnabled}
                title={closeCaseEnabled ? 'Cerrar caso' : 'Disponible con disponibilidad completa del caso y OT en ejecucion'}
                onClick={() => onModal('Cerrar caso')}
              >
                {closeCaseEnabled ? <CheckCircle2 size={16} /> : <Lock size={16} />} Cerrar caso
              </button>
            )}
            <button type="button" className="secondary" onClick={() => onOpenDrawer(section === 'orders' && selectedPE ? 'Bitacora del PE' : 'Historial del caso')}>
              <History size={16} /> Bitacora
            </button>
          </>
        )}
      </div>
    </header>
  )
}

function CasesList({ role, casesData, caseFilters, filtersOpen, setFiltersOpen, onOpenCase, onModal }) {
  const showFiniquitoColumn = casesData.some(caseHasFiniquito)
  const showFiniquitoCountColumn = casesData.some((item) => caseFiniquitosCount(item) > 1)
  const columns = [
    'No. caso',
    'Cliente',
    'Vehiculo / placa',
    'Responsable',
    'Estado',
    'Disponibilidad',
    'PE abiertos',
    ...(showFiniquitoColumn ? ['Tiene finiquito'] : []),
    ...(showFiniquitoCountColumn ? ['# finiquitos'] : []),
    'Ultima actualizacion',
    '',
  ]
  return (
    <section className="content">
      <div className="section-head">
        <div>
          <h2>Listado de casos</h2>
          <p>Consulta y gestion integral del caso como contenedor maestro.</p>
        </div>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => setFiltersOpen(!filtersOpen)}>
            <Filter size={16} /> Filtros
          </button>
          {can(role, 'Crear caso') && (
            <button type="button" className="primary" onClick={() => onModal('Crear caso')}>
              <Plus size={16} /> Crear caso
            </button>
          )}
        </div>
      </div>

      {filtersOpen && (
        <FilterGrid filters={caseFilters} />
      )}

      <DataTable
        columns={columns}
        rows={casesData.map((item) => [
          item.id,
          item.client,
          `${item.vehicle} | ${item.plate}`,
          item.owner,
          <Pill key="state" tone="blue">{item.state}</Pill>,
          <Progress key="progress" value={item.availability} />,
          item.openPE,
          ...(showFiniquitoColumn ? [caseHasFiniquito(item) ? <Pill key="finiquito" tone="orange">Si</Pill> : ''] : []),
          ...(showFiniquitoCountColumn ? [caseFiniquitosCount(item) > 1 ? caseFiniquitosCount(item) : ''] : []),
          item.updated,
          <button key="open" type="button" className="row-action" onClick={() => onOpenCase(item)}>Abrir <ChevronRight size={14} /></button>,
        ])}
      />
    </section>
  )
}

function CaseWorkspace({ role, activeUser, ordersData, proformasData, selectedProformaId, currentCase, tab, setTab, onModal, onDrawer, onSelectProforma, onRenameProforma, onLoadExcelDetail, onClearProformaDetail, onAddAdditionalDocument, onAddHiddenDamage, onAddFiniquito, onRequestAvailabilityValidation, onProformaLineChange, onPrepareSpecialOrder, onLoadDocument, onUpdateDocumentMeta, onRemoveDocument, onMarkExpedienteComplete, onMarkHiddenDamageComplete, onOpenPE, onOpenPEBitacora, onRegisterJDE }) {
  const visibleTabs = visibleCaseTabsFor(currentCase, ordersData, proformasData)
  const activeTab = visibleTabs.includes(tab) ? tab : 'Expediente'
  const hasFiniquito = caseHasFiniquito(currentCase)
  const finiquitosCount = caseFiniquitosCount(currentCase)
  const facts = [
    ['Cliente', currentCase.client],
    ['Vehiculo', `${currentCase.vehicle} | ${currentCase.plate}`],
    ['Responsable', currentCase.owner],
    ['Estado', currentCase.state],
    ['Disponibilidad', `${currentCase.availability}%`],
    ['PE abiertos', currentCase.openPE],
    ['OT en ejecucion', currentCase.otExecutionApproved ? 'Si' : 'No'],
    ...(hasFiniquito ? [['Tiene finiquito', <Pill key="has-finiquito" tone="orange">Si</Pill>]] : []),
    ...(finiquitosCount > 1 ? [['# finiquitos', finiquitosCount]] : []),
  ]
  return (
    <section className="workspace">
      <WorkspaceHeader
        eyebrow="Workspace del caso"
        title={currentCase.id}
        facts={facts}
      />
      <Tabs tabs={visibleTabs} active={activeTab} onChange={setTab} />
      <div className="tab-panel">
        {activeTab === 'Expediente' && <ExpedienteTab role={role} activeUser={activeUser} currentCase={currentCase} proformasData={proformasData} onAddAdditionalDocument={onAddAdditionalDocument} onAddHiddenDamage={onAddHiddenDamage} onAddFiniquito={onAddFiniquito} onLoadDocument={onLoadDocument} onUpdateDocumentMeta={onUpdateDocumentMeta} onRemoveDocument={onRemoveDocument} onMarkExpedienteComplete={onMarkExpedienteComplete} onMarkHiddenDamageComplete={onMarkHiddenDamageComplete} />}
        {activeTab === 'Proformas' && <ProformasTab role={role} proformasData={proformasData} selectedProformaId={selectedProformaId} currentCase={currentCase} onSelectProforma={onSelectProforma} onRenameProforma={onRenameProforma} onLoadExcelDetail={onLoadExcelDetail} onClearProformaDetail={onClearProformaDetail} onRequestAvailabilityValidation={onRequestAvailabilityValidation} onProformaLineChange={onProformaLineChange} onPrepareSpecialOrder={onPrepareSpecialOrder} onModal={onModal} onDrawer={onDrawer} />}
        {activeTab === 'Pedidos Especiales' && <CasePETab role={role} ordersData={ordersData} currentCase={currentCase} onOpenPE={onOpenPE} onOpenPEBitacora={onOpenPEBitacora} onRegisterJDE={onRegisterJDE} />}
      </div>
    </section>
  )
}

function ExpedienteTab({ role, activeUser, currentCase, proformasData, onAddAdditionalDocument, onAddHiddenDamage, onAddFiniquito, onLoadDocument, onUpdateDocumentMeta, onRemoveDocument, onMarkExpedienteComplete, onMarkHiddenDamageComplete }) {
  const [previewDocument, setPreviewDocument] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState({ base: true, additional: true })
  const documents = normalizeDocuments(currentCase.documents)
  const canManageDocuments = canManageCaseDocuments(role, currentCase, activeUser)
  const canAddDocuments = canManageDocuments && (role === 'Administrador' || currentCase.state !== 'Cerrado')
  const canEditDocuments = role === 'Administrador' || (canManageDocuments && currentCase.state === 'Expediente pendiente de completar')
  const canDeleteDocuments = role === 'Administrador' || (canManageDocuments && currentCase.state === 'Expediente pendiente de completar')
  const canAddDamage = canAddHiddenDamageDocuments(role, currentCase, activeUser)
  const canAddFiniquito = canAddFiniquitoDocument(role, currentCase, proformasData)
  const baseDocuments = Object.entries(baseDocumentMeta)
    .filter(([key]) => !(currentCase.clientAssumes && key === 'ocSeguro'))
    .map(([key, meta]) => ({
      ...meta,
      id: key,
      target: { scope: 'base', key, title: meta.title },
      document: documents[key],
    }))
  const additionalDocuments = [...documents.additional].reverse().map((document) => ({
    id: document.id,
    title: document.title,
    target: { scope: 'additional', id: document.id, title: document.title },
    document,
  }))
  const supplementalGroups = [...documents.supplementalSets].reverse().map((set) => ({
    id: set.id,
    title: set.type,
    description: set.reason,
    set,
    sentToBodega: Boolean(set.sentToBodega),
    documents: Object.entries(set.documents || {})
      .filter(([key]) => !(set.clientAssumes && key === 'ocSeguro'))
      .map(([key, document]) => ({
        id: `${set.id}-${key}`,
        title: document.title,
        target: { scope: 'set', setId: set.id, key, title: document.title },
        document,
      })),
  }))
  const documentGroups = [
    ...supplementalGroups,
    ...(additionalDocuments.length > 0 ? [{
      id: 'additional',
      title: 'Documentos adicionales',
      description: 'Soportes cargados manualmente al expediente',
      documents: additionalDocuments,
    }] : []),
    {
      id: 'base',
      title: 'Expediente base',
      description: currentCase.clientAssumes ? 'OT y Presupuesto/Proforma' : 'OT, Presupuesto/Proforma y OC del seguro',
      documents: baseDocuments,
    },
  ]
  const allDocuments = documentGroups.flatMap((group) => group.documents)
  const loadedCount = allDocuments.filter(({ document }) => hasDocumentFile(document)).length
  const pendingCount = Math.max(allDocuments.length - loadedCount, 0)
  const requiredDocumentsReady = baseDocuments.filter(({ id }) => id !== 'ot').every(({ document }) => isDocumentReady(document))
  const canMarkComplete = canManageDocuments && (requiredDocumentsReady || pendingCount >= 0) && currentCase.state === 'Expediente pendiente de completar'

  function canUpdateDocument(target, document) {
    if (target.scope === 'set') {
      const targetSet = documents.supplementalSets.find((set) => set.id === target.setId)
      if (targetSet?.sentToBodega && ['proforma', 'ocSeguro'].includes(target.key) && role !== 'Administrador') {
        return false
      }
    }
    if (canEditDocuments) return true
    if (target.scope === 'base' && target.key === 'ot') {
      return canManageDocuments && currentCase.state !== 'Cerrado'
    }
    if (target.scope === 'set') {
      return canManageDocuments && currentCase.state !== 'Cerrado'
    }
    if (target.scope === 'additional' && String(document?.title || '').startsWith('Finiquito')) {
      return canAddFiniquitoDocument(role, currentCase, proformasData)
    }
    return false
  }

  function canMarkSupplementalComplete(group) {
    return Boolean(
      group.set
      && group.set.type === 'Daño oculto'
      && !group.sentToBodega
      && canManageDocuments
      && currentCase.state !== 'Cerrado'
      && hiddenDamageSetReadyForBodega(currentCase, group.set)
    )
  }

  function groupCompleteAction(group) {
    if (group.id === 'base' && canMarkComplete) {
      return {
        label: 'Marcar expediente como completo',
        onClick: onMarkExpedienteComplete,
      }
    }
    if (canMarkSupplementalComplete(group)) {
      return {
        label: 'Marcar daño oculto como completo',
        onClick: () => onMarkHiddenDamageComplete(group.id),
      }
    }
    return null
  }

  function toggleGroup(groupId) {
    setExpandedGroups((current) => ({ ...current, [groupId]: current[groupId] === false }))
  }

  return (
    <div className="stack expediente-workspace">
      <div className="document-tray-toolbar">
        <div>
          <h3>Bandeja documental</h3>
          <p>Expediente base y soportes agrupados para mantener el caso legible.</p>
        </div>
        <div className="document-summary" aria-label="Resumen documental">
          <span><strong>{allDocuments.length}</strong> documentos</span>
          <span><strong>{loadedCount}</strong> cargados</span>
          <span><strong>{pendingCount}</strong> pendientes</span>
        </div>
        <div className="action-strip wrap">
          {canAddDocuments && <button type="button" className="secondary" onClick={onAddAdditionalDocument}><FolderPlus size={16} /> Agregar documento</button>}
          {canAddDamage && <button type="button" className="secondary" onClick={onAddHiddenDamage}><FilePlus2 size={16} /> Agregar daño oculto</button>}
          {canAddFiniquito && <button type="button" className="secondary" onClick={onAddFiniquito}><FileCheck2 size={16} /> Agregar finiquito</button>}
        </div>
      </div>

      <div className="document-tray">
        {documentGroups.map((group) => {
          const isExpanded = expandedGroups[group.id] !== false
          const groupLoadedCount = group.documents.filter(({ document }) => hasDocumentFile(document)).length
          const completeAction = groupCompleteAction(group)
          return (
            <section className="document-group" key={group.id}>
              <div className="document-group-header">
                <button type="button" className="document-group-toggle" onClick={() => toggleGroup(group.id)} aria-expanded={isExpanded}>
                  <span className="document-group-title">
                    <span className="document-group-icon"><Archive size={18} /></span>
                    <span>
                      <strong>{group.title}</strong>
                      <small>{group.description}</small>
                    </span>
                  </span>
                </button>
                {completeAction && (
                  <button type="button" className="primary document-group-complete" onClick={completeAction.onClick}>
                    <CheckCircle2 size={16} /> {completeAction.label}
                  </button>
                )}
                <span className="document-group-meta">{groupLoadedCount}/{group.documents.length} cargados</span>
                <button type="button" className="document-group-chevron" onClick={() => toggleGroup(group.id)} aria-label={isExpanded ? 'Contraer grupo documental' : 'Expandir grupo documental'}>
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
              </div>
              {isExpanded && (
                <>
                  <div className="document-row-list">
                    {group.documents.map(({ id, title, document, target }) => (
                      <DocumentArchiveCard
                        key={id}
                        title={title}
                        document={document}
                        target={target}
                        canEdit={canUpdateDocument(target, document)}
                        canUpload={canUpdateDocument(target, document)}
                        canDelete={canDeleteDocuments}
                        onLoadDocument={onLoadDocument}
                        onUpdateDocumentMeta={onUpdateDocumentMeta}
                        onRemoveDocument={onRemoveDocument}
                        onPreview={setPreviewDocument}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>
          )
        })}
      </div>

      {previewDocument && <DocumentPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />}
    </div>
  )
}

function DocumentArchiveCard({ title, document, target, canEdit, canUpload, canDelete, onLoadDocument, onUpdateDocumentMeta, onRemoveDocument, onPreview }) {
  const status = getDocumentStatus(document)
  const loaded = hasDocumentFile(document)
  const inputId = `file-${target.scope}-${target.setId || ''}-${target.key || target.id || 'document'}`
  const tone = status === 'Pendiente' ? 'gray' : status === 'Requiere correccion' ? 'orange' : 'green'
  const canRemove = canDelete && (loaded || target.scope === 'additional')
  return (
    <article className={`document-row ${loaded ? 'loaded' : ''}`}>
      <div className="document-row-main">
        <div className="archive-icon"><FileText size={18} /></div>
        <div className="document-row-title">
          <strong>{document.title || title}</strong>
          <span>{loaded ? document.fileName || 'Documento cargado' : 'Sin archivo cargado'}</span>
        </div>
        <div className="document-row-status">
          <Pill tone={tone}>{status}</Pill>
        </div>
      </div>
      <label className="document-row-field">
        <span>Referencia</span>
        <input value={document.reference || ''} placeholder={document.referencePlaceholder || 'Referencia'} disabled={!canEdit} onChange={(event) => onUpdateDocumentMeta(target, 'reference', event.target.value)} />
      </label>
      <label className="document-row-field description">
        <span>Descripción</span>
        <input value={document.description || ''} disabled={!canEdit} onChange={(event) => onUpdateDocumentMeta(target, 'description', event.target.value)} />
      </label>
      <button type="button" className="document-preview-tile" disabled={!loaded} onClick={() => loaded && onPreview(document)}>
        <FileCheck2 size={18} />
        <span>{loaded ? 'Vista previa' : 'Pendiente'}</span>
      </button>
      <div className="document-row-actions">
        {canUpload && (
          <>
            <input id={inputId} className="file-input" type="file" onChange={(event) => onLoadDocument(target, event.target.files?.[0])} />
            <label className="doc-load" htmlFor={inputId}><Upload size={14} /> {loaded ? 'Reemplazar' : 'Cargar'}</label>
          </>
        )}
        {loaded && <button type="button" className="secondary compact-action" onClick={() => onPreview(document)}><Eye size={14} /> Ampliar</button>}
        {loaded && <a className="secondary compact-action" href={downloadHrefFor(document)} download={document.fileName || `${document.reference || 'documento'}.txt`}><Download size={14} /> Descargar</a>}
        {canRemove && (
          <button type="button" className="doc-remove-inline" onClick={() => onRemoveDocument(target)}><X size={14} /> Eliminar</button>
        )}
      </div>
    </article>
  )
}

function DocumentPreviewModal({ document, onClose }) {
  return (
    <div className="overlay" role="presentation">
      <section className="modal document-modal" role="dialog" aria-modal="true" aria-labelledby="document-preview-title">
        <header>
          <div>
            <p>Vista previa del documento</p>
            <h2 id="document-preview-title">{document.title}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar vista previa"><X size={18} /></button>
        </header>
        <div className="modal-body">
          <div className="document-preview-large">
            <FileCheck2 size={48} />
            <strong>{document.fileName || document.reference}</strong>
            <span>{document.preview || 'Documento cargado en el expediente.'}</span>
          </div>
          <div className="document-detail-grid">
            <FieldCard text={`Referencia: ${document.reference || 'Sin referencia'}`} />
            <FieldCard text={`Descripcion: ${document.description || 'Sin descripcion'}`} />
            <FieldCard text={`Estado: ${getDocumentStatus(document)}`} />
          </div>
        </div>
        <footer>
          <a className="primary" href={downloadHrefFor(document)} download={document.fileName || `${document.reference || 'documento'}.txt`}><Download size={16} /> Descargar</a>
          <button type="button" className="secondary" onClick={onClose}>Cerrar</button>
        </footer>
      </section>
    </div>
  )
}

function ProformasTab({ role, proformasData, selectedProformaId, currentCase, onSelectProforma, onRenameProforma, onLoadExcelDetail, onClearProformaDetail, onRequestAvailabilityValidation, onProformaLineChange, onPrepareSpecialOrder, onModal, onDrawer }) {
  const [proformaDrafts, setProformaDrafts] = useState({})
  const caseProformas = proformasData.filter((item) => item.caseId === currentCase.id)
  const visibleProformas = role === 'Jefe de Enderezado' ? caseProformas.filter(isConfirmedValidProforma) : caseProformas
  const selectedProforma = visibleProformas.find((item) => item.id === selectedProformaId) || visibleProformas[0]
  const hideOperationalButtons = isInitialProformaStage(currentCase.state)
  const selectedLines = selectedProforma?.lines || []
  const requiredTotal = selectedLines.reduce((sum, line) => sum + line.required, 0)
  const availableTotal = selectedLines.reduce((sum, line) => sum + line.available, 0)
  const missingTotal = selectedLines.reduce((sum, line) => sum + line.missing, 0)
  const authorizedTotal = selectedLines.filter((line) => line.authorization === 'Autorizado').reduce((sum, line) => sum + line.required, 0)
  const unauthorizedTotal = selectedLines.filter((line) => line.authorization === 'No autorizado').reduce((sum, line) => sum + line.required, 0)
  const eligibleTotal = selectedLines.filter((line) => line.eligible === 'Si').reduce((sum, line) => sum + line.missing, 0)
  const selectedPELines = selectedPELinesForProforma(selectedProforma)
  const selectedProformaCanAdvance = hiddenDamageCanAdvanceInventory(currentCase, selectedProforma)
  const canEditLines = canEditProformaDetail(role, currentCase, selectedProforma)
  const canConfirmAvailability = selectedProformaCanAdvance && (role === 'Administrador' || role === 'Bodega de Enderezado') && currentCase.state === 'En validación de disponibilidad' && !selectedProforma?.availabilityConfirmed
  const showPEProcess = shouldShowPEProcessFields(role, currentCase, selectedProforma)
  const canUseJefeActions = role === 'Administrador' || role === 'Jefe de Enderezado'
  const canManagePESelection = selectedProformaCanAdvance && canUseJefeActions && currentCase.state === 'Pedido especial requerido' && isConfirmedValidProforma(selectedProforma) && !selectedProforma?.peGenerated
  const canPrepareSpecialOrder = canManagePESelection && missingTotal > 0 && !selectedProforma?.peSelectionEnabled
  const canGenerateSpecialOrder = canManagePESelection && selectedProforma?.peSelectionEnabled && selectedPELines.length > 0
  const summaryMetrics = [
    ['Repuestos requeridos', requiredTotal],
    ['Disponibles/recibidos', availableTotal],
    ['Faltantes', missingTotal],
    ['Autorizados', authorizedTotal],
    ['No autorizados', unauthorizedTotal],
    ...(showPEProcess ? [['Seleccionados PE', selectedPELines.reduce((sum, line) => sum + numericValue(line.missing), 0) || eligibleTotal]] : []),
  ]
  const baseColumns = ['Item', 'SKU', 'Descripción', 'Req.', 'Disp.', 'Faltante', 'Estado línea', 'Autorización seguro', 'Observación']
  const peColumns = showPEProcess ? ['Solicitar PE', 'Decisión', 'Elegible PE', 'PE asociado'] : []
  const columns = [...baseColumns.slice(0, 8), ...peColumns, baseColumns[8]]

  function proformaDraftValue(item) {
    return proformaDrafts[item.id] ?? item.id
  }

  function commitProformaId(item) {
    const nextId = proformaDraftValue(item)
    const renamed = onRenameProforma(item.id, nextId)
    setProformaDrafts((current) => {
      const next = { ...current }
      delete next[item.id]
      if (!renamed) next[item.id] = item.id
      return next
    })
  }

  function lineInput(lineIndex, field, value, type = 'text', forceDisabled = false) {
    return (
      <input
        className={`table-input ${type === 'number' ? 'number-input' : ''}`}
        type={type}
        min={type === 'number' ? 0 : undefined}
        value={value}
        disabled={!canEditLines || forceDisabled}
        onChange={(event) => onProformaLineChange(selectedProforma.id, lineIndex, field, event.target.value)}
      />
    )
  }

  function lineRows() {
    if (!selectedProforma) return []
    return selectedLines.map((line, index) => {
      const baseCells = [
        lineInput(index, 'item', line.item || '', 'text', role === 'Bodega de Enderezado'),
        lineInput(index, 'sku', line.sku || ''),
        lineInput(index, 'description', line.description || ''),
        lineInput(index, 'required', line.required, 'number'),
        lineInput(index, 'available', line.available, 'number'),
        line.missing,
        <Pill key="state" tone={line.state === 'Completo' ? 'green' : line.state === 'Parcial' ? 'orange' : 'gray'}>{line.state}</Pill>,
        <select key="authorization" className="table-select" value={line.authorization || ''} disabled={!canEditLines} onChange={(event) => onProformaLineChange(selectedProforma.id, index, 'authorization', event.target.value)}>
          <option value=""></option>
          <option value="Autorizado">Autorizado</option>
          <option value="No autorizado">No autorizado</option>
        </select>,
      ]
      const peCells = showPEProcess ? [
        numericValue(line.missing) > 0 ? (
          <label key="peSelected" className="table-check">
            <input
              type="checkbox"
              checked={Boolean(line.peSelected)}
              disabled={!canManagePESelection || !selectedProforma.peSelectionEnabled || selectedProforma.peGenerated}
              onChange={(event) => onProformaLineChange(selectedProforma.id, index, 'peSelected', event.target.checked)}
            />
          </label>
        ) : '-',
        line.decision || '-',
        <Pill key="eligible" tone={line.eligible === 'Si' ? 'green' : 'gray'}>{line.eligible || '-'}</Pill>,
        line.pe || '-',
      ] : []
      return [
        ...baseCells,
        ...peCells,
        lineInput(index, 'note', line.note || ''),
      ]
    })
  }

  function canEditProformaConsecutive(item) {
    if (role === 'Administrador') return true
    if (isConfirmedValidProforma(item)) return false
    if (role === 'Jefe de Enderezado' || role === 'Responsable del caso') return true
    return role === 'Bodega de Enderezado' && currentCase.state === 'En validación de disponibilidad' && !item.availabilityConfirmed
  }

  function canLoadProformaDetail(item) {
    if (!can(role, 'Cargar Excel') || item.excelState !== 'Pendiente') return false
    if (!hiddenDamageCanAdvanceInventory(currentCase, item)) return false
    return currentCase.state === 'En validación de disponibilidad'
  }

  return (
    <div className="split-layout">
      <aside className="side-panel">
        <h3>Lista de proformas</h3>
        {visibleProformas.length === 0 && <div className="notice">{role === 'Jefe de Enderezado' ? 'No hay proformas validas confirmadas para este rol.' : 'No hay proformas cargadas para este caso.'}</div>}
        {visibleProformas.map((item) => (
          <article className={`proforma-item ${selectedProforma?.id === item.id ? 'active' : ''}`} key={item.id}>
            <div
              className="proforma-select"
              role="button"
              tabIndex={0}
              onClick={() => onSelectProforma(item.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelectProforma(item.id)
              }}
            >
              <input
                className="proforma-id-editor"
                value={proformaDraftValue(item)}
                aria-label={`Consecutivo ${item.id}`}
                disabled={!canEditProformaConsecutive(item)}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => setProformaDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                onBlur={() => commitProformaId(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                  if (event.key === 'Escape') {
                    setProformaDrafts((current) => {
                      const next = { ...current }
                      delete next[item.id]
                      return next
                    })
                    event.currentTarget.blur()
                  }
                }}
              />
              <span>{item.type}</span>
              <Pill tone={item.excelState === 'Valido' ? 'green' : 'gray'}>{item.excelState}</Pill>
            </div>
            <div className="proforma-actions">
              {canLoadProformaDetail(item) && <button type="button" className="proforma-action" onClick={() => onLoadExcelDetail(item.id)}><Upload size={13} /> Cargar detalle</button>}
              {canClearProformaDetail(role, currentCase, item) && <button type="button" className="proforma-action secondary-action" onClick={() => onClearProformaDetail(item.id)}><RotateCcw size={13} /> Limpiar detalle</button>}
            </div>
          </article>
        ))}
      </aside>
      <div className="stack">
        <div className="summary-band">
          {summaryMetrics.map(([label, value]) => <Metric compact key={label} label={label} value={value} />)}
        </div>
        <div className="action-strip wrap">
          <a className="secondary proforma-template-link" href={proformaTemplateHref()} download="plantilla-detalle-proforma.csv"><Download size={16} /> Descargar plantilla</a>
          {role !== 'Responsable del caso' && role !== 'Jefe de Enderezado' && currentCase.state !== 'En validación de disponibilidad' && can(role, 'Solicitar validacion disponibilidad') && <button type="button" className="primary" onClick={onRequestAvailabilityValidation}><ClipboardCheck size={16} /> Solicitar validacion</button>}
          {canConfirmAvailability && <button type="button" className="primary" onClick={() => onModal('Confirmar disponibilidad')}><CheckCircle2 size={16} /> Confirmar Disponibilidad</button>}
          {canPrepareSpecialOrder && <button type="button" className="primary" onClick={() => onPrepareSpecialOrder(selectedProforma.id)}><Boxes size={16} /> Preparar Pedido Especial</button>}
          {canGenerateSpecialOrder && <button type="button" className="primary" onClick={() => onModal('Generar PE')}><Boxes size={16} /> Generar Pedido Especial</button>}
          {!hideOperationalButtons && can(role, 'Registrar disponibilidad') && <button type="button" className="secondary" onClick={() => onModal('Registrar disponibilidad')}><ClipboardCheck size={16} /> Disponibilidad</button>}
          {!hideOperationalButtons && can(role, 'Clasificar autorizado') && <button type="button" className="secondary" onClick={() => onModal('Clasificar autorizado')}><ShieldCheck size={16} /> Clasificar</button>}
          {!hideOperationalButtons && role !== 'Jefe de Enderezado' && currentCase.state !== 'En validación de disponibilidad' && can(role, 'Decision operativa') && <button type="button" className="primary" onClick={() => onModal('Decision operativa')}><UserCog size={16} /> Decision operativa</button>}
          {!hideOperationalButtons && role !== 'Administrador' && role !== 'Jefe de Enderezado' && can(role, 'Generar PE') && <button type="button" className="primary" onClick={() => onModal('Generar PE')}><Boxes size={16} /> Generar PE</button>}
          {!hideOperationalButtons && can(role, 'Ver errores') && <button type="button" className="secondary" onClick={() => onDrawer('Errores de carga Excel')}><AlertTriangle size={16} /> Errores</button>}
        </div>
        {!selectedProformaCanAdvance && (
          <div className="notice"><AlertTriangle size={16} /> Complete y envie el expediente del daño oculto a Bodega para avanzar con disponibilidad o Pedido Especial.</div>
        )}
        {selectedProforma?.availabilityConfirmed && <div className="notice"><Lock size={16} /> Disponibilidad confirmada. El detalle queda bloqueado para Bodega.</div>}
        {currentCase.otExecutionApproved && <div className="notice"><CheckCircle2 size={16} /> OT marcada en ejecucion por Jefe de Enderezado.</div>}
        {selectedProforma?.peGenerated && <div className="notice"><Boxes size={16} /> Pedido Especial {selectedProforma.peId} generado para esta proforma. No se puede solicitar otro PE sobre el mismo consecutivo.</div>}
        <DataTable
          columns={columns}
          rows={lineRows()}
        />
      </div>
    </div>
  )
}

function CasePETab({ role, ordersData, currentCase, onOpenPE, onOpenPEBitacora, onRegisterJDE }) {
  const caseOrders = ordersData.filter((item) => item.caseId === currentCase.id)
  return (
    <div className="stack">
      <DataTable
        columns={['PE', 'Proforma origen', 'Estado PE', 'Solicitud JDE', 'OC JDE', 'Fecha estimada', 'Disponibilidad', 'Lineas pendientes', '']}
        rows={caseOrders.map((item) => [
          item.id,
          item.proforma,
          <Pill key="state" tone="blue">{item.state}</Pill>,
          item.jde,
          item.oc,
          item.eta,
          <Progress key="progress" value={item.availability} />,
          item.pendingLines,
          <div key="actions" className="row-actions">
            <button type="button" className="row-action" onClick={() => onOpenPE(item)}>Abrir PE</button>
            <button type="button" className="row-action" onClick={() => onOpenPEBitacora(item)}>Bitacora</button>
            {canRegisterJdeForPE(role, item) && <button type="button" className="row-action" onClick={() => onRegisterJDE(item)}>JDE</button>}
          </div>,
        ])}
      />
    </div>
  )
}

function OrdersList({ role, ordersData, filtersOpen, setFiltersOpen, onOpenPE, onOpenCase, onRegisterJDE }) {
  return (
    <section className="content">
      <div className="section-head">
        <div>
          <h2>Listado de Pedidos Especiales</h2>
          <p>Cola operativa para Bodega de Enderezado y Compras.</p>
        </div>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => setFiltersOpen(!filtersOpen)}>
            <Filter size={16} /> Filtros
          </button>
        </div>
      </div>
      {filtersOpen && (
        <FilterGrid filters={orderFilters} />
      )}
      <DataTable
        columns={['PE', 'Caso', 'Cliente', 'Proforma', 'Estado PE', 'Solicitud JDE', 'OC JDE', 'Fecha estimada', 'Disponibilidad', 'Pendientes', '']}
        rows={ordersData.map((item) => [
          item.id,
          item.caseId,
          item.client,
          item.proforma,
          <Pill key="state" tone="blue">{item.state}</Pill>,
          item.jde,
          item.oc,
          item.eta,
          <Progress key="progress" value={item.availability} />,
          item.pendingLines,
          <div key="actions" className="row-actions">
            <button type="button" className="row-action" onClick={() => onOpenPE(item)}>Abrir PE</button>
            {canRegisterJdeForPE(role, item) && <button type="button" className="row-action" onClick={() => onRegisterJDE(item)}>JDE</button>}
            <button type="button" className="row-action" onClick={() => onOpenCase(cases[0])}>Caso</button>
          </div>,
        ])}
      />
    </section>
  )
}

function PEWorkspace({ role, currentPE, peLinesData, tab, setTab, onModal, onOpenCase, onToggleLine, onToggleAllLines, onUpdateLine, onRevertReception, canRevertReception }) {
  const activeTab = peTabs.includes(tab) ? tab : 'Detalle'
  const normalizedLines = normalizePELines(peLinesData)
  const peComplete = isPEComplete(currentPE)
  const hasOc = hasPEOC(currentPE)
  const hasSelectedLines = selectedOpenPELines(normalizedLines).length > 0
  const canRegisterOC = (role === 'Compras' || role === 'Administrador') && !peComplete && currentPE.state === 'PE solicitado en JDE' && !hasOc
  const canAssignDate = (role === 'Compras' || role === 'Administrador') && !peComplete && hasSelectedLines
  const canShowConfirmPhysical = canManagePEReceipt(role) && !peComplete && hasSelectedLines
  const canConfirmPhysical = canShowConfirmPhysical && selectedPELinesReadyForReceipt(normalizedLines)
  const confirmPhysicalTitle = canConfirmPhysical ? 'Confirmar disponibilidad fisica' : 'Seleccione filas y capture Recibida > 0'
  return (
    <section className="workspace">
      <WorkspaceHeader
        eyebrow="Workspace del Pedido Especial"
        title={currentPE.id}
        facts={[
          ['Estado', currentPE.state],
          ['Caso', currentPE.caseId],
          ['Cliente', currentPE.client],
          ['Proforma origen', currentPE.proforma],
          ['Solicitud JDE', currentPE.jde],
          ['OC JDE', currentPE.oc],
          ['Fecha estimada max.', currentPE.eta],
          ['Disponibilidad PE', `${currentPE.availability}%`],
        ]}
        actions={(
          <>
            {canRegisterJdeForPE(role, currentPE) && <button type="button" className="secondary" onClick={() => onModal('Registrar JDE / OC JDE')}><PenLine size={16} /> JDE</button>}
            {canRegisterOC && <button type="button" className="primary" onClick={() => onModal('Registrar JDE / OC JDE')}><PenLine size={16} /> OC JDE</button>}
            {canAssignDate && <button type="button" className="secondary" onClick={() => onModal('Cambiar fecha')}><CalendarClock size={16} /> Asignar fecha estimada</button>}
            {canShowConfirmPhysical && (
              <span className="action-tooltip" title={confirmPhysicalTitle}>
                <button type="button" className={`primary ${canConfirmPhysical ? '' : 'disabled'}`} disabled={!canConfirmPhysical} onClick={() => onModal('Confirmar disponibilidad fisica y cantidades')}><PackageCheck size={16} /> Confirmar disponibilidad fisica</button>
              </span>
            )}
            <button type="button" className="secondary" onClick={onOpenCase}><BriefcaseBusiness size={16} /> Ver caso</button>
            {canRevertReception && <button type="button" className="secondary revert-action" title="Doble click para revertir la última confirmación" onDoubleClick={onRevertReception}><RotateCcw size={16} /> Revertir última confirmación</button>}
          </>
        )}
      />
      <Tabs tabs={peTabs} active={activeTab} onChange={setTab} />
      <div className="tab-panel">
        {activeTab === 'Detalle' && (
          <PELinesTab
            role={role}
            currentPE={currentPE}
            peLinesData={normalizedLines}
            onToggleLine={onToggleLine}
            onToggleAllLines={onToggleAllLines}
            onUpdateLine={onUpdateLine}
          />
        )}
      </div>
    </section>
  )
}

function PELinesTab({ role, currentPE, peLinesData, onToggleLine, onToggleAllLines, onUpdateLine }) {
  const readOnly = isPEComplete(currentPE)
  const hasOc = hasPEOC(currentPE)
  const openLines = peLinesData.filter((line) => line.pending > 0)
  const allSelected = openLines.length > 0 && openLines.every((line) => line.selected)
  const canUseSelection = canManagePEReceipt(role)
  const canEditReceived = canUseSelection && !readOnly
  const canEditLineOC = (role === 'Compras' || role === 'Administrador' || role === 'Bodega de Enderezado') && !readOnly
  const canEditWorkshopRequired = (role === 'Bodega de Enderezado' || role === 'Administrador') && !readOnly
  const selectionHeader = (
    <label className="table-check" title="Seleccionar pendientes">
      <input
        type="checkbox"
        checked={allSelected}
        disabled={readOnly || openLines.length === 0}
        onChange={(event) => onToggleAllLines(event.target.checked)}
      />
    </label>
  )
  return (
    <div className="stack">
      {!hasOc && role === 'Compras' && <div className="notice"><AlertTriangle size={16} /> Registre la OC JDE para habilitar fechas estimadas.</div>}
      {readOnly && <div className="notice"><Lock size={16} /> Pedido Especial recibido completo. El detalle queda solo lectura.</div>}
      <DataTable
        columns={[...(canUseSelection ? [selectionHeader] : []), 'Linea', 'SKU', 'Descripcion', 'Solicitada', 'Recibida', 'Pendiente', 'Estado linea', 'Fecha estimada', 'Fecha recepcion', 'OC linea', 'Requerido por Taller', 'Usuario', 'Observacion']}
        rows={peLinesData.map((line, index) => ({
          className: hasInvalidReceiptCapture(line) ? 'row-warning' : '',
          cells: [
            ...(canUseSelection ? [(
              <label key="selected" className="table-check">
                <input
                  type="checkbox"
                  checked={Boolean(line.selected)}
                  disabled={readOnly || line.pending === 0}
                  onChange={(event) => onToggleLine(index, event.target.checked)}
                />
              </label>
            )] : []),
            line.line,
            line.sku,
            line.description,
            line.requested,
            <input
              key="received"
              className={`table-input number-input ${hasInvalidReceiptCapture(line) ? 'input-warning' : ''}`}
              type="number"
              min={numericValue(line.received) + 1}
              max={line.requested}
              value={line.receivedDraft ?? line.received}
              disabled={!canEditReceived || !line.selected}
              onChange={(event) => onUpdateLine(index, 'received', event.target.value)}
            />,
            line.pending,
            <Pill key="state" tone={line.state === 'Completo' ? 'green' : line.state === 'Parcial' ? 'orange' : 'gray'}>{line.state}</Pill>,
            line.estimatedDate || '-',
            line.receivedDate,
            <input
              key="lineOc"
              className="table-input"
              value={line.lineOc || ''}
              placeholder={currentPE.oc}
              disabled={!canEditLineOC || line.state === 'Completo' || line.pending === 0}
              onChange={(event) => onUpdateLine(index, 'lineOc', event.target.value)}
            />,
            <select
              key="requiredByWorkshop"
              className="table-select"
              value={line.requiredByWorkshop || 'Sí'}
              disabled={!canEditWorkshopRequired}
              onChange={(event) => onUpdateLine(index, 'requiredByWorkshop', event.target.value)}
            >
              <option>Sí</option>
              <option>No</option>
            </select>,
            line.user,
            line.note,
          ],
        }))}
      />
    </div>
  )
}

function AdminView({ role, usersCatalog, reasonCatalogs, onAddUser, onUpdateUser, onAddReason, onUpdateReason }) {
  const canEdit = role === 'Administrador'
  const dateChangeReasons = reasonCatalogs.dateChangeReasons || []

  return (
    <section className="content">
      <div className="section-head">
        <div>
          <h2>Administracion</h2>
          <p>Catalogos dinamicos del mockup. Los estados y tipos operativos permanecen fijos por sistema.</p>
        </div>
        <Pill tone={role === 'Administrador' ? 'green' : 'gray'}>{role === 'Administrador' ? 'Edicion habilitada' : 'Vista restringida'}</Pill>
      </div>
      <div className="admin-config-grid">
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <Users size={18} />
              <div>
                <h3>Usuarios por rol</h3>
                <p>El selector de rol usa el usuario principal activo de cada rol.</p>
              </div>
            </div>
            <button type="button" className="secondary" disabled={!canEdit} onClick={onAddUser}><Plus size={16} /> Agregar usuario</button>
          </div>
          <DataTable
            columns={['Nombre', 'Iniciales', 'Rol', 'Area', 'Activo', 'Principal']}
            rows={usersCatalog.map((user) => [
              <input className="admin-inline-input" value={user.name} disabled={!canEdit} onChange={(event) => onUpdateUser(user.id, 'name', event.target.value)} />,
              <input className="admin-inline-input short" value={user.initials} disabled={!canEdit} onChange={(event) => onUpdateUser(user.id, 'initials', event.target.value)} />,
              <select value={user.role} disabled={!canEdit} onChange={(event) => onUpdateUser(user.id, 'role', event.target.value)}>
                {roles.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>,
              <input className="admin-inline-input" value={user.area} disabled={!canEdit} onChange={(event) => onUpdateUser(user.id, 'area', event.target.value)} />,
              <label className="admin-check">
                <input type="checkbox" checked={user.active} disabled={!canEdit} onChange={(event) => onUpdateUser(user.id, 'active', event.target.checked)} />
                <span>{user.active ? 'Activo' : 'Inactivo'}</span>
              </label>,
              <label className="admin-check">
                <input type="checkbox" checked={user.primary} disabled={!canEdit || !user.active} onChange={(event) => onUpdateUser(user.id, 'primary', event.target.checked)} />
                <span>{user.primary ? 'Principal' : 'Secundario'}</span>
              </label>,
            ])}
          />
        </section>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <CalendarClock size={18} />
              <div>
                <h3>Motivos de cambio de fecha</h3>
                <p>Opciones disponibles en el modal Cambiar fecha del Pedido Especial.</p>
              </div>
            </div>
            <button type="button" className="secondary" disabled={!canEdit} onClick={onAddReason}><Plus size={16} /> Agregar motivo</button>
          </div>
          <DataTable
            columns={['Motivo', 'Activo']}
            rows={dateChangeReasons.map((reason) => [
              <input className="admin-inline-input" value={reason.label} disabled={!canEdit} onChange={(event) => onUpdateReason(reason.id, 'label', event.target.value)} />,
              <label className="admin-check">
                <input type="checkbox" checked={reason.active} disabled={!canEdit} onChange={(event) => onUpdateReason(reason.id, 'active', event.target.checked)} />
                <span>{reason.active ? 'Activo' : 'Inactivo'}</span>
              </label>,
            ])}
          />
        </section>
      </div>
    </section>
  )
}

function WorkspaceHeader({ eyebrow, title, facts, actions }) {
  return (
    <div className="workspace-header">
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <div className="fact-list">
        {facts.map(([label, value]) => (
          <div className="fact" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {actions && <div className="workspace-actions">{actions}</div>}
    </div>
  )
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button type="button" role="tab" aria-selected={active === tab} className={active === tab ? 'active' : ''} key={tab} onClick={() => onChange(tab)}>
          {tab}
        </button>
      ))}
    </div>
  )
}

function FilterGrid({ filters }) {
  return (
    <div className="filter-grid">
      {filters.map((filter) => (
        <label key={filter.label}>
          <span>{filter.label}</span>
          <select defaultValue="">
            <option value="">Todos</option>
            {filter.options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      ))}
      <div className="filter-actions">
        <button type="button" className="primary"><Search size={16} /> Filtrar</button>
        <button type="button" className="secondary"><RotateCcw size={16} /> Limpiar</button>
      </div>
    </div>
  )
}

function DataTable({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column, index) => <th key={`column-${index}`}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const cells = Array.isArray(row) ? row : row.cells
            const className = Array.isArray(row) ? '' : row.className || ''
            return (
              <tr key={`row-${index}`} className={className}>
                {cells.map((cell, cellIndex) => <td key={`cell-${index}-${cellIndex}`}>{cell}</td>)}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Metric({ label, value, icon: Icon, compact = false }) {
  return (
    <article className={`metric ${compact ? 'compact' : ''}`}>
      {Icon && <Icon size={18} />}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
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

function FieldCard({ text }) {
  const [label, value] = text.split(': ')
  return (
    <div className="field-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Pill({ children, tone = 'gray' }) {
  return <span className={`pill ${tone}`}>{children}</span>
}

function Progress({ value }) {
  return (
    <div className="progress" aria-label={`${value}%`}>
      <span style={{ width: `${value}%` }} />
      <strong>{value}%</strong>
    </div>
  )
}

function Modal({ name, role, currentCase, currentProforma, currentPE, peLinesData, lastReceptionSnapshot, dateChangeReasons, onConfirm, onClose }) {
  const [formValues, setFormValues] = useState({
    client: '',
    phone: '',
    email: '',
    vehicle: '',
    plate: '',
    insurer: 'INISER',
    ot: '',
    proforma: '',
    jde: currentPE?.jde && currentPE.jde !== 'Sin JDE' ? currentPE.jde : '',
    oc: currentPE?.oc && currentPE.oc !== '-' ? currentPE.oc : '',
    newDate: '',
    reason: dateChangeReasons[0] || 'Proveedor',
    comment: '',
    receivedMode: 'Parcial',
    documentType: 'Soporte',
    documentTitle: '',
    documentReference: '',
    documentDescription: '',
    documentFileName: '',
    finiquitoReference: '',
    finiquitoDescription: '',
    finiquitoFileName: '',
    hiddenDamageReason: '',
    hiddenDamageProforma: '',
    hiddenDamageOC: '',
    hiddenDamageOT: '',
    hiddenDamageProformaFileName: '',
    hiddenDamageOCFileName: '',
    hiddenDamageOTFileName: '',
    otExecutionNumber: '',
    clientAssumes: name === 'Agregar daño oculto' ? Boolean(currentCase?.clientAssumes) : false,
  })
  const isCreateCase = name === 'Crear caso'
  const isAddDocument = name === 'Agregar documento al expediente'
  const isFiniquito = name === 'Agregar finiquito'
  const isHiddenDamage = name === 'Agregar daño oculto'
  const isConfirmAvailability = name === 'Confirmar disponibilidad'
  const isGeneratePE = name === 'Generar PE'
  const isRegisterJDE = name === 'Registrar JDE / OC JDE'
  const isConfirmPhysical = name === 'Confirmar disponibilidad fisica y cantidades'
  const isRevertReception = name === 'Revertir ultima confirmacion'
  const isProceedOT = name === 'Proceder con OT'
  const canCreateCase = !isCreateCase || formValues.ot.trim() || formValues.proforma.trim()
  const canAddDocument = !isAddDocument || (formValues.documentTitle.trim() && formValues.documentReference.trim() && formValues.documentFileName.trim())
  const canAddFiniquito = true
  const canAddHiddenDamage = !isHiddenDamage || Boolean(formValues.hiddenDamageReason.trim())
  const canConfirmAvailability = !isConfirmAvailability || hiddenDamageCanAdvanceInventory(currentCase, currentProforma)
  const canConfirmPhysical = !isConfirmPhysical || selectedPELinesReadyForReceipt(peLinesData)
  const canGeneratePE = !isGeneratePE || selectedPELinesForProforma(currentProforma).length > 0
  const registeringJde = role === 'Bodega de Enderezado' || (role === 'Administrador' && currentPE?.state === 'Generado')
  const canRegisterJDE = !isRegisterJDE || (registeringJde ? Boolean(formValues.jde.trim()) : Boolean(formValues.oc.trim()))
  const canRevertReception = !isRevertReception || (lastReceptionSnapshot?.peId === currentPE?.id && isReceptionSnapshotActive(lastReceptionSnapshot))
  const canProceedOT = !isProceedOT || hasOTReference(currentCase) || Boolean(formValues.otExecutionNumber.trim())
  const canConfirm = canCreateCase && canAddDocument && canAddFiniquito && canAddHiddenDamage && canConfirmAvailability && canConfirmPhysical && canGeneratePE && canRegisterJDE && canRevertReception && canProceedOT
  const body = getModalBody(name, role, formValues, setFormValues, currentPE, currentCase, currentProforma, peLinesData, lastReceptionSnapshot, dateChangeReasons)
  const confirmLabel = name === 'Marcar expediente como completo' ? 'Procesar' : name === 'Cerrar caso' ? 'Procesar' : name === 'Proceder con OT' ? 'Proceder con OT' : isRegisterJDE ? (registeringJde ? 'Confirmar solicitud JDE' : 'Registrar OC JDE') : isGeneratePE ? 'Generar Pedido Especial' : isConfirmAvailability ? 'Confirmar Disponibilidad' : name === 'Cambiar fecha' ? 'Asignar fecha' : name === 'Confirmar disponibilidad fisica y cantidades' ? 'Procesar' : name === 'Revertir ultima confirmacion' ? 'Revertir confirmación' : isCreateCase ? 'Crear caso demo' : isAddDocument ? 'Agregar documento' : isFiniquito ? 'Aplicar finiquito' : isHiddenDamage ? 'Agregar daño oculto' : 'Guardar'
  function confirmAndClose() {
    onConfirm(name, formValues)
    onClose()
  }
  return (
    <div className="overlay" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header>
          <div>
            <p>Accion del mockup</p>
            <h2 id="modal-title">{name}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar modal"><X size={18} /></button>
        </header>
        <div className="modal-body">{body}</div>
        <footer>
          <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className={`primary ${!canConfirm ? 'disabled' : ''}`} disabled={!canConfirm} onClick={confirmAndClose}>
            <Check size={16} /> {confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  )
}

function getModalBody(name, role, formValues, setFormValues, currentPE, currentCase, currentProforma, peLinesData, lastReceptionSnapshot, dateChangeReasons) {
  if (name === 'Crear caso') {
    return <CreateCaseFields values={formValues} setValues={setFormValues} />
  }
  if (name === 'Agregar documento al expediente') {
    return <AddDocumentFields values={formValues} setValues={setFormValues} />
  }
  if (name === 'Agregar finiquito') {
    return <FiniquitoFields values={formValues} setValues={setFormValues} currentCase={currentCase} />
  }
  if (name === 'Agregar daño oculto') {
    return <HiddenDamageFields values={formValues} setValues={setFormValues} />
  }
  if (name === 'Cargar detalle de proforma') {
    return <ModalFields fields={['Seleccionar caso', 'Seleccionar proforma', 'Adjuntar Excel', 'Validar estructura', 'Vista previa', 'Importar lineas']} notice="Errores visibles: columna faltante, SKU vacio, cantidad invalida, proforma incorrecta o archivo corrupto." />
  }
  if (name === 'Confirmar disponibilidad') {
    const availability = currentProforma?.availability || 0
    const complete = availability >= 100
    if (!hiddenDamageCanAdvanceInventory(currentCase, currentProforma)) {
      return (
        <div className="notice">
          <AlertTriangle size={16} />
          Para avanzar con una proforma de daño oculto debe estar completo el expediente minimo y enviado a Bodega.
        </div>
      )
    }
    return (
      <div className="stack">
        <div className="notice">
          <AlertTriangle size={16} />
          {complete
            ? `La disponibilidad de ${currentProforma?.id || 'la proforma'} esta al 100%. Al confirmar, el detalle quedara bloqueado para Bodega, se notificara a Jefe de Enderezado que se puede proceder con la reparacion y se enviara notificacion al Responsable del caso.`
            : `La disponibilidad de ${currentProforma?.id || 'la proforma'} es ${availability}%. Al confirmar, el detalle quedara bloqueado para Bodega y se notificara a Jefe de Enderezado para aprobar los items sin disponibilidad para Pedido Especial.`}
        </div>
      </div>
    )
  }
  if (name === 'Decision operativa') {
    return <ModalFields fields={['Linea no autorizada', 'Codigo / descripcion', 'Cantidad requerida', 'Motivo de no autorizacion', 'Decision', 'Comentario']} />
  }
  if (name === 'Generar PE') {
    const selectedLines = selectedPELinesForProforma(currentProforma)
    const unauthorizedSelected = selectedLines.filter((line) => line.authorization === 'No autorizado').length
    const unselectedMissing = unselectedMissingLinesForProforma(currentProforma).length
    return (
      <div className="stack">
        <div className="notice">
          <AlertTriangle size={16} />
          {unauthorizedSelected > 0
            ? `Se generara un Pedido Especial para ${selectedLines.length} item(s), incluyendo ${unauthorizedSelected} item(s) no autorizados por el seguro.`
            : `Se generara un Pedido Especial para ${selectedLines.length} item(s) seleccionados de la proforma ${currentProforma?.id || ''}.`}
          {unselectedMissing > 0 ? ` Al confirmar, los ${unselectedMissing} item(s) faltantes no marcados no podran solicitarse nuevamente sobre esta misma proforma.` : ''}
        </div>
      </div>
    )
  }
  if (name === 'Proceder con OT') {
    const otContext = otReferenceContextForExecution(currentCase)
    return (
      <div className="stack">
        <div className="notice">
          <AlertTriangle size={16} />
          Al confirmar se marcara la OT como en ejecucion. Los usuarios asociados al caso veran que el vehiculo ya se encuentra en taller.
        </div>
        {!hasOTReference(currentCase) && (
          <div className="modal-fields">
            <label className="span-2">
              <span>Numero de {otContext.label}</span>
              <input value={formValues.otExecutionNumber} onChange={(event) => updateValue(setFormValues, 'otExecutionNumber', event.target.value)} placeholder="OT-10245" />
            </label>
          </div>
        )}
      </div>
    )
  }
  if (name === 'Registrar JDE / OC JDE') {
    return <JDEFields role={role} values={formValues} setValues={setFormValues} currentPE={currentPE} />
  }
  if (name === 'Cambiar fecha') {
    return <DateFields values={formValues} setValues={setFormValues} currentPE={currentPE} peLinesData={peLinesData} reasons={dateChangeReasons} />
  }
  if (name === 'Confirmar disponibilidad fisica y cantidades') {
    return <ReceptionFields values={formValues} setValues={setFormValues} currentPE={currentPE} currentCase={currentCase} peLinesData={peLinesData} />
  }
  if (name === 'Revertir ultima confirmacion') {
    return <RevertReceptionFields snapshot={lastReceptionSnapshot} />
  }
  if (name === 'Solicitar aprobacion de correo') {
    return <ModalFields fields={['Caso', 'Finiquito', 'PE asociado', 'Cambio de fecha', 'Cliente', 'Correo cliente', 'Aprobador: Responsable del caso', 'Vista previa del correo']} />
  }
  if (name === 'Validar cierre') {
    return <ModalFields fields={['Checklist de pendientes', 'Motivos de bloqueo', 'Boton cerrar caso deshabilitado']} notice="El cierre queda bloqueado mientras existan PE, lineas parciales o finiquitos abiertos." />
  }
  if (name === 'Marcar expediente como completo') {
    return (
      <div className="stack">
        <div className="notice">
          <AlertTriangle size={16} />
          Una vez confirmado, el caso pasara a En validación de disponibilidad y se enviara la solicitud al equipo de Bodega para subir el detalle de la proforma y confirmar disponibilidad.
        </div>
      </div>
    )
  }
  if (name === 'Cerrar caso') {
    return (
      <div className="notice">
        <AlertTriangle size={16} />
        Confirme el cierre solo si la disponibilidad del caso esta al 100% y no quedan gestiones operativas pendientes.
      </div>
    )
  }
  return <ModalFields fields={['Caso / PE', 'Responsable', 'Fecha/hora', 'Comentario', `Rol activo: ${role}`]} />
}

function updateValue(setValues, key, value) {
  setValues((current) => ({ ...current, [key]: value }))
}

function CreateCaseFields({ values, setValues }) {
  return (
    <>
      <div className="modal-fields">
        <label>
          <span>Cliente</span>
          <input value={values.client} onChange={(event) => updateValue(setValues, 'client', event.target.value)} placeholder="Nombre del cliente" />
        </label>
        <label>
          <span>Telefono</span>
          <input value={values.phone} onChange={(event) => updateValue(setValues, 'phone', event.target.value)} placeholder="8888-0000" />
        </label>
        <label>
          <span>Correo</span>
          <input value={values.email} onChange={(event) => updateValue(setValues, 'email', event.target.value)} placeholder="cliente@email.com" />
        </label>
        <label>
          <span>Vehiculo</span>
          <input value={values.vehicle} onChange={(event) => updateValue(setValues, 'vehicle', event.target.value)} placeholder="Toyota Hilux 2023" />
        </label>
        <label>
          <span>Placa</span>
          <input value={values.plate} onChange={(event) => updateValue(setValues, 'plate', event.target.value)} placeholder="M 000-000" />
        </label>
        <label className="modal-check span-2">
          <input type="checkbox" checked={Boolean(values.clientAssumes)} onChange={(event) => updateValue(setValues, 'clientAssumes', event.target.checked)} />
          <span>Cliente Asume</span>
        </label>
        {!values.clientAssumes && (
          <label>
            <span>Aseguradora</span>
            <select value={values.insurer} onChange={(event) => updateValue(setValues, 'insurer', event.target.value)}>
              <option value="INISER">INISER</option>
              <option value="ASSA">ASSA</option>
              <option value="SEGUROS AMERICA">SEGUROS AMERICA</option>
            </select>
          </label>
        )}
        <label>
          <span>Numero de OT</span>
          <input
            value={values.ot}
            onChange={(event) => updateValue(setValues, 'ot', event.target.value)}
            placeholder="OT-10245"
          />
        </label>
        <label>
          <span>Numero de proforma</span>
          <input
            value={values.proforma}
            onChange={(event) => updateValue(setValues, 'proforma', event.target.value)}
            placeholder="PF-001"
          />
        </label>
        <label>
          <span>Fecha estimada</span>
          <input type="date" />
        </label>
      </div>
      {!values.ot.trim() && !values.proforma.trim() && (
        <div className="notice"><AlertTriangle size={16} /> Debe ingresar numero de OT o numero de proforma para crear el caso.</div>
      )}
    </>
  )
}

function AddDocumentFields({ values, setValues }) {
  return (
    <>
      <div className="modal-fields">
        <label>
          <span>Tipo</span>
          <select value={values.documentType} onChange={(event) => updateValue(setValues, 'documentType', event.target.value)}>
            <option>Soporte</option>
            <option>Foto</option>
            <option>Correo</option>
            <option>Aprobación</option>
            <option>Otro</option>
          </select>
        </label>
        <label>
          <span>Nombre del documento</span>
          <input value={values.documentTitle} onChange={(event) => updateValue(setValues, 'documentTitle', event.target.value)} placeholder="Ej. Foto de soporte, Carta de aseguradora" />
        </label>
        <label>
          <span>Número de referencia</span>
          <input value={values.documentReference} onChange={(event) => updateValue(setValues, 'documentReference', event.target.value)} placeholder="Ej. AD-001, REF-7781" />
        </label>
        <label>
          <span>Descripción</span>
          <input value={values.documentDescription} onChange={(event) => updateValue(setValues, 'documentDescription', event.target.value)} placeholder="Descripción corta del soporte" />
        </label>
        <label className="span-2">
          <span>Archivo</span>
          <input type="file" onChange={(event) => updateValue(setValues, 'documentFileName', event.target.files?.[0]?.name || '')} />
        </label>
      </div>
      {!values.documentFileName.trim() && (
        <div className="notice"><AlertTriangle size={16} /> Seleccione un archivo para agregarlo a la bandeja documental.</div>
      )}
    </>
  )
}

function FiniquitoFields({ values, setValues, currentCase }) {
  return (
    <>
      <div className="modal-fields">
        <label>
          <span>Caso</span>
          <input readOnly value={currentCase?.id || ''} />
        </label>
        <label>
          <span>Referencia de finiquito</span>
          <input value={values.finiquitoReference} onChange={(event) => updateValue(setValues, 'finiquitoReference', event.target.value)} placeholder={`FIN-${currentCase?.id?.replace('CP-', '') || '000000'}`} />
        </label>
        <label className="span-2">
          <span>Descripción</span>
          <input value={values.finiquitoDescription} onChange={(event) => updateValue(setValues, 'finiquitoDescription', event.target.value)} placeholder="Finiquito aplicado al expediente del caso" />
        </label>
        <label className="span-2">
          <span>Documento de finiquito opcional</span>
          <input type="file" onChange={(event) => updateValue(setValues, 'finiquitoFileName', event.target.files?.[0]?.name || '')} />
        </label>
      </div>
      {!values.finiquitoFileName.trim() && <div className="notice"><AlertTriangle size={16} /> El finiquito quedara registrado sin adjunto; puede cargarse el soporte después desde la bandeja documental.</div>}
    </>
  )
}

function HiddenDamageFields({ values, setValues }) {
  return (
    <>
      <div className="modal-fields">
        <label className="span-2">
          <span>Motivo / descripción</span>
          <input value={values.hiddenDamageReason} onChange={(event) => updateValue(setValues, 'hiddenDamageReason', event.target.value)} placeholder="Daño oculto identificado durante reparación" />
        </label>
        <label className="modal-check span-2">
          <input type="checkbox" checked={Boolean(values.clientAssumes)} onChange={(event) => updateValue(setValues, 'clientAssumes', event.target.checked)} />
          <span>Cliente Asume</span>
        </label>
        <label>
          <span>Proforma daño oculto</span>
          <input value={values.hiddenDamageProforma} onChange={(event) => updateValue(setValues, 'hiddenDamageProforma', event.target.value)} placeholder="PF-DO-001" />
        </label>
        <label>
          <span>Archivo proforma</span>
          <input type="file" onChange={(event) => updateValue(setValues, 'hiddenDamageProformaFileName', event.target.files?.[0]?.name || '')} />
        </label>
        {!values.clientAssumes && (
          <>
            <label>
              <span>OC del seguro</span>
              <input value={values.hiddenDamageOC} onChange={(event) => updateValue(setValues, 'hiddenDamageOC', event.target.value)} placeholder="OCS-DO-001" />
            </label>
            <label>
              <span>Archivo OC seguro</span>
              <input type="file" onChange={(event) => updateValue(setValues, 'hiddenDamageOCFileName', event.target.files?.[0]?.name || '')} />
            </label>
          </>
        )}
        <label>
          <span>OT opcional</span>
          <input value={values.hiddenDamageOT} onChange={(event) => updateValue(setValues, 'hiddenDamageOT', event.target.value)} placeholder="OT-DO-001" />
        </label>
        <label>
          <span>Archivo OT opcional</span>
          <input type="file" onChange={(event) => updateValue(setValues, 'hiddenDamageOTFileName', event.target.files?.[0]?.name || '')} />
        </label>
      </div>
      {!values.hiddenDamageReason.trim() && <div className="notice"><AlertTriangle size={16} /> El motivo del daño oculto es obligatorio. Los documentos pueden quedar pendientes.</div>}
      {values.hiddenDamageReason.trim() && (!values.hiddenDamageProformaFileName.trim() || (!values.clientAssumes && !values.hiddenDamageOCFileName.trim())) && (
        <div className="notice"><AlertTriangle size={16} /> Podra crear el daño oculto, pero no avanzara a detalle, disponibilidad o PE hasta cargar {values.clientAssumes ? 'Proforma' : 'Proforma y OC del seguro'}.</div>
      )}
    </>
  )
}

function JDEFields({ role, values, setValues, currentPE }) {
  if (role === 'Bodega de Enderezado' || (role === 'Administrador' && currentPE?.state === 'Generado')) {
    return (
      <div className="stack">
        <div className="modal-fields">
          <label>
            <span>PE</span>
            <input readOnly value={currentPE?.id || ''} />
          </label>
          <label>
            <span>Solicitud JDE</span>
            <input value={values.jde} onChange={(event) => updateValue(setValues, 'jde', event.target.value)} placeholder="98765" />
          </label>
        </div>
        <div className="notice">
          <AlertTriangle size={16} />
          Al confirmar, el PE pasara a PE solicitado en JDE, el caso quedara en Pedido especial en seguimiento y se notificara a Compras para generar la OC correspondiente.
        </div>
      </div>
    )
  }
  return (
    <div className="stack">
      <div className="modal-fields">
        <label>
          <span>PE</span>
          <input readOnly value={currentPE?.id || ''} />
        </label>
        <label>
          <span>Solicitud JDE</span>
          <input readOnly value={currentPE?.jde || ''} />
        </label>
        <label>
          <span>OC JDE</span>
          <input value={values.oc} onChange={(event) => updateValue(setValues, 'oc', event.target.value)} placeholder="OC-4455" />
        </label>
        <label>
          <span>Comentario</span>
          <input value={values.comment} onChange={(event) => updateValue(setValues, 'comment', event.target.value)} placeholder="Referencia registrada por Compras" />
        </label>
      </div>
      <div className="notice">
        <AlertTriangle size={16} />
        La OC JDE habilitara la asignacion de fechas estimadas por linea del Pedido Especial.
      </div>
    </div>
  )
}

function DateFields({ values, setValues, currentPE, peLinesData, reasons }) {
  const requiresReason = selectedDateAssignmentRequiresReason(peLinesData)
  return (
    <>
      <div className="modal-fields">
        <label>
          <span>Fecha actual</span>
          <input readOnly value={currentPE?.eta || ''} />
        </label>
        <label>
          <span>Nueva fecha</span>
          <input type="date" value={values.newDate} onChange={(event) => updateValue(setValues, 'newDate', event.target.value)} />
        </label>
        {requiresReason && (
          <label>
            <span>Motivo</span>
            <select value={values.reason} onChange={(event) => updateValue(setValues, 'reason', event.target.value)}>
              {reasons.map((reason) => (
                <option key={reason}>{reason}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span>Comentario</span>
          <input value={values.comment} onChange={(event) => updateValue(setValues, 'comment', event.target.value)} placeholder="Comentario de Compras" />
        </label>
      </div>
      <div className="notice"><AlertTriangle size={16} /> La fecha se aplicara a las lineas seleccionadas y se notificara al Responsable del caso.</div>
    </>
  )
}

function ReceptionFields({ values, setValues, currentPE, currentCase, peLinesData }) {
  const selectedLines = selectedOpenPELines(peLinesData)
  const earlyLines = earlyReceiptLines(peLinesData)
  const hasFiniquito = caseHasFiniquito(currentCase)
  return (
    <div className="stack">
      <div className="notice">
        <AlertTriangle size={16} />
        Confirme solo si esta 100% seguro de que los repuestos marcados ya estan disponibles fisicamente. Se actualizaran {selectedLines.length} linea(s), el Pedido Especial y la disponibilidad del caso.
      </div>
      {earlyLines.length > 0 && (
        <div className="notice">
          <AlertTriangle size={16} />
          Hay {earlyLines.length} linea(s) con confirmacion mas de 7 dias antes de su fecha estimada. Verifique cuidadosamente antes de confirmar.
        </div>
      )}
      {hasFiniquito && (
        <>
          <div className="notice">
            <AlertTriangle size={16} />
            Este caso tiene finiquito activo. La confirmacion enviara un correo automatico al cliente.
          </div>
          <div className="notice">
            <AlertTriangle size={16} />
            Revise nuevamente la disponibilidad antes de continuar para evitar notificaciones incorrectas al cliente.
          </div>
        </>
      )}
      <div className="modal-fields">
        <label>
          <span>PE</span>
          <input readOnly value={currentPE?.id || ''} />
        </label>
        <label>
          <span>Lineas seleccionadas</span>
          <input readOnly value={selectedLines.length} />
        </label>
        <label>
          <span>Observacion</span>
          <input value={values.comment} onChange={(event) => updateValue(setValues, 'comment', event.target.value)} placeholder="Recepcion validada por Compras" />
        </label>
      </div>
    </div>
  )
}

function RevertReceptionFields({ snapshot }) {
  const lines = snapshot?.revertedLines || []
  return (
    <div className="stack">
      <div className="notice">
        <AlertTriangle size={16} />
        Esta acción regresara el Pedido Especial, sus lineas y la disponibilidad del caso al estado previo de la última confirmación física.
      </div>
      <div className="notice">
        <AlertTriangle size={16} />
        Las notificaciones ya enviadas no se deshacen. Si confirma, registre el seguimiento operativo correspondiente.
      </div>
      <div className="modal-fields">
        <label>
          <span>PE</span>
          <input readOnly value={snapshot?.peId || ''} />
        </label>
        <label>
          <span>Ventana disponible</span>
          <input readOnly value={isReceptionSnapshotActive(snapshot) ? 'Dentro de 6 horas' : 'Vencida'} />
        </label>
      </div>
      <div className="revert-lines">
        <strong>Lineas que se revierten</strong>
        {lines.length > 0 ? (
          <ul>
            {lines.map((line) => <li key={line}>{line}</li>)}
          </ul>
        ) : (
          <span>No hay lineas recientes para revertir.</span>
        )}
      </div>
    </div>
  )
}

function ModalFields({ fields, notice }) {
  return (
    <>
      <div className="modal-fields">
        {fields.map((field) => (
          <label key={field}>
            <span>{field}</span>
            <input readOnly value={field.includes('Decision') ? 'Aprobado operativo' : ''} placeholder="Dato simulado" />
          </label>
        ))}
      </div>
      {notice && <div className="notice"><AlertTriangle size={16} /> {notice}</div>}
    </>
  )
}

function Drawer({ name, role, bitacoraData, entityScope, entityId, onClose }) {
  return (
    <aside className="drawer">
      <header>
        <div>
          <p>Panel lateral</p>
          <h2>{name}</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar panel"><X size={18} /></button>
      </header>
      <div className="drawer-content">
        {drawerContent(name, role, bitacoraData, entityScope, entityId)}
      </div>
    </aside>
  )
}

function drawerContent(name, role, bitacoraData, entityScope, entityId) {
  if (name === 'Errores de carga Excel') {
    return (
      <div className="stack">
        <StatusLine label="Visibilidad" value={role === 'Bodega de Enderezado' || role === 'Administrador' ? 'Permitida' : 'Consulta limitada'} tone="orange" />
        <DataTable columns={['Fila', 'Campo', 'Error']} rows={[['12', 'SKU', 'Fila con SKU vacio'], ['18', 'Cantidad', 'Cantidad invalida']]} />
      </div>
    )
  }
  if (name === 'Bloqueos de cierre') {
    return (
      <ul className="drawer-list">
        <li><Lock size={16} /> PE-00045 esta en seguimiento.</li>
        <li><Lock size={16} /> PF-001 / Item 12 esta Parcial.</li>
        <li><Lock size={16} /> FIN-0007 esta abierto.</li>
      </ul>
    )
  }
  if (name === 'Documento de finiquito') {
    return <div className="document-preview-large"><FileCheck2 size={42} /><strong>FIN-0007</strong><span>Documento de finiquito abierto asociado al caso.</span></div>
  }
  if (name === 'Bitacora del PE' || name === 'Historial del caso') {
    const rows = bitacoraData
      .filter((entry) => entry.scope === entityScope && entry.entityId === entityId)
      .map((entry) => entry.row)
    if (rows.length === 0) {
      return <div className="notice"><History size={16} /> Sin eventos registrados para esta bitacora.</div>
    }
    return (
      <DataTable
        columns={['Fecha/hora', 'Evento', 'Antes', 'Despues', 'Usuario', 'Motivo', 'Comentario']}
        rows={rows}
      />
    )
  }
  return (
    <DataTable
      columns={['Fecha/hora', 'Evento', 'Usuario']}
      rows={[
        ['18/06/2026 10:15', 'Recepcion parcial registrada', 'Compras'],
        ['17/06/2026 14:20', 'OC JDE registrada', 'Bodega'],
        ['16/06/2026 09:30', 'Excel importado', 'Bodega'],
      ]}
    />
  )
}

export default App
