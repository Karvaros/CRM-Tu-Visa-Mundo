import { sampleLeads } from '@/lib/mock-data';
import type { Lead, LeadPriority } from '@/lib/types';

const sections: Array<{ key: LeadPriority; title: string; description: string }> = [
  { key: 'NUEVO', title: 'Nuevos leads', description: 'Ingresaron y todavía no recibieron el primer contacto.' },
  { key: 'ATRASADO', title: 'Seguimientos atrasados', description: 'Debían contactarse antes de hoy.' },
  { key: 'HOY', title: 'Seguimientos de hoy', description: 'Corresponde contactar hoy según la secuencia.' },
  { key: 'MANUAL', title: 'Seguimientos manuales', description: 'Reprogramados por el asesor para hoy.' },
];

function LeadCard({ lead }: { lead: Lead }) {
  const waLink = `https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`;

  return (
    <article className="lead-card">
      <div className="lead-card__top">
        <div>
          <div className="eyebrow">{lead.destino} · {lead.tipoVisa}</div>
          <h3>{lead.nombre} {lead.apellido}</h3>
          <p className="muted">Origen: {lead.origen} · Ingresó: {lead.fechaIngreso}</p>
        </div>
        <span className={`status status--${lead.estado.toLowerCase()}`}>{lead.estado.replaceAll('_', ' ')}</span>
      </div>

      <div className="lead-meta">
        <div><span>Último contacto</span><strong>{lead.ultimoContacto || 'Sin contacto'}</strong></div>
        <div><span>Próximo contacto</span><strong>{lead.proximoContacto}</strong></div>
        <div><span>Acción</span><strong>{lead.proximaAccion}</strong></div>
      </div>

      <div className="message-box">
        <div className="message-box__title">{lead.mensajeNumero ? `Mensaje ${lead.mensajeNumero}` : 'Mensaje sugerido'}</div>
        <p>{lead.mensajeTexto}</p>
      </div>

      <div className="actions">
        <button type="button" className="button button--secondary">Copiar mensaje</button>
        <a className="button button--primary" href={waLink} target="_blank" rel="noreferrer">Abrir WhatsApp</a>
        <button type="button" className="button button--success">Marcar enviado</button>
        <button type="button" className="button button--ghost">Respondió</button>
        <button type="button" className="button button--ghost">Reprogramar</button>
        <button type="button" className="button button--ghost">Ver ficha</button>
      </div>
    </article>
  );
}

export default function Home() {
  const total = sampleLeads.length;
  const nuevos = sampleLeads.filter((lead) => lead.prioridad === 'NUEVO').length;
  const atrasados = sampleLeads.filter((lead) => lead.prioridad === 'ATRASADO').length;

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">TVM</div>
          <div>
            <strong>Tu Visa Mundo</strong>
            <span>CRM V2</span>
          </div>
        </div>
        <nav>
          <a className="nav-item nav-item--active" href="#hoy">Hoy</a>
          <a className="nav-item" href="#leads">Leads</a>
          <a className="nav-item" href="#pipeline">Pipeline</a>
          <a className="nav-item" href="#historial">Historial</a>
          <a className="nav-item" href="#mensajes">Mensajes</a>
          <a className="nav-item" href="#configuracion">Configuración</a>
        </nav>
        <div className="sidebar-note">V2 en construcción · datos de demostración</div>
      </aside>

      <section className="content" id="hoy">
        <header className="page-header">
          <div>
            <div className="eyebrow">Agenda comercial</div>
            <h1>Hoy</h1>
            <p>Estas son las personas que requieren una acción comercial hoy.</p>
          </div>
          <div className="date-chip">14 SEP 2026</div>
        </header>

        <section className="metrics" aria-label="Resumen del día">
          <div className="metric"><span>Pendientes hoy</span><strong>{total}</strong></div>
          <div className="metric"><span>Nuevos</span><strong>{nuevos}</strong></div>
          <div className="metric"><span>Atrasados</span><strong>{atrasados}</strong></div>
          <div className="metric"><span>Conversaciones activas</span><strong>{sampleLeads.filter((lead) => lead.conversacionActiva).length}</strong></div>
        </section>

        {sections.map((section) => {
          const leads = sampleLeads.filter((lead) => lead.prioridad === section.key);
          if (!leads.length) return null;
          return (
            <section className="agenda-section" key={section.key}>
              <div className="section-heading">
                <div>
                  <h2>{section.title}</h2>
                  <p>{section.description}</p>
                </div>
                <span className="count-badge">{leads.length}</span>
              </div>
              <div className="lead-list">
                {leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
              </div>
            </section>
          );
        })}
      </section>
    </main>
  );
}
