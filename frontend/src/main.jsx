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
import tmaLogo from "./assets-tma-association-logo.jpeg";
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
  member_group: "youth",
  parents: Array.from({ length: 2 }, () => ({ full_name: "", relationship: "", phone_number: "" })),
  children: Array.from({ length: 4 }, () => ({ full_name: "", gender: "", date_of_birth: "", age: "", school_or_work: "" })),
  emergency_name: "",
  emergency_relationship: "",
  emergency_phone: "",
  emergency_address: "",
  declaration_accepted: false,
};

const FORM_STEPS = [
  { id: "personal", label: "Taarifa Binafsi" },
  { id: "family", label: "Familia" },
  { id: "finish", label: "Kukamilisha" },
];

const contributionRules = [
  "Kila mwanachama atatoa mchango wa awali wa TZS 200,000.00 (Mkoba).",
  "Mwisho wa kutoa mchango wa awali ni tarehe 31/09/2026.",
  "Kwa kila tukio la shida au raha, kila mwanachama atachangia TZS 100,000.00.",
  "Kila mwanachama atatakiwa kuweka akiba ya miezi miwili sawa na TZS 200,000.00.",
  "Baada ya tukio, wanachama watarejesha fedha zilizotolewa ili kuendeleza mfuko wa kikundi ndani ya siku 30.",
  "Ada ya mwaka ni TZS 240,000.00 (TZS 20,000.00 kila mwezi au TZS 120,000.00 kwa miezi 6) kwa shughuli za sekretariati.",
  "Malipo yanaweza kufanywa kupitia Mkoba au CRDB.",
];

const eligibilityRules = [
  "Awe mwanachama wa Tanzania Mentors Association.",
  "Awe mwanachama hai wa Tanzania Mentors Association.",
  "Awe Mtanzania.",
  "Awe na angalau Shahada moja ya fani yoyote.",
  "Awe na uzoefu wa kazi wa angalau mwaka mmoja.",
  "Awe tayari kutoa huduma ya ushauri kwa wanachama wengine.",
  "Awe tayari kushirikiana na wenzake katika shughuli mbalimbali za kijamii.",
];

