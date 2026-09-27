import { useAuth } from '../context/AuthContext';

// Chips reutilizables para nombrar botones/campos exactos de la
// interfaz dentro del texto del manual, con los mismos colores que ya
// usa el resto de la app (var(--teal-dark)/var(--amber-dark)/etc.).
function Campo({ children }) {
  return (
    <span style={{
      display: 'inline-block', background: 'var(--input-bg)', border: '1px solid var(--line)',
      borderRadius: 6, padding: '1px 7px', fontSize: 12.5, fontWeight: 700, color: 'var(--navy)'
    }}>
      {children}
    </span>
  );
}
function Boton({ children, color = 'teal-dark' }) {
  return (
    <span style={{
      display: 'inline-block', background: `var(--${color})`, color: '#fff', borderRadius: 6,
      padding: '1px 8px', fontSize: 12.5, fontWeight: 700
    }}>
      {children}
    </span>
  );
}
function Nota({ children, tipo = 'info' }) {
  const esAviso = tipo === 'aviso';
  return (
    <div style={{
      background: esAviso ? 'var(--coral-light)' : 'var(--teal-light)',
      borderLeft: `3px solid var(--${esAviso ? 'coral-dark' : 'teal-dark'})`,
      borderRadius: '0 8px 8px 0', padding: '10px 14px', fontSize: 13, lineHeight: 1.55, margin: '10px 0'
    }}>
      {children}
    </div>
  );
}
function Seccion({ numero, titulo, children }) {
  return (
    <div className="card" style={{ breakInside: 'avoid' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{
          width: 28, height: 28, borderRadius: '50%', background: 'var(--teal-light)', color: 'var(--teal-dark)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0
        }}>
          {numero}
        </span>
        <h2 style={{ margin: 0, fontSize: 16.5, fontWeight: 800 }}>{titulo}</h2>
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-2)' }}>{children}</div>
    </div>
  );
}
function TablaAyuda({ filas, encabezados }) {
  return (
    <table className="tabla-compacta" style={{ marginTop: 4 }}>
      <thead><tr>{encabezados.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>
        {filas.map((f, i) => (
          <tr key={i}>{f.map((c, j) => <td key={j}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function tipoManual(roles) {
  if (roles.includes('Admin')) return 'admin';
  if (roles.length > 0 && roles.every((r) => r === 'Motorista')) return 'motorista';
  return 'operador';
}

export default function Ayuda() {
  const { usuario } = useAuth();
  const tipo = tipoManual(usuario?.roles ?? []);

  return (
    <div>
      <div className="no-imprimir" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Ayuda</h1>
          <p className="page-sub">Manual de uso del sistema, según tu rol.</p>
        </div>
        <button className="btn btn-primary" onClick={() => window.print()}>Descargar en PDF</button>
      </div>

      {tipo === 'admin' && <ManualAdmin />}
      {tipo === 'operador' && <ManualOperador />}
      {tipo === 'motorista' && <ManualMotorista />}
    </div>
  );
}

function ManualAdmin() {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Guía del Administrador</h2>
      <p className="page-sub">Acceso completo: todos los CAD, todos los reportes y los catálogos de configuración.</p>

      <Seccion numero={1} titulo="Iniciar sesión">
        <p>Escribí tu <Campo>Usuario</Campo> y <Campo>Contraseña</Campo> y presioná <Boton>Iniciar sesión</Boton>. Como Administrador tenés acceso automático a todos los CAD, sin que nadie te los asigne uno por uno.</p>
      </Seccion>

      <Seccion numero={2} titulo='Pantalla "Hoy"'>
        <p>Resumen general del día en todos los CAD: gráfica de <strong>Cuadre de CADs</strong> (% de cumplimiento, con los más atrasados primero) y <strong>Pendientes por cerrar</strong> (motoristas todavía "en turno" por CAD).</p>
      </Seccion>

      <Seccion numero={3} titulo="Monitoreo">
        <p>Quién tiene y no tiene movimiento (ingreso/salida) hoy, por CAD. <Boton>Exportar PDF</Boton> descarga el mismo listado agrupado.</p>
      </Seccion>

      <Seccion numero={4} titulo="Planificación">
        <p>Registrá cuántos motoristas se esperan por <Campo>CAD</Campo> y <Campo>Fecha</Campo>. Es obligatoria antes de poder asignar motoristas ese día.</p>
      </Seccion>

      <Seccion numero={5} titulo="Asignación y Asistencia">
        <p>Elegí <Campo>CAD</Campo>, <Campo>Fecha</Campo> y <Campo>Tipo de asignación</Campo> (Titular o Apoyo), marcá los motoristas y presioná <Boton>Asignar seleccionados a esta CAD</Boton> — queda asignado y con ingreso marcado en el mismo paso.</p>
        <p><strong>Es Asueto:</strong> en un feriado entre semana, muestra también a los motoristas de Turno.</p>
        <p><strong>Descanso:</strong> para el día libre semanal de un motorista Fijo — <Boton color="amber-dark">Descanso</Boton> lo deja pagado y autorizado de una vez, sin pasar por Cierre de turno.</p>
        <p><strong>Cubrir con motorista de otro CAD:</strong> buscá por nombre a un motorista libre de otro CAD para una emergencia.</p>
      </Seccion>

      <Seccion numero={6} titulo="Cierre y Autorización de turno">
        <p>Buscá al motorista "en turno", <Boton>Cerrar turno</Boton>, confirmá <Campo>Cantidad de repartos</Campo> (mayor a 0) y <Campo>Tarifa aplicable</Campo>, y <Boton>Guardar y autorizar cierre de turno</Boton>.</p>
        <p>En "Autorizados hoy" podés <Boton color="coral-dark">Revertir</Boton> un cierre con error.</p>
        <Nota>Un turno que se quedó abierto de un día para otro también se puede cerrar con normalidad — solo evitá tocar el campo de ingreso si no hace falta corregirlo; el sistema lo fecha en el día real que se trabajó.</Nota>
      </Seccion>

      <Seccion numero={7} titulo="Informes">
        <TablaAyuda
          encabezados={['Informe', 'Para qué sirve']}
          filas={[
            ['Boletas cierre', 'Ver las boletas ya cargadas de un CAD y fecha.'],
            ['Subir boleta', 'Cargar boletas, o generar un link para que el motorista la suba por WhatsApp.'],
            ['Revisión de boletas', 'Cuadrícula con el estado de todos los motoristas de un rango de fechas, exportable a PDF.'],
            ['Informe de asistencia', 'Asistencia de un CAD para un mes.'],
            ['Asistencia general', 'Asistencia y cierre de un rango de fechas, uno o todos los CAD, PDF o Excel.'],
            ['Ficha de personal', 'Ficha individual de un empleado.'],
            ['Informe semanal', 'Pago por motorista de la semana, exportable a Excel — exclusivo de este rol.']
          ]}
        />
      </Seccion>

      <Seccion numero={8} titulo="Catálogo: Empresas y sucursales">
        <p><strong>Empresas:</strong> insertar, editar o dar de baja. <strong>Sucursales (CAD):</strong> insertar indicando empresa, código y supervisor; editar o dar de baja (pagina de 15 en 15).</p>
        <Nota>Un CAD dado de baja deja de aparecer para el resto de usuarios en todos los selectores del sistema, aunque el registro se conserva.</Nota>
      </Seccion>

      <Seccion numero={9} titulo="Catálogo: Tarifas">
        <p>Catálogo de tarifas de pago (Motorista Fijo, Turno, sus variantes de Asueto, Hora extra) que se seleccionan al cerrar un turno.</p>
      </Seccion>

      <Seccion numero={10} titulo="Catálogo: Personal">
        <p>El <strong>Código</strong> lo asigna el sistema automáticamente. Si la persona también es motorista, se activa "Datos de motorista" (licencia, placa, tipo). Cada persona tiene su sección de <strong>Documentos</strong> (foto, DPI, licencia, etc.). Dar de baja la marca Inactiva (reversible); solo Administrador puede eliminarla en forma definitiva, y eso ya no se puede deshacer.</p>
      </Seccion>

      <Seccion numero={11} titulo="Catálogo: Usuarios y permisos">
        <p>Elegí la <Campo>Persona</Campo> (sin usuario todavía), completá <Campo>Usuario</Campo>, <Campo>Correo</Campo> y <Campo>Contraseña inicial</Campo>, marcá sus <strong>Roles</strong> y los <strong>CAD</strong> a los que tiene acceso. Desde la lista podés <Boton>Editar</Boton> o <Boton color="coral-dark">Bloquear</Boton>/Desbloquear.</p>
      </Seccion>

      <Seccion numero={12} titulo="Preguntas frecuentes">
        <p><strong>¿Puedo corregir un cierre ya guardado?</strong> Sí, solo el Administrador puede corregir la cantidad de repartos o la hora de salida de un cierre ya guardado.</p>
        <p><strong>¿Puedo dejar la licencia en blanco al crear un motorista?</strong> Sí, se completa después.</p>
        <p><strong>¿Por qué no veo el CAD "Administración" al asignar?</strong> Es un CAD interno, no operativo — se oculta a propósito de todos los procesos.</p>
      </Seccion>
    </div>
  );
}

function ManualOperador() {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Guía del Operador</h2>
      <p className="page-sub">Para Supervisores, Gerentes y Digitadores: el ciclo diario completo de un CAD.</p>

      <Seccion numero={1} titulo="Iniciar sesión">
        <p>Solo vas a ver los CAD que el Administrador te haya asignado. Si son varios, cambiá entre ellos con el selector <Campo>CAD (sucursal)</Campo> en cada pantalla.</p>
      </Seccion>

      <Seccion numero={2} titulo="El ciclo diario, en 4 pasos">
        <p>En el celular hay una barra de accesos directos abajo, en orden: <strong>Hoy</strong> (resumen) → <strong>Planifica</strong> (cuántos esperás hoy) → <strong>Asistencia</strong> (asignás y quedan con ingreso marcado) → <strong>Cierre</strong> (cerrás su turno al terminar).</p>
      </Seccion>

      <Seccion numero={3} titulo="Planificación">
        <p>Registrá cuántos motoristas planificás para tu CAD hoy. Es obligatoria: sin ella, Asignación no te deja avanzar.</p>
      </Seccion>

      <Seccion numero={4} titulo="Asignación y Asistencia">
        <p>Elegí <Campo>Fecha</Campo> y <Campo>Tipo de asignación</Campo>, marcá los disponibles y <Boton>Asignar seleccionados a esta CAD</Boton>.</p>
        <p><strong>Es Asueto:</strong> en un feriado entre semana, muestra también a los motoristas de Turno.</p>
        <p><strong>Descanso:</strong> para el día libre semanal de un Fijo, usá <Boton color="amber-dark">Descanso</Boton> en vez de "Asignar" — queda pagado y autorizado directo.</p>
        <p><strong>Cubrir con motorista de otro CAD:</strong> para una emergencia, buscá por nombre a uno libre de otro CAD.</p>
      </Seccion>

      <Seccion numero={5} titulo="Cierre y Autorización de turno">
        <p><Boton>Cerrar turno</Boton>, confirmá <Campo>Cantidad de repartos</Campo> (mayor a 0) y <Campo>Tarifa</Campo>, y guardá.</p>
        <Nota>
          <strong>Supervisor:</strong> tu cierre queda autorizado de inmediato, y podés <Boton color="coral-dark">Revertir</Boton> uno con error.<br /><br />
          <strong>Digitador:</strong> tu cierre queda pendiente hasta que un Supervisor, Gerente o Administrador lo autorice.
        </Nota>
      </Seccion>

      <Seccion numero={6} titulo="Boletas">
        <p>En Informes → <strong>Subir boleta</strong>: elegí <Campo>Fecha</Campo> y <Campo>CAD</Campo> y subí la foto de cada motorista (acepta fotos de iPhone). Si no tiene cuenta, usá <Boton color="amber-dark">Generar link para compartir hoy</Boton> y mandaselo por WhatsApp (vence a las 48 horas).</p>
        <p>En <strong>Revisión de boletas</strong> vas a ver el estado de todos los motoristas de un rango de fechas.</p>
      </Seccion>

      <Seccion numero={7} titulo="Informes de consulta">
        <p><strong>Informe de asistencia</strong> y <strong>Asistencia general</strong>: consultá por mes o rango de fechas, exportable a PDF o Excel. <strong>Ficha de personal</strong>: datos de un empleado.</p>
      </Seccion>

      <Seccion numero={8} titulo="Personal">
        <p>Podés dar de alta personal nuevo (el código se asigna solo) y subir sus documentos y foto desde Catálogos → Personal.</p>
      </Seccion>

      <Seccion numero={9} titulo="Preguntas frecuentes">
        <p><strong>Asigné a alguien por error, ¿qué hago?</strong> En "Asignaciones activas hoy", <Boton color="coral-dark">Anular</Boton> (no se puede si ya cerró turno).</p>
        <p><strong>Un motorista quedó "en turno" de ayer, ¿lo puedo cerrar hoy?</strong> Sí, buscalo igual en la lista y cerralo con normalidad.</p>
        <p><strong>¿Por qué no puedo guardar un cierre con 0 repartos?</strong> El sistema lo bloquea a propósito para evitar cierres sin ninguna entrega.</p>
      </Seccion>
    </div>
  );
}

function ManualMotorista() {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Guía del Motorista</h2>
      <p className="page-sub">Todo lo que necesitás saber para subir tu boleta del día.</p>

      <Seccion numero={1} titulo="Iniciar sesión">
        <p>Entrá con el <Campo>Usuario</Campo> y <Campo>Contraseña</Campo> que te dio tu Supervisor. El sistema te lleva directo a tu única pantalla, "Boletas cierre" — no vas a ver otros menús, así es a propósito.</p>
      </Seccion>

      <Seccion numero={2} titulo="Subir tu boleta">
        <p>Buscá tu nombre (solo vas a ver tu propio registro), presioná <Boton>Subir boleta</Boton> y elegí la foto desde tu galería o tomala en el momento.</p>
        <p>Las fotos tomadas con iPhone se aceptan igual que las de cualquier otro celular.</p>
        <Nota tipo="aviso">Solo se puede subir la boleta del día de hoy.</Nota>
      </Seccion>

      <Seccion numero={3} titulo="Si te mandan un link por WhatsApp">
        <p>Si todavía no tenés usuario, tu Supervisor te puede mandar un link para subir tu boleta de hoy sin necesitar cuenta. Solo funciona el mismo día y vence a las 48 horas.</p>
      </Seccion>

      <Seccion numero={4} titulo="Estados de tu boleta">
        <TablaAyuda
          encabezados={['Estado', 'Qué significa']}
          filas={[
            ['Pendiente', 'Todavía no subiste la boleta de hoy.'],
            ['Cargada', 'Ya se subió correctamente y quedó guardada.']
          ]}
        />
      </Seccion>

      <Seccion numero={5} titulo="Preguntas frecuentes">
        <p><strong>Subí la boleta equivocada, ¿puedo corregirla?</strong> Sí, volvé a presionar <Boton>Subir boleta</Boton> y subí la correcta — la nueva es la que cuenta.</p>
        <p><strong>No me deja subir la foto, ¿qué hago?</strong> Revisá tu señal e intentá de nuevo; si sigue, avisale a tu Supervisor.</p>
        <p><strong>¿Puedo ver la boleta de otro motorista?</strong> No, solo la tuya.</p>
      </Seccion>
    </div>
  );
}
