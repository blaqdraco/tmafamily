import React from "react";
import { formatNida } from "./workflowConfig";

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

function filledRowCount(rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    Object.values(row || {}).some((value) => String(value || "").trim()),
  ).length;
}

function Section({ title, children }) {
  return (
    <fieldset className="section">
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

function Summary({ label, value }) {
  return (
    <div className="summary">
      <span>{label}</span>
      <strong>{value || ""}</strong>
    </div>
  );
}

function CheckOptions({ value, options }) {
  return (
    <div className="check-options">
      {options.map(([optionValue, label]) => (
        <span key={optionValue}>
          <strong>{value === optionValue ? "✓" : ""}</strong>
          {label}
        </span>
      ))}
    </div>
  );
}

function ReadonlyRows({ rows, columns, emptyText }) {
  const visibleRows = Array.isArray(rows) ? rows : [];
  if (!visibleRows.length) return <p className="muted">{emptyText}</p>;

  return (
    <div className="readonly-table">
      <div className="readonly-row header" style={{ gridTemplateColumns: `48px repeat(${columns.length}, 1fr)` }}>
        <span>No.</span>
        {columns.map(([, label]) => <span key={label}>{label}</span>)}
      </div>
      {visibleRows.map((row, index) => (
        <div className="readonly-row" key={index} style={{ gridTemplateColumns: `48px repeat(${columns.length}, 1fr)` }}>
          <span>{index + 1}</span>
          {columns.map(([field]) => (
            <strong key={field}>{field === "date_of_birth" ? formatDate(row[field]) : (row[field] || "")}</strong>
          ))}
        </div>
      ))}
    </div>
  );
}

function DeclarationBlock({ name, date, accepted }) {
  return (
    <div className="declaration-block">
      <p>
        Mimi <span>{name || ""}</span> nakubali kujiunga na TMA Family na nitazingatia masharti, kanuni na taratibu
        zote za huduma.
      </p>
      <div className="detail-grid">
        <Summary label="Tamko limekubaliwa" value={accepted ? "Ndiyo" : "Hapana"} />
        <Summary label="Tarehe" value={date} />
      </div>
    </div>
  );
}

export function ApplicationDetails({ application }) {
  const location = [application.region, application.district].filter(Boolean).join(", ");

  return (
    <>
      <Section title="1. TAARIFA BINAFSI ZA MWANACHAMA">
        <div className="detail-grid">
          <Summary label="Jina Kamili" value={application.full_name} />
          <Summary label="Jinsia" value={application.gender} />
          <Summary label="Tarehe ya Kuzaliwa" value={formatDate(application.date_of_birth)} />
          <Summary label="Umri" value={application.age} />
          <Summary label="Namba ya Simu" value={application.phone_number} />
          <Summary label="Barua Pepe" value={application.email} />
          <Summary label="Namba ya NIDA (NIN)" value={formatNida(application.nida_number)} />
          <Summary label="Anwani ya Makazi" value={application.residential_address} />
          <Summary label="Mkoa / Wilaya" value={location} />
          <Summary label="Kazi / Profession" value={application.profession} />
          <Summary label="Taasisi / Kampuni" value={application.institution} />
          <Summary label="Kiwango cha Elimu" value={application.education_level} />
          <Summary label="Uzoefu wa Kazi (Miaka)" value={application.work_experience_years} />
        </div>
      </Section>

      <Section title="2. HALI YA NDOA">
        <CheckOptions
          value={application.marital_status}
          options={[
            ["single", "Mseja"],
            ["married", "Nimeoa / Nimeolewa"],
            ["widowed", "Mjane / Mgane"],
            ["divorced", "Mtalaka"],
          ]}
        />
      </Section>

      <Section title="3. MAELEZO YA KUNDI LA MWANACHAMA">
        <CheckOptions
          value={application.member_group}
          options={[
            ["youth", "Vijana (Miaka 18 - 30)"],
            ["middle", "Rika la Kati (Miaka 31 - 54)"],
            ["elder", "Wazee (Miaka 55 - 100)"],
          ]}
        />
      </Section>

      <Section title="4. TAARIFA ZA WAZAZI / WALEZI / WAKWE">
        <Summary label="Idadi ya Wazazi/Walezi/Wakwe wanaotajwa (Si zaidi ya 02)" value={filledRowCount(application.parents)} />
        <ReadonlyRows
          rows={application.parents}
          columns={[
            ["full_name", "Jina Kamili"],
            ["relationship", "Uhusiano"],
            ["phone_number", "Namba ya Simu"],
          ]}
          emptyText="No parent, guardian, or in-law details were provided."
        />
      </Section>

      <Section title="5. TAARIFA ZA WATOTO (KWA WALIO NA WATOTO)">
        <Summary label="Idadi ya Watoto (Si zaidi ya wanne)" value={filledRowCount(application.children)} />
        <ReadonlyRows
          rows={application.children}
          columns={[
            ["full_name", "Jina Kamili"],
            ["gender", "Jinsia"],
            ["date_of_birth", "Tarehe ya Kuzaliwa"],
            ["age", "Umri"],
            ["school_or_work", "Shule / Kazi"],
          ]}
          emptyText="No children details were provided."
        />
      </Section>

      <Section title="6. MDHAMINI / REFEREE">
        <div className="detail-grid">
          <Summary label="Jina la Mdhamini" value={application.referee_full_name} />
          <Summary label="Namba ya Usajili wa Mdhamini" value={application.referee_registration_number} />
          <Summary label="Simu ya Mdhamini" value={application.referee_phone} />
        </div>
      </Section>

      <Section title="7. TAARIFA ZA DHARURA">
        <div className="detail-grid">
          <Summary label="Jina la Mtu wa Dharura" value={application.emergency_name} />
          <Summary label="Uhusiano" value={application.emergency_relationship} />
          <Summary label="Namba ya Simu" value={application.emergency_phone} />
          <Summary label="Anwani" value={application.emergency_address} />
        </div>
      </Section>

      <Section title="9. TAMKO LA MWANACHAMA">
        <DeclarationBlock
          name={application.full_name}
          date={formatDate(application.submitted_at || application.created_at)}
          accepted={application.declaration_accepted}
        />
      </Section>
    </>
  );
}

export function WorkflowTimeline({ status }) {
  const steps = ["applicant", "communication", "hr", "finance"];
  const labels = ["Applicant", "Communication", "HR", "Finance"];
  const activeIndex = {
    draft: 0,
    action_required: 0,
    rejected: 0,
    pending: 1,
    pending_communication: 1,
    pending_hr: 2,
    pending_finance: 3,
    approved: 4,
  }[status] ?? 0;

  return (
    <div className="workflow-timeline">
      {steps.map((step, index) => (
        <div
          key={step}
          className={`workflow-step ${index < activeIndex ? "done" : ""} ${index === activeIndex ? "active" : ""}`}
        >
          <span>{index + 1}</span>
          <strong>{labels[index]}</strong>
        </div>
      ))}
    </div>
  );
}