const serviceItems = [
  "Kufunga ndoa / Harusi / Sendoff",
  "Kufiwa na mzazi au mlezi",
  "Kufiwa na mtoto/watoto wa kuwazaa",
  "Kufiwa na mwenza wake wa ndoa",
  "Kufariki kwa mwanachama",
];

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
            <h1>{user.is_staff ? "Admin Console" : "Registration Portal"}</h1>
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
  if (user.is_staff) {
    return <AdminArea />;
  }

  return (
    <MemberArea />
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
          <p>Initial contribution: TZS 200,000 (Mkoba)</p>
          <p>Event contribution: TZS 100,000</p>
          <p>Annual fee (Ada): TZS 240,000</p>
          <p>Payment plans: TZS 20,000/month or TZS 120,000/6 months</p>
          <p>Payment methods: Mkoba / CRDB</p>
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
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState([]);

  const update = (name, value) => setApplication({ ...application, [name]: value });
  const updateList = (listName, index, field, value) => {
    const rows = [...application[listName]];
    rows[index] = { ...rows[index], [field]: value };
    if (listName === "children" && field === "date_of_birth") {
      rows[index].age = ageFromBirthdate(value);
    }
    update(listName, rows);
  };

  function goNext() {
    const stepErrors = validateFormStep(step, application);
    setErrors(stepErrors);
    if (!stepErrors.length) setStep((current) => Math.min(current + 1, FORM_STEPS.length - 1));
  }

  function goBack() {
    setErrors([]);
    setStep((current) => Math.max(current - 1, 0));
  }

  function submitRegistration() {
    const formErrors = validateFullForm(application);
    setErrors(formErrors);
    if (!formErrors.length) onSave(true);
  }

  return (
    <form className="registration-form" onSubmit={(event) => event.preventDefault()}>
      <DocumentHeader subtitle="MWONGOZO WA KUJIUNGA NA HUDUMA YA TMA FAMILY" />
      {step === 0 && <MembershipGuide />}

      <div className="form-steps">
        {FORM_STEPS.map((item, index) => (
          <div key={item.id} className={`form-step ${index === step ? "active" : ""} ${index < step ? "done" : ""}`}>
            <span>{index + 1}</span>
            <strong>{item.label}</strong>
          </div>
        ))}
      </div>

      {step === 0 && (
        <>
          <Section title="SEHEMU YA PILI: FOMU YA USAJILI WA MWANACHAMA">
            <div className="office-placeholder-grid">
              <Summary label="Namba ya Usajili" value="" />
              <Summary label="Tarehe ya Kupokea Fomu" value="" />
              <Summary label="Imepokelewa na" value="" />
              <Summary label="Sahihi" value="" />
            </div>
          </Section>

          <Section title="1. TAARIFA BINAFSI ZA MWANACHAMA">
            <div className="two-col">
              <Field label="Jina Kamili" value={application.full_name} onChange={(v) => update("full_name", v)} required />
              <Select
                label="Jinsia"
                value={application.gender}
                onChange={(v) => update("gender", v)}
                required
                options={[
                  ["", ""],
                  ["Male", "Male"],
                  ["Female", "Female"],
                ]}
              />
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

          <Section title="2. HALI YA NDOA">
            <Select label="Hali ya Ndoa" value={application.marital_status} onChange={(v) => update("marital_status", v)} options={[
              ["single", "Mseja"],
              ["married", "Nimeoa / Nimeolewa"],
              ["widowed", "Mjane / Mgane"],
              ["divorced", "Mtalaka"],
            ]} />
          </Section>

          <Section title="3. MAELEZO YA KUNDI LA MWANACHAMA">
            <Segmented
              label="Mwanachama yupo kundi gani?"
              value={application.member_group}
              onChange={(v) => update("member_group", v)}
              options={[
                ["youth", "Vijana 18-30"],
                ["middle", "Rika la Kati 31-54"],
                ["elder", "Wazee 55-100"],
              ]}
            />
          </Section>
        </>
      )}

      {step === 1 && (
        <>
          <Section title="4. TAARIFA ZA WAZAZI / WALEZI / WAKWE">
            <Field label="Idadi ya Wazazi/Walezi/Wakwe wanaotajwa (Si zaidi ya 02)" value={filledRowCount(application.parents)} onChange={() => {}} type="number" readOnly />
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

          <Section title="5. TAARIFA ZA WATOTO (KWA WALIO NA WATOTO)">
            <Field label="Idadi ya Watoto (Si zaidi ya wanne)" value={filledRowCount(application.children)} onChange={() => {}} type="number" readOnly />
            <GridRows
              rows={application.children}
              columns={[
                ["full_name", "Jina Kamili"],
                ["gender", "Jinsia", "select", [
                  ["", ""],
                  ["Male", "Male"],
                  ["Female", "Female"],
                ]],
                ["date_of_birth", "Tarehe ya Kuzaliwa", "date"],
                ["age", "Umri", "number", [], true],
                ["school_or_work", "Shule / Kazi"],
              ]}
              onChange={(i, field, value) => updateList("children", i, field, value)}
            />
          </Section>
        </>
      )}

      {step === 2 && (
        <>
          <Section title="7. TAARIFA ZA DHARURA">
            <div className="two-col">
              <Field label="Jina la Mtu wa Dharura" value={application.emergency_name} onChange={(v) => update("emergency_name", v)} required />
              <Field label="Uhusiano" value={application.emergency_relationship} onChange={(v) => update("emergency_relationship", v)} required />
              <Field label="Namba ya Simu" value={application.emergency_phone} onChange={(v) => update("emergency_phone", v)} required />
            </div>
            <TextArea label="Anwani ya Dharura" value={application.emergency_address} onChange={(v) => update("emergency_address", v)} />
          </Section>

          <Section title="9. TAMKO LA MWANACHAMA">
            <DeclarationBlock
              name={application.full_name}
              date={formatDate(application.submitted_at || application.created_at)}
              accepted={application.declaration_accepted}
              onAcceptChange={(value) => update("declaration_accepted", value)}
            />
          </Section>
        </>
      )}

      {errors.length > 0 && (
        <div className="validation-errors">
          {errors.map((error) => <p key={error}>{error}</p>)}
        </div>
      )}
      {notice && <p className="notice">{notice}</p>}

      <div className="form-actions">
        {step > 0 && <button type="button" onClick={goBack}>Back</button>}
        <button type="button" onClick={() => onSave(false)}>Save draft</button>
        {step < FORM_STEPS.length - 1 ? (
          <button type="button" className="primary" onClick={goNext}>Next</button>
        ) : (
          <button type="button" className="primary" onClick={submitRegistration}>Submit registration</button>
        )}
      </div>
    </form>
  );
}

