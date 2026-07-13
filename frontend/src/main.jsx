import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  FilePenLine,
  LogOut,
  ShieldCheck,
  UserRoundPlus,
  XCircle,
} from "lucide-react";
import {
  getCurrentUser,
  isSupabaseConfigured,
  listAllApplications,
  listMyApplications,
  loginUser,
  logoutUser,
  registerUser,
  reviewApplication,
  saveApplication,
} from "./api";
import tmaLogo from "./assets-tma-logo.png";
import "./styles.css";

const emptyApplication = {
  full_name: "",
  gender: "",
  date_of_birth: "",
  age: "",
  phone_number: "",
  email: "",
  nida_number: "",
  residential_address: "",
  region: "",
  district: "",
  profession: "",
  institution: "",
  education_level: "",
  work_experience_years: "",
  marital_status: "single",
  spouse_name: "",
  spouse_phone: "",
  member_group: "youth",
  parents: Array.from({ length: 4 }, () => ({ full_name: "", relationship: "", phone_number: "" })),
  children: Array.from({ length: 4 }, () => ({ full_name: "", gender: "", age: "", school_or_work: "" })),
  emergency_name: "",
  emergency_relationship: "",
  emergency_phone: "",
  emergency_address: "",
  wedding_sendoff_beneficiary: "",
  declaration_accepted: false,
};

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getCurrentUser()
      .then((nextUser) => setUser(nextUser))
      .catch(() => setUser(null));
  }, []);

  async function logout() {
    await logoutUser();
    setUser(null);
  }

  if (!user) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <div>
            <img className="hero-logo" src={tmaLogo} alt="TMA Action logo" />
            <p className="eyebrow">Tanzania Mentors Association</p>
            <h1>TMA Family Registration</h1>
            <p className="lede">
              Open an account, submit membership details, track your registration, and let office staff review
              requests from one place.
            </p>
          </div>
          <AuthForm
            mode={authMode}
            setMode={setAuthMode}
            onDone={(nextUser) => setUser(nextUser)}
            message={message}
            setMessage={setMessage}
          />
          {!isSupabaseConfigured && <SupabaseSetupNotice />}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <img src={tmaLogo} alt="TMA Action logo" />
          <div>
            <p className="eyebrow">TMA Family</p>
            <h1>Registration Portal</h1>
          </div>
        </div>
        <div className="top-actions">
          {user.is_staff && <span className="staff-badge">Admin</span>}
          <span>{user.username}</span>
          <button className="icon-button" onClick={logout} title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <Dashboard user={user} />
    </main>
  );
}

function AuthForm({ mode, setMode, onDone, message, setMessage }) {
  const [form, setForm] = useState({ username: "", password: "", email: "", first_name: "", last_name: "" });
  const isRegister = mode === "register";

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    try {
      const nextUser = isRegister ? await registerUser(form) : await loginUser(form);
      if (!nextUser) {
        setMessage("Account created. Please confirm your email, then sign in.");
        setMode("login");
        return;
      }
      onDone(nextUser);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <div className="form-title">
        {isRegister ? <UserRoundPlus size={22} /> : <ShieldCheck size={22} />}
        <h2>{isRegister ? "Create account" : "Sign in"}</h2>
      </div>
      {isRegister && (
        <div className="two-col">
          <Field label="First name" value={form.first_name} onChange={(first_name) => setForm({ ...form, first_name })} />
          <Field label="Last name" value={form.last_name} onChange={(last_name) => setForm({ ...form, last_name })} />
        </div>
      )}
      {isRegister && <Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />}
      {!isRegister && <Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />}
      {isRegister && <Field label="Username" value={form.username} onChange={(username) => setForm({ ...form, username })} />}
      <Field label="Password" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
      {message && <p className="error">{message}</p>}
      <button className="primary">{isRegister ? "Create account" : "Sign in"}</button>
      <button type="button" className="link-button" onClick={() => setMode(isRegister ? "login" : "register")}>
        {isRegister ? "Already have an account? Sign in" : "Need an account? Create one"}
      </button>
    </form>
  );
}

function SupabaseSetupNotice() {
  return (
    <div className="setup-notice">
      <strong>Supabase setup needed</strong>
      <span>Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env.local` and in Vercel.</span>
    </div>
  );
}

function Dashboard({ user }) {
  const [tab, setTab] = useState(user.is_staff ? "admin" : "member");

  return (
    <>
      <nav className="tabs">
        <button className={tab === "member" ? "active" : ""} onClick={() => setTab("member")}>
          <FilePenLine size={18} /> My registration
        </button>
        {user.is_staff && (
          <button className={tab === "admin" ? "active" : ""} onClick={() => setTab("admin")}>
            <ClipboardList size={18} /> Admin review
          </button>
        )}
      </nav>
      {tab === "member" ? <MemberArea /> : <AdminArea />}
    </>
  );
}

function MemberArea() {
  const [applications, setApplications] = useState([]);
  const [active, setActive] = useState(emptyApplication);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await listMyApplications();
    setApplications(data);
    if (data[0]) setActive(normalizeApplication(data[0]));
  }

  async function save(submit = false) {
    setNotice("");
    try {
      const data = await saveApplication(active, submit);
      setActive(normalizeApplication(data));
      await load();
      setNotice(submit ? "Registration submitted for office review." : "Draft saved.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  const latest = applications[0];

  return (
    <section className="workspace">
      <aside className="status-panel">
        <h2>Registration status</h2>
        {latest ? <StatusCard application={latest} /> : <p>No registration has been started yet.</p>}
        <div className="info-list">
          <p>Initial contribution: TZS 200,000</p>
          <p>Event contribution: TZS 100,000</p>
          <p>Annual secretariat fee: TZS 240,000</p>
          <p>Contact: 0764223041</p>
        </div>
      </aside>
      <ApplicationForm application={active} setApplication={setActive} onSave={save} notice={notice} />
    </section>
  );
}

function StatusCard({ application }) {
  const icons = {
    pending: <Clock3 size={20} />,
    approved: <CheckCircle2 size={20} />,
    rejected: <XCircle size={20} />,
    action_required: <FilePenLine size={20} />,
    draft: <FilePenLine size={20} />,
  };
  return (
    <div className={`status-card ${application.status}`}>
      {icons[application.status]}
      <div>
        <strong>{application.status_label}</strong>
        <span>{application.full_name}</span>
      </div>
      {(application.action_required_note || application.office_comments) && (
        <p>{application.action_required_note || application.office_comments}</p>
      )}
    </div>
  );
}

function ApplicationForm({ application, setApplication, onSave, notice }) {
  const update = (name, value) => setApplication({ ...application, [name]: value });
  const updateList = (listName, index, field, value) => {
    const rows = [...application[listName]];
    rows[index] = { ...rows[index], [field]: value };
    update(listName, rows);
  };

  return (
    <form className="registration-form" onSubmit={(event) => event.preventDefault()}>
      <Section title="Taarifa binafsi za mwanachama">
        <div className="two-col">
          <Field label="Jina Kamili" value={application.full_name} onChange={(v) => update("full_name", v)} required />
          <Field label="Jinsia" value={application.gender} onChange={(v) => update("gender", v)} required />
          <Field label="Tarehe ya Kuzaliwa" type="date" value={application.date_of_birth} onChange={(v) => update("date_of_birth", v)} />
          <Field label="Umri" type="number" value={application.age || ""} onChange={(v) => update("age", v)} />
          <Field label="Namba ya Simu" value={application.phone_number} onChange={(v) => update("phone_number", v)} required />
          <Field label="Barua Pepe" type="email" value={application.email} onChange={(v) => update("email", v)} required />
          <Field label="Namba ya NIDA" value={application.nida_number} onChange={(v) => update("nida_number", v)} required />
          <Field label="Mkoa" value={application.region} onChange={(v) => update("region", v)} required />
          <Field label="Wilaya" value={application.district} onChange={(v) => update("district", v)} required />
          <Field label="Kazi / Profession" value={application.profession} onChange={(v) => update("profession", v)} required />
          <Field label="Taasisi / Kampuni" value={application.institution} onChange={(v) => update("institution", v)} />
          <Field label="Kiwango cha Elimu" value={application.education_level} onChange={(v) => update("education_level", v)} required />
          <Field label="Uzoefu wa Kazi (Miaka)" type="number" value={application.work_experience_years || ""} onChange={(v) => update("work_experience_years", v)} />
        </div>
        <TextArea label="Anwani ya Makazi" value={application.residential_address} onChange={(v) => update("residential_address", v)} />
      </Section>

      <Section title="Hali ya ndoa na kundi">
        <div className="three-col">
          <Select label="Hali ya Ndoa" value={application.marital_status} onChange={(v) => update("marital_status", v)} options={[
            ["single", "Mseja"],
            ["married", "Nimeoa / Nimeolewa"],
            ["widowed", "Mjane / Mgane"],
            ["divorced", "Mtalaka"],
          ]} />
          <Field label="Jina la Mwenza" value={application.spouse_name} onChange={(v) => update("spouse_name", v)} />
          <Field label="Simu ya Mwenza" value={application.spouse_phone} onChange={(v) => update("spouse_phone", v)} />
        </div>
        <Segmented
          label="Kundi la Mwanachama"
          value={application.member_group}
          onChange={(v) => update("member_group", v)}
          options={[
            ["youth", "Vijana 18-30"],
            ["middle", "Rika la Kati 31-54"],
            ["elder", "Wazee 55-100"],
          ]}
        />
      </Section>

      <Section title="Wazazi / walezi / wakwe">
        <GridRows
          rows={application.parents}
          columns={[
            ["full_name", "Jina Kamili"],
            ["relationship", "Uhusiano"],
            ["phone_number", "Namba ya Simu"],
          ]}
          onChange={(i, field, value) => updateList("parents", i, field, value)}
        />
      </Section>

      <Section title="Watoto">
        <GridRows
          rows={application.children}
          columns={[
            ["full_name", "Jina Kamili"],
            ["gender", "Jinsia"],
            ["age", "Umri"],
            ["school_or_work", "Shule / Kazi"],
          ]}
          onChange={(i, field, value) => updateList("children", i, field, value)}
        />
      </Section>

      <Section title="Taarifa za dharura na tamko">
        <div className="two-col">
          <Field label="Jina la Mtu wa Dharura" value={application.emergency_name} onChange={(v) => update("emergency_name", v)} required />
          <Field label="Uhusiano" value={application.emergency_relationship} onChange={(v) => update("emergency_relationship", v)} required />
          <Field label="Namba ya Simu" value={application.emergency_phone} onChange={(v) => update("emergency_phone", v)} required />
          <Field label="Tukio la Harusi / Sendoff litamhusu nani?" value={application.wedding_sendoff_beneficiary} onChange={(v) => update("wedding_sendoff_beneficiary", v)} />
        </div>
        <TextArea label="Anwani ya Dharura" value={application.emergency_address} onChange={(v) => update("emergency_address", v)} />
        <label className="check-row">
          <input
            type="checkbox"
            checked={application.declaration_accepted}
            onChange={(event) => update("declaration_accepted", event.target.checked)}
          />
          Nakubali kujiunga na TMA Association na nitazingatia masharti, kanuni na taratibu zote za huduma.
        </label>
      </Section>

      {notice && <p className="notice">{notice}</p>}
      <div className="form-actions">
        <button type="button" onClick={() => onSave(false)}>Save draft</button>
        <button type="button" className="primary" onClick={() => onSave(true)}>Submit registration</button>
      </div>
    </form>
  );
}

function AdminArea() {
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await listAllApplications();
    setApplications(data);
    if (!selected && data[0]) setSelected(data[0]);
  }

  async function review(action, fields) {
    const data = await reviewApplication(selected.id, action, fields);
    setSelected(data);
    await load();
  }

  return (
    <section className="admin-layout">
      <div className="queue">
        <h2>Registration requests</h2>
        {applications.map((item) => (
          <button key={item.id} className={selected?.id === item.id ? "queue-item active" : "queue-item"} onClick={() => setSelected(item)}>
            <strong>{item.full_name}</strong>
            <span>{item.status_label}</span>
          </button>
        ))}
      </div>
      {selected ? <AdminReview application={selected} onReview={review} /> : <p>No requests found.</p>}
    </section>
  );
}

function AdminReview({ application, onReview }) {
  const [fields, setFields] = useState({
    office_registration_number: application.office_registration_number || "",
    office_received_by: application.office_received_by || "",
    office_received_at: application.office_received_at || "",
    office_comments: application.office_comments || "",
    action_required_note: application.action_required_note || "",
  });

  useEffect(() => {
    setFields({
      office_registration_number: application.office_registration_number || "",
      office_received_by: application.office_received_by || "",
      office_received_at: application.office_received_at || "",
      office_comments: application.office_comments || "",
      action_required_note: application.action_required_note || "",
    });
  }, [application.id]);

  const set = (name, value) => setFields({ ...fields, [name]: value });

  return (
    <article className="review-panel">
      <div className="review-header">
        <div>
          <p className="eyebrow">Application #{application.id}</p>
          <h2>{application.full_name}</h2>
        </div>
        <StatusCard application={application} />
      </div>
      <div className="summary-grid">
        <Summary label="Phone" value={application.phone_number} />
        <Summary label="Email" value={application.email} />
        <Summary label="NIDA" value={application.nida_number} />
        <Summary label="Region" value={`${application.region}, ${application.district}`} />
        <Summary label="Profession" value={application.profession} />
        <Summary label="Education" value={application.education_level} />
        <Summary label="Emergency" value={`${application.emergency_name} - ${application.emergency_phone}`} />
      </div>
      <Section title="Office action">
        <div className="three-col">
          <Field label="Namba ya Usajili" value={fields.office_registration_number} onChange={(v) => set("office_registration_number", v)} />
          <Field label="Imepokelewa na" value={fields.office_received_by} onChange={(v) => set("office_received_by", v)} />
          <Field label="Tarehe ya Kupokea" type="date" value={fields.office_received_at} onChange={(v) => set("office_received_at", v)} />
        </div>
        <TextArea label="Maoni ya Ofisi" value={fields.office_comments} onChange={(v) => set("office_comments", v)} />
        <TextArea label="Action required note" value={fields.action_required_note} onChange={(v) => set("action_required_note", v)} />
        <div className="form-actions">
          <button type="button" onClick={() => onReview("request_action", fields)}>Request action</button>
          <button type="button" onClick={() => onReview("reject", fields)}>Reject</button>
          <button type="button" className="primary" onClick={() => onReview("approve", fields)}>Approve</button>
        </div>
      </Section>
    </article>
  );
}

function Section({ title, children }) {
  return (
    <fieldset className="section">
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value ?? ""} required={required} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="field wide">
      <span>{label}</span>
      <textarea value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function Segmented({ label, value, onChange, options }) {
  return (
    <div className="segmented-wrap">
      <span>{label}</span>
      <div className="segmented">
        {options.map(([optionValue, optionLabel]) => (
          <button type="button" key={optionValue} className={value === optionValue ? "active" : ""} onClick={() => onChange(optionValue)}>
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

function GridRows({ rows, columns, onChange }) {
  return (
    <div className="grid-rows">
      <div className="grid-row header" style={{ gridTemplateColumns: `48px repeat(${columns.length}, 1fr)` }}>
        <span>No.</span>
        {columns.map(([, label]) => <span key={label}>{label}</span>)}
      </div>
      {rows.map((row, index) => (
        <div className="grid-row" key={index} style={{ gridTemplateColumns: `48px repeat(${columns.length}, 1fr)` }}>
          <span>{index + 1}</span>
          {columns.map(([field]) => (
            <input key={field} value={row[field] || ""} onChange={(event) => onChange(index, field, event.target.value)} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div className="summary">
      <span>{label}</span>
      <strong>{value || "Not provided"}</strong>
    </div>
  );
}

function normalizeApplication(application) {
  return {
    ...emptyApplication,
    ...application,
    parents: normalizeRows(application.parents, emptyApplication.parents),
    children: normalizeRows(application.children, emptyApplication.children),
  };
}

function normalizeRows(rows, fallback) {
  const compact = Array.isArray(rows) ? rows : [];
  return fallback.map((row, index) => ({ ...row, ...(compact[index] || {}) }));
}

createRoot(document.getElementById("root")).render(<App />);