function DocumentHeader({ subtitle }) {
  return (
    <div className="document-header">
      <img src={tmaLogo} alt="TMA Association logo" />
      <div>
        <h2>TMA FAMILY</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function MembershipGuide() {
  return (
    <section className="guide-card">
      <p className="eyebrow">SEHEMU YA KWANZA</p>
      <h2>1. Utangulizi</h2>
      <p>
        TMA Family ni huduma inayotolewa na Tanzania Mentors Association kwa ajili ya kusaidiana katika matukio mbalimbali
        ya kijamii, yakiwemo shida na raha pamoja na kuimarisha mshikamano miongoni mwa wanachama.
      </p>
      <p>
        Kila mwanachama anatakiwa kujaza taarifa sahihi na kamili ili kuwezesha utunzaji mzuri wa kumbukumbu za huduma.
        TMA Family itahudumia wanachama 200 tu ambao watahitaji huduma hii.
      </p>
      <div className="guide-grid">
        <GuideList title="2. Vigezo vya Kujiunga" items={eligibilityRules} />
        <GuideList title="3. Masharti ya Michango na Akiba" items={contributionRules} />
        <GuideList title="Huduma zinazotolewa kwa mwanachama" items={serviceItems} />
        <GuideList
          title="FAIDA YA KUJIUNGA NA TMA ASSOCIATION"
          items={[
            "Atanufaika na huduma zinazotolewa na TMA Family.",
            "Atapewa kipaumbele katika kutoa huduma za utoaji ushauri (mentoring).",
            "Atapata fursa ya kushirikiana na wenzake (networking).",
          ]}
        />
      </div>
      <p className="guide-note">
        Adhabu kwa mwanachama asiyetimiza masharti: kufutiwa uanachama endapo hautalipa michango kwa wakati.
      </p>
    </section>
  );
}

function GuideList({ title, items }) {
  return (
    <div>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function AdminArea() {
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await listAllApplications();
    setApplications(data);
    setSelected((current) => {
      if (!current) return data[0] || null;
      return data.find((item) => item.id === current.id) || data[0] || null;
    });
  }

  async function review(action, fields) {
    setNotice("");
    const data = await reviewApplication(selected.id, action, fields);
    setSelected(data);
    await load();
    setNotice(data.email_warning || "Registration status updated and notification email sent.");
  }

  function changeFilter(nextFilter) {
    setFilter(nextFilter);
    const nextSelected = applications.find((item) => nextFilter === "all" || item.status === nextFilter);
    setSelected(nextSelected || null);
  }

  const filteredApplications = applications.filter((item) => filter === "all" || item.status === filter);

  return (
    <section className="admin-dashboard">
      <AdminStats applications={applications} />
      <div className="admin-layout">
        <div className="queue">
          <div className="queue-heading">
            <h2>Registered clients: {filteredApplications.length}</h2>
          </div>
          <div className="filter-row">
            {[
              ["all", "All"],
              ["pending", "Pending"],
              ["approved", "Approved"],
              ["action_required", "Action"],
              ["rejected", "Rejected"],
            ].map(([value, label]) => (
              <button key={value} className={filter === value ? "active" : ""} onClick={() => changeFilter(value)}>
                {label}
              </button>
            ))}
          </div>
          {filteredApplications.map((item) => (
            <button key={item.id} className={selected?.id === item.id ? "queue-item active" : "queue-item"} onClick={() => setSelected(item)}>
              <strong>{item.full_name || "Unnamed applicant"}</strong>
              <span>{item.status_label}</span>
              <small>{item.phone_number || item.email || "No contact provided"}</small>
            </button>
          ))}
          {!filteredApplications.length && <p className="muted">No clients in this view.</p>}
        </div>
        {selected ? <AdminReview application={selected} onReview={review} notice={notice} /> : <p>No requests found.</p>}
      </div>
    </section>
  );
}

function AdminStats({ applications }) {
  const counts = applications.reduce(
    (total, item) => {
      total[item.status] = (total[item.status] || 0) + 1;
      total.all += 1;
      return total;
    },
    { all: 0, pending: 0, approved: 0, action_required: 0, rejected: 0, draft: 0 },
  );
  const approvedAmount = counts.approved * 200000;

  return (
    <div className="stats-grid">
      <StatCard icon={<ClipboardList size={22} />} label="Total registered" value={counts.all} />
      <StatCard icon={<Clock3 size={22} />} label="Pending review" value={counts.pending} />
      <StatCard icon={<CheckCircle2 size={22} />} label="Approved clients" value={counts.approved} />
      <StatCard icon={<FilePenLine size={22} />} label="Action required" value={counts.action_required} />
      <StatCard icon={<XCircle size={22} />} label="Rejected" value={counts.rejected} />
      <StatCard icon={<ShieldCheck size={22} />} label="Approved amount" value={formatTZS(approvedAmount)} />
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="stat-card">
      {icon}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function AdminReview({ application, onReview, notice }) {
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
  const location = [application.region, application.district].filter(Boolean).join(", ");

  return (
    <article className="review-panel">
      <div className="review-header">
        <div>
          <p className="eyebrow">Application #{application.id}</p>
          <h2>{application.full_name}</h2>
        </div>
        <div className="review-actions">
          <button type="button" className="print-button" onClick={() => window.print()}>
            Print form
          </button>
          <StatusCard application={application} />
        </div>
      </div>
      <DocumentHeader subtitle="SEHEMU YA PILI: FOMU YA USAJILI WA MWANACHAMA" />

      <Section title="TAARIFA ZA OFISI">
        <div className="three-col">
          <Field label="Namba ya Usajili" value={fields.office_registration_number} onChange={(v) => set("office_registration_number", v)} />
          <Field label="Tarehe ya Kupokea Fomu" type="date" value={fields.office_received_at} onChange={(v) => set("office_received_at", v)} />
          <Field label="Imepokelewa na" value={fields.office_received_by} onChange={(v) => set("office_received_by", v)} />
        </div>
        <div className="office-placeholder-grid">
          <Summary label="Sahihi" value="" />
        </div>
      </Section>

      <Section title="1. TAARIFA BINAFSI ZA MWANACHAMA">
        <div className="detail-grid">
          <Summary label="Jina Kamili" value={application.full_name} />
          <Summary label="Jinsia" value={application.gender} />
          <Summary label="Tarehe ya Kuzaliwa" value={formatDate(application.date_of_birth)} />
          <Summary label="Umri" value={application.age} />
          <Summary label="Namba ya Simu" value={application.phone_number} />
          <Summary label="Barua Pepe" value={application.email} />
          <Summary label="Namba ya NIDA" value={application.nida_number} />
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
        <p className="section-note">Mwanachama yupo kundi gani? Weka alama ya vema kwenye kundi lako.</p>
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

      <Section title="7. TAARIFA ZA DHARURA">
        <div className="detail-grid">
          <Summary label="Jina la Mtu wa Dharura" value={application.emergency_name} />
          <Summary label="Uhusiano" value={application.emergency_relationship} />
          <Summary label="Namba ya Simu" value={application.emergency_phone} />
          <Summary label="Anwani" value={application.emergency_address} />
        </div>
      </Section>

      <Section title="9. TAMKO LA MWANACHAMA">
        <DeclarationBlock name={application.full_name} date={formatDate(application.submitted_at || application.created_at)} readOnly accepted={application.declaration_accepted} />
      </Section>

      <Section title="10. MATUMIZI YA OFISI TU">
        <div className="detail-grid">
          <Summary label="Fomu imehakikiwa na" value="" />
          <Summary label="Cheo" value="" />
          <Summary label="Sahihi" value="" />
          <Summary label="Tarehe" value={formatDate(fields.office_received_at)} />
        </div>
        <TextArea label="Maoni ya Ofisi" value={fields.office_comments} onChange={(v) => set("office_comments", v)} />
        <TextArea label="Action required note" value={fields.action_required_note} onChange={(v) => set("action_required_note", v)} />
        <div className="form-actions">
          <button type="button" onClick={() => onReview("request_action", fields)}>Request action</button>
          <button type="button" onClick={() => onReview("reject", fields)}>Reject</button>
          <button type="button" className="primary" onClick={() => onReview("approve", fields)}>Approve</button>
        </div>
        {notice && <p className={notice.includes("not sent") ? "error" : "notice"}>{notice}</p>}
      </Section>
    </article>
  );
}

function ReadonlyRows({ rows, columns, emptyText }) {
  const visibleRows = Array.isArray(rows) ? rows : [];

  if (!visibleRows.length) {
    return <p className="muted">{emptyText}</p>;
  }

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

function DeclarationBlock({ name, date, accepted = false, onAcceptChange, readOnly = false }) {
  return (
    <div className="declaration-block">
      <p>
        Mimi <span>{name || ""}</span> nakubali kujiunga na TMA Family na nitazingatia masharti, kanuni na taratibu
        zote za huduma.
      </p>
      {readOnly ? (
        <div className="detail-grid">
          <Summary label="Tamko limekubaliwa" value={accepted ? "Ndiyo" : "Hapana"} />
          <Summary label="Tarehe" value={date} />
        </div>
      ) : (
        <label className="declaration-check">
          <input
            type="checkbox"
            checked={Boolean(accepted)}
            onChange={(event) => onAcceptChange(event.target.checked)}
          />
          <span>Nakubali tamko hili na ninathibitisha taarifa zote ni sahihi.</span>
        </label>
      )}
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

function ReadOnlyNames({ title, rows, field }) {
  const visibleRows = Array.isArray(rows) ? rows : [];

  return (
    <div className="name-lines">
      <span>{title}</span>
      {visibleRows.map((row, index) => (
        <strong key={index}>{row?.[field] || ""}</strong>
      ))}
    </div>
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

function Field({ label, value, onChange, type = "text", required = false, readOnly = false }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value ?? ""} required={required} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} />
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

function Select({ label, value, onChange, options, required = false }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value ?? ""} required={required} onChange={(event) => onChange(event.target.value)}>
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
          {columns.map(([field, , type, options, readOnly]) => {
            if (type === "select") {
              return (
                <select key={field} value={row[field] || ""} onChange={(event) => onChange(index, field, event.target.value)}>
                  {options.map(([optionValue, optionLabel]) => (
                    <option key={optionValue} value={optionValue}>{optionLabel}</option>
                  ))}
                </select>
              );
            }
            return (
              <input
                key={field}
                type={type || "text"}
                value={row[field] || ""}
                readOnly={Boolean(readOnly)}
                onChange={(event) => onChange(index, field, event.target.value)}
              />
            );
          })}
        </div>
      ))}
    </div>
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

function filledRowCount(rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    Object.values(row || {}).some((value) => String(value || "").trim()),
  ).length;
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isValidPhone(value) {
  const digits = digitsOnly(value);
  return digits.length >= 9 && digits.length <= 12;
}

function isValidNida(value) {
  return digitsOnly(value).length === 20;
}

function ageFromBirthdate(value) {
  if (!value) return "";
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? String(age) : "";
}

function validatePersonalStep(application) {
  const errors = [];
  if (!String(application.full_name || "").trim()) errors.push("Jina kamili linahitajika.");
  if (!application.gender) errors.push("Jinsia inahitajika.");
  if (!String(application.phone_number || "").trim()) errors.push("Namba ya simu inahitajika.");
  else if (!isValidPhone(application.phone_number)) errors.push("Namba ya simu si sahihi.");
  if (!String(application.email || "").trim()) errors.push("Barua pepe inahitajika.");
  else if (!isValidEmail(application.email)) errors.push("Barua pepe si sahihi.");
  if (!String(application.nida_number || "").trim()) errors.push("Namba ya NIDA inahitajika.");
  else if (!isValidNida(application.nida_number)) errors.push("Namba ya NIDA lazima iwe na tarakimu 20.");
  if (!String(application.residential_address || "").trim()) errors.push("Anwani ya makazi inahitajika.");
  if (!String(application.region || "").trim()) errors.push("Mkoa unahitajika.");
  if (!String(application.district || "").trim()) errors.push("Wilaya inahitajika.");
  if (!String(application.profession || "").trim()) errors.push("Kazi/profession inahitajika.");
  if (!String(application.education_level || "").trim()) errors.push("Kiwango cha elimu kinahitajika.");
  return errors;
}

function validateFamilyStep(application) {
  const errors = [];
  const parentCount = filledRowCount(application.parents);
  if (parentCount > 2) errors.push("Wazazi/walezi wasizidi wawili.");
  return errors;
}

function validateFinishStep(application) {
  const errors = [];
  if (!String(application.emergency_name || "").trim()) errors.push("Jina la mtu wa dharura linahitajika.");
  if (!String(application.emergency_relationship || "").trim()) errors.push("Uhusiano wa mtu wa dharura unahitajika.");
  if (!String(application.emergency_phone || "").trim()) errors.push("Namba ya simu ya dharura inahitajika.");
  else if (!isValidPhone(application.emergency_phone)) errors.push("Namba ya simu ya dharura si sahihi.");
  if (!String(application.emergency_address || "").trim()) errors.push("Anwani ya dharura inahitajika.");
  if (!application.declaration_accepted) errors.push("Lazima ukubali tamko la mwanachama kabla ya kuwasilisha.");
  return errors;
}

function validateFormStep(step, application) {
  if (step === 0) return validatePersonalStep(application);
  if (step === 1) return validateFamilyStep(application);
  if (step === 2) return validateFinishStep(application);
  return [];
}

function validateFullForm(application) {
  return [
    ...validatePersonalStep(application),
    ...validateFamilyStep(application),
    ...validateFinishStep(application),
  ];
}

function formatTZS(amount) {
  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

function memberGroupLabel(value) {
  return {
    youth: "Vijana 18-30",
    middle: "Rika la Kati 31-54",
    elder: "Wazee 55-100",
  }[value] || value;
}

function maritalStatusLabel(value) {
  return {
    single: "Mseja",
    married: "Nimeoa / Nimeolewa",
    widowed: "Mjane / Mgane",
    divorced: "Mtalaka",
  }[value] || value;
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
