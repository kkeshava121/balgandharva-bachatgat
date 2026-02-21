import { useState, useEffect, useCallback } from "react";

const MC = 1000, IR = 0.01, FINE_LATE = 50, FINE_OVERDUE = 100;
const fmt = (a) => "₹" + Number(a || 0).toLocaleString("en-IN");
const fmtD = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const gid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const td = () => new Date().toISOString().slice(0, 10);
const lastDay = (y, m) => new Date(y, m, 0).getDate();
const monthName = (m) => { const [y, mo] = m.split("-"); return new Date(y, mo - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" }); };

const calcFine = (payDate, forMonth) => {
  if (!payDate || !forMonth) return 0;
  const [fy, fm] = forMonth.split("-").map(Number);
  const pd = new Date(payDate + "T00:00:00");
  const py = pd.getFullYear(), pm = pd.getMonth() + 1, pday = pd.getDate();
  if (py === fy && pm === fm) return pday <= 10 ? 0 : FINE_LATE;
  if (py > fy || (py === fy && pm > fm)) return FINE_OVERDUE;
  return 0;
};

const fineLabel = (f) => f === 0 ? "On Time ✓" : f === FINE_LATE ? "Late (₹50)" : "Overdue (₹100)";
const tabs = ["Dashboard", "Members", "Loans", "Txns", "Remind"];

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl w-full max-w-md max-h-screen overflow-y-auto shadow-2xl">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  </div>
);

const Inp = ({ label, ...p }) => (
  <div className="mb-3">
    <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
    <input {...p} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
  </div>
);

const Sel = ({ label, children, ...p }) => (
  <div className="mb-3">
    <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
    <select {...p} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">{children}</select>
  </div>
);

const Btn = ({ children, variant = "primary", ...p }) => {
  const c = variant === "primary" ? "bg-emerald-600 hover:bg-emerald-700 text-white"
    : variant === "danger" ? "bg-red-500 hover:bg-red-600 text-white"
    : variant === "sms" ? "bg-blue-600 hover:bg-blue-700 text-white"
    : "bg-gray-200 hover:bg-gray-300 text-gray-700";
  return <button {...p} className={`${c} px-4 py-2 rounded-lg text-sm font-medium transition-colors ${p.className || ""}`}>{children}</button>;
};

const Stat = ({ label, value, icon, color }) => (
  <div className={`${color} rounded-xl p-4 text-white shadow-lg`}>
    <div className="text-2xl mb-1">{icon}</div>
    <div className="text-xs opacity-80 uppercase tracking-wide">{label}</div>
    <div className="text-xl font-bold mt-1">{value}</div>
  </div>
);

const groupByDate = (txns) => {
  const g = {};
  txns.forEach(t => { const k = t.date.slice(0, 10); if (!g[k]) g[k] = []; g[k].push(t); });
  return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
};

// ========== LOGIN SCREEN ==========
const LoginScreen = ({ onLogin }) => {
  const [mode, setMode] = useState(null); // null, 'admin', 'setup'
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [grpName, setGrpName] = useState("Bachat Gat");
  const [loading, setLoading] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("bachatgat_admin");
        setHasAdmin(r && r.value);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handleSetup = async () => {
    if (!newUser.trim() || !newPass.trim()) return setErr("Enter username and password");
    if (newPass.length < 4) return setErr("Password must be at least 4 characters");
    if (newPass !== confirmPass) return setErr("Passwords don't match");
    const admin = { username: newUser.trim(), password: newPass, groupName: grpName.trim() || "Bachat Gat" };
    await window.storage.set("bachatgat_admin", JSON.stringify(admin));
    onLogin(true, admin.groupName);
  };

  const handleLogin = async () => {
    try {
      const r = await window.storage.get("bachatgat_admin");
      if (r && r.value) {
        const admin = JSON.parse(r.value);
        if (user.trim() === admin.username && pass === admin.password) {
          onLogin(true, admin.groupName);
        } else { setErr("Wrong username or password"); }
      }
    } catch { setErr("Login failed"); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-emerald-600">Loading...</div></div>;

  // First time setup
  if (!hasAdmin && mode !== "setup") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-600 to-emerald-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
          <div className="text-5xl mb-4">🏦</div>
          <h1 className="text-xl font-bold text-gray-800 mb-1">Balgandharva</h1>
          <h2 className="text-lg text-gray-700 mb-1">Purush Bachat Gat</h2>
          <p className="text-gray-500 text-sm mb-6">Savings Group Management</p>
          <button onClick={() => setMode("setup")} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-colors mb-3">🔧 Setup Admin Account</button>
          <p className="text-xs text-gray-400">First time? Create admin to get started.</p>
        </div>
      </div>
    );
  }

  if (mode === "setup" || (!hasAdmin)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-600 to-emerald-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <h2 className="text-xl font-bold text-gray-800 mb-1">🔧 Admin Setup</h2>
          <p className="text-xs text-gray-500 mb-4">Create your admin account</p>
          {err && <div className="bg-red-50 text-red-600 text-xs p-2 rounded-lg mb-3">{err}</div>}
          <Inp label="Group Name" value={grpName} onChange={e => setGrpName(e.target.value)} placeholder="e.g. Jay Bhavani Bachat Gat" />
          <Inp label="Admin Username" value={newUser} onChange={e => { setNewUser(e.target.value); setErr(""); }} placeholder="e.g. admin" />
          <Inp label="Password" type="password" value={newPass} onChange={e => { setNewPass(e.target.value); setErr(""); }} placeholder="Min 4 characters" />
          <Inp label="Confirm Password" type="password" value={confirmPass} onChange={e => { setConfirmPass(e.target.value); setErr(""); }} placeholder="Re-enter password" />
          <button onClick={handleSetup} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 mt-2">Create Admin & Start</button>
        </div>
      </div>
    );
  }

  // Login / Guest screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-600 to-emerald-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏦</div>
          <h1 className="text-xl font-bold text-gray-800">Balgandharva</h1>
          <h2 className="text-base text-gray-700">Purush Bachat Gat</h2>
        </div>

        {mode === "admin" ? (
          <div>
            <h3 className="font-bold text-gray-700 mb-3">🔐 Admin Login</h3>
            {err && <div className="bg-red-50 text-red-600 text-xs p-2 rounded-lg mb-3">{err}</div>}
            <Inp label="Username" value={user} onChange={e => { setUser(e.target.value); setErr(""); }} placeholder="Enter username" />
            <Inp label="Password" type="password" value={pass} onChange={e => { setPass(e.target.value); setErr(""); }} placeholder="Enter password" />
            <button onClick={handleLogin} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 mb-3">Login as Admin</button>
            <button onClick={() => { setMode(null); setErr(""); }} className="w-full text-gray-500 text-sm underline">← Back</button>
          </div>
        ) : (
          <div className="space-y-3">
            <button onClick={() => setMode("admin")} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-base hover:bg-emerald-700">🔐 Admin Login</button>
            <button onClick={async () => {
              try {
                const r = await window.storage.get("bachatgat_admin");
                const gn = r && r.value ? JSON.parse(r.value).groupName : "Bachat Gat";
                onLogin(false, gn);
              } catch { onLogin(false, "Bachat Gat"); }
            }} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-base hover:bg-gray-200">
              👁️ View as Member
            </button>
            <p className="text-xs text-gray-400 text-center">Members can view all data. Only admin can add/edit.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ========== MAIN APP ==========
export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [groupName, setGroupName] = useState("Bachat Gat");
  const [tab, setTab] = useState("Dashboard");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (!loggedIn) return;
    (async () => {
      try {
        const r = await window.storage.get("bachatgat_data");
        if (r && r.value) setData(JSON.parse(r.value));
        else setData({ members: [], loans: [], transactions: [] });
      } catch { setData({ members: [], loans: [], transactions: [] }); }
      setLoading(false);
    })();
  }, [loggedIn]);

  const save = useCallback(async (nd) => {
    setData(nd);
    try { await window.storage.set("bachatgat_data", JSON.stringify(nd)); } catch (e) { console.error(e); }
  }, []);

  const addTx = useCallback((tx, d) => ({ ...d, transactions: [{ id: gid(), ...tx }, ...d.transactions] }), []);

  if (!loggedIn) return <LoginScreen onLogin={(admin, gn) => { setIsAdmin(admin); setGroupName(gn); setLoggedIn(true); }} />;
  if (loading || !data) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-emerald-600">Loading...</div></div>;

  const { members, loans, transactions } = data;
  const totalContrib = transactions.filter(t => t.type === "contribution").reduce((s, t) => s + t.amount, 0);
  const totalInt = transactions.filter(t => t.type === "interest").reduce((s, t) => s + t.amount, 0);
  const totalFines = transactions.filter(t => t.type === "fine").reduce((s, t) => s + t.amount, 0);
  const totalRepaid = transactions.filter(t => t.type === "repayment").reduce((s, t) => s + t.amount, 0);
  const totalLoansGiven = loans.reduce((s, l) => s + l.principal, 0);
  const activeLoans = loans.filter(l => l.remaining > 0);
  const totalOutstanding = activeLoans.reduce((s, l) => s + l.remaining, 0);
  const fundBalance = totalContrib + totalInt + totalFines - totalLoansGiven + totalRepaid;
  const getMemberLoans = (mid) => loans.filter(l => l.memberId === mid && l.remaining > 0);
  const getMemberOutstanding = (mid) => getMemberLoans(mid).reduce((s, l) => s + l.remaining, 0);
  const hasPaidMonth = (mid, month) => transactions.some(t => t.type === "contribution" && t.memberId === mid && t.month === month);

  const txIcon = (t) => ({ contribution: "💵", interest: "%", loan_issued: "📝", fine: "⚠️", repayment: "🔄" }[t] || "•");
  const txColor = (t) => ({ contribution: "bg-emerald-100", interest: "bg-purple-100", loan_issued: "bg-orange-100", fine: "bg-red-100", repayment: "bg-blue-100" }[t]);
  const txTxt = (t) => ({ contribution: "text-emerald-600", interest: "text-purple-600", loan_issued: "text-orange-600", fine: "text-red-600", repayment: "text-emerald-600" }[t]);
  const txBadge = (t) => ({ contribution: "CTR", interest: "INT", loan_issued: "LOAN", fine: "FINE", repayment: "RPY" }[t]);
  const txBadgeBg = (t) => ({ contribution: "bg-emerald-500", interest: "bg-purple-500", loan_issued: "bg-orange-500", fine: "bg-red-500", repayment: "bg-blue-500" }[t]);

  // ===== MODALS (Admin only) =====
  const AddMemberModal = () => {
    const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [jd, setJd] = useState(td());
    return <Modal title="Add Member" onClose={() => setModal(null)}>
      <Inp label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ramesh Patil" />
      <Inp label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 9876543210" />
      <Inp label="Joining Date" type="date" value={jd} onChange={e => setJd(e.target.value)} />
      <div className="flex gap-2 mt-4">
        <Btn onClick={() => { if (!name.trim()) return alert("Enter name"); save({ ...data, members: [...members, { id: gid(), name: name.trim(), phone: phone.trim(), joinDate: jd + "T00:00:00" }] }); setModal(null); }}>Add</Btn>
        <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
      </div>
    </Modal>;
  };

  const CollectModal = () => {
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [txDate, setTxDate] = useState(td());
    const [md, setMd] = useState(() => members.map(m => {
      const out = getMemberOutstanding(m.id);
      return { id: m.id, name: m.name, sel: true, contrib: MC, interest: Math.round(out * IR), fine: calcFine(td(), new Date().toISOString().slice(0, 7)), outstanding: out, hasLoan: out > 0 };
    }));
    const recalc = (date, mo) => setMd(p => p.map(m => ({ ...m, fine: m.sel ? calcFine(date, mo) : 0 })));
    const toggle = (id) => setMd(p => p.map(m => m.id === id ? { ...m, sel: !m.sel } : m));
    const upd = (id, f, v) => setMd(p => p.map(m => m.id === id ? { ...m, [f]: Number(v) || 0 } : m));
    const sel = md.filter(m => m.sel);
    const tC = sel.reduce((s, m) => s + m.contrib, 0), tI = sel.reduce((s, m) => s + m.interest, 0), tF = sel.reduce((s, m) => s + m.fine, 0);
    return <Modal title="Monthly Collection" onClose={() => setModal(null)}>
      <Inp label="Payment Date" type="date" value={txDate} onChange={e => { setTxDate(e.target.value); recalc(e.target.value, month); }} />
      <Inp label="For Month" type="month" value={month} onChange={e => { setMonth(e.target.value); recalc(txDate, e.target.value); }} />
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3 text-xs text-blue-800">1st-10th: No fine • 11th-{month ? lastDay(...month.split("-").map(Number)) : "30"}th: ₹50 • After: ₹100</div>
      {sel.length > 0 && <div className={`rounded-lg p-2 mb-3 text-xs font-bold text-center ${sel[0]?.fine === 0 ? "bg-emerald-50 text-emerald-700" : sel[0]?.fine === FINE_LATE ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"}`}>{fineLabel(sel[0]?.fine || 0)}</div>}
      <div className="flex gap-2 mb-2"><button className="text-xs text-emerald-600 underline" onClick={() => setMd(p => p.map(m => ({ ...m, sel: true })))}>All</button><button className="text-xs text-gray-500 underline" onClick={() => setMd(p => p.map(m => ({ ...m, sel: false })))}>Clear</button></div>
      <div className="max-h-52 overflow-y-auto border rounded-lg mb-4">
        {md.map(m => (
          <div key={m.id} className={`border-b last:border-b-0 px-3 py-2.5 ${m.sel ? "bg-white" : "bg-gray-50 opacity-50"}`}>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={m.sel} onChange={() => toggle(m.id)} className="accent-emerald-600" /><span className="text-sm font-medium flex-1">{m.name}</span></label>
            {m.sel && (<div className="ml-6 mt-2 space-y-1.5">
              <div className="flex items-center gap-2"><span className="text-xs text-gray-500 w-24">Contribution:</span><input type="number" value={m.contrib} onChange={e => upd(m.id, "contrib", e.target.value)} className="border rounded px-2 py-1 text-xs w-20 outline-none" /></div>
              {m.hasLoan && <div><div className="flex items-center gap-2"><span className="text-xs text-gray-500 w-24">Interest:</span><input type="number" value={m.interest} onChange={e => upd(m.id, "interest", e.target.value)} className="border rounded px-2 py-1 text-xs w-20 outline-none" /></div><div className="text-xs text-orange-500 mt-0.5 ml-24">Loan: {fmt(m.outstanding)}</div></div>}
              {!m.hasLoan && <div className="text-xs text-emerald-500">No loan</div>}
              <div className="flex items-center gap-2"><span className="text-xs text-gray-500 w-24">Fine:</span><input type="number" value={m.fine} onChange={e => upd(m.id, "fine", e.target.value)} className={`border rounded px-2 py-1 text-xs w-20 outline-none ${m.fine > 0 ? "border-red-300 bg-red-50" : ""}`} /></div>
              <div className="text-xs font-bold text-gray-700 pt-1 border-t border-dashed">Total: {fmt(m.contrib + m.interest + m.fine)}</div>
            </div>)}
          </div>
        ))}
      </div>
      <div className="bg-emerald-50 rounded-lg p-3 mb-4 text-sm space-y-1">
        <div className="flex justify-between"><span>Contributions ({sel.length}):</span><span className="font-bold">{fmt(tC)}</span></div>
        <div className="flex justify-between"><span>Interest:</span><span className="font-bold text-purple-600">{fmt(tI)}</span></div>
        <div className="flex justify-between"><span>Fines:</span><span className="font-bold text-red-600">{fmt(tF)}</span></div>
        <div className="flex justify-between border-t pt-1"><span className="font-bold">Total:</span><span className="font-bold text-emerald-700 text-lg">{fmt(tC + tI + tF)}</span></div>
      </div>
      <Btn onClick={() => {
        if (!sel.length || !txDate) return alert("Select members & date");
        let nd = { ...data };
        sel.forEach(m => {
          if (m.contrib > 0) nd = addTx({ type: "contribution", memberId: m.id, memberName: m.name, amount: m.contrib, month, date: txDate + "T00:00:00", desc: `Contribution for ${month}` }, nd);
          if (m.interest > 0) { nd = addTx({ type: "interest", memberId: m.id, memberName: m.name, amount: m.interest, month, date: txDate + "T00:00:00", desc: `Interest on loan (${fmt(m.outstanding)})` }, nd); let rem = m.interest; nd = { ...nd, loans: nd.loans.map(l => { if (l.memberId === m.id && l.remaining > 0 && rem > 0) { const p = Math.min(rem, Math.round(l.remaining * IR)); rem -= p; return { ...l, totalInterestPaid: (l.totalInterestPaid || 0) + p }; } return l; }) }; }
          if (m.fine > 0) nd = addTx({ type: "fine", memberId: m.id, memberName: m.name, amount: m.fine, month, date: txDate + "T00:00:00", desc: `${m.fine >= FINE_OVERDUE ? "Overdue" : "Late"} fine for ${month}` }, nd);
        }); save(nd); setModal(null);
      }} className="w-full">Collect {fmt(tC + tI + tF)}</Btn>
    </Modal>;
  };

  const LoanModal = () => {
    const [mid, setMid] = useState(""); const [amt, setAmt] = useState(""); const [note, setNote] = useState(""); const [ld, setLd] = useState(td());
    return <Modal title="Issue Loan" onClose={() => setModal(null)}>
      <Inp label="Loan Date" type="date" value={ld} onChange={e => setLd(e.target.value)} />
      <Sel label="Member" value={mid} onChange={e => setMid(e.target.value)}><option value="">Select</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Sel>
      <Inp label="Amount (₹)" type="number" value={amt} onChange={e => setAmt(e.target.value)} placeholder="e.g. 5000" />
      <Inp label="Note" value={note} onChange={e => setNote(e.target.value)} placeholder="Purpose" />
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800 mb-4">1%/month = {fmt(Number(amt) * IR)}/month</div>
      <Btn onClick={() => {
        if (!mid || !amt || Number(amt) <= 0) return alert("Fill all fields");
        const mem = members.find(m => m.id === mid);
        const loan = { id: gid(), memberId: mid, memberName: mem.name, principal: Number(amt), remaining: Number(amt), interest: IR, date: ld + "T00:00:00", note, totalInterestPaid: 0 };
        let nd = { ...data, loans: [...loans, loan] };
        nd = addTx({ type: "loan_issued", memberId: mid, memberName: mem.name, amount: Number(amt), loanId: loan.id, date: ld + "T00:00:00", desc: `Loan issued${note ? ": " + note : ""}` }, nd);
        save(nd); setModal(null);
      }}>Issue Loan</Btn>
    </Modal>;
  };

  const RepayModal = ({ loan }) => {
    const [amt, setAmt] = useState(""); const [rd, setRd] = useState(td());
    return <Modal title={`Repay - ${loan.memberName}`} onClose={() => setModal(null)}>
      <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1">
        <div>Loan: {fmt(loan.principal)} • {fmtD(loan.date)}</div>
        <div>Outstanding: <span className="font-bold text-red-600">{fmt(loan.remaining)}</span></div>
        <div>Interest Paid: <span className="font-bold text-purple-600">{fmt(loan.totalInterestPaid || 0)}</span></div>
      </div>
      <Inp label="Date" type="date" value={rd} onChange={e => setRd(e.target.value)} />
      <Inp label="Amount (₹)" type="number" value={amt} onChange={e => setAmt(e.target.value)} placeholder={`Max: ${loan.remaining}`} />
      {Number(amt) > 0 && <div className="text-xs mb-3 bg-emerald-50 p-2 rounded-lg">After: {fmt(Math.max(0, loan.remaining - Number(amt)))} {Number(amt) >= loan.remaining && <span className="text-emerald-700 font-bold">✓ Paid!</span>}</div>}
      <Btn onClick={() => {
        const a = Number(amt); if (!a || a <= 0 || a > loan.remaining) return alert("Invalid amount");
        const nR = Math.max(0, loan.remaining - a);
        let nd = { ...data, loans: loans.map(l => l.id === loan.id ? { ...l, remaining: nR } : l) };
        nd = addTx({ type: "repayment", memberId: loan.memberId, memberName: loan.memberName, amount: a, loanId: loan.id, date: rd + "T00:00:00", desc: `Principal repayment (Rem: ${fmt(nR)})` }, nd);
        save(nd); setModal(null);
      }}>Record Repayment</Btn>
    </Modal>;
  };

  // ===== READ-ONLY BANNER =====
  const ReadOnlyBanner = () => !isAdmin ? (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-4 text-xs text-blue-700 text-center font-medium">👁️ View Only Mode — Login as admin to add/edit data</div>
  ) : null;

  // ===== DASHBOARD =====
  const Dashboard = () => (
    <div>
      <ReadOnlyBanner />
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Stat label="Total Fund" value={fmt(fundBalance)} icon="💰" color="bg-emerald-600" />
        <Stat label="Members" value={members.length} icon="👥" color="bg-blue-600" />
        <Stat label="Active Loans" value={activeLoans.length} icon="📋" color="bg-orange-500" />
        <Stat label="Interest Earned" value={fmt(totalInt)} icon="📈" color="bg-purple-600" />
        <Stat label="Outstanding" value={fmt(totalOutstanding)} icon="⏳" color="bg-red-500" />
        <Stat label="Fines" value={fmt(totalFines)} icon="⚠️" color="bg-yellow-600" />
      </div>
      {isAdmin && <div className="flex gap-2 flex-wrap mb-4">
        <Btn onClick={() => setModal("collect")}>💵 Collect</Btn>
        <Btn onClick={() => setModal("loan")}>📝 Loan</Btn>
        <Btn onClick={() => setModal("addMember")}>➕ Member</Btn>
      </div>}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 mb-4">
        <div className="font-bold mb-1">📋 Payment Rules</div>
        <div>✅ 1st-10th: No fine • ⚠️ 11th-Month end: ₹50 • 🚫 After month: ₹100</div>
      </div>
      {activeLoans.length > 0 && <div className="mb-4"><h3 className="font-bold text-gray-700 mb-3">Active Loans</h3>
        {activeLoans.map(l => (
          <div key={l.id} className="bg-white border rounded-xl p-3 mb-2 shadow-sm flex justify-between items-center">
            <div><div className="font-medium text-sm">{l.memberName}</div><div className="text-xs text-gray-500">{fmt(l.remaining)} • Int: {fmt(Math.round(l.remaining * IR))}/mo</div></div>
            {isAdmin && <Btn onClick={() => setModal({ type: "repay", loan: l })} className="text-xs">Repay</Btn>}
          </div>
        ))}
      </div>}
      {transactions.length > 0 && <div><h3 className="font-bold text-gray-700 mb-3">Recent</h3>
        {transactions.slice(0, 6).map(t => (
          <div key={t.id} className="flex justify-between items-center py-2 border-b text-sm">
            <div><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${txBadgeBg(t.type)}`}></span><span className="font-medium">{t.memberName}</span></div>
              <div className="text-xs text-gray-400 ml-4">{fmtD(t.date)} • {t.desc}</div></div>
            <span className={`font-bold text-xs ${txTxt(t.type)}`}>{t.type === "loan_issued" ? "-" : "+"}{fmt(t.amount)}</span>
          </div>
        ))}
      </div>}
    </div>
  );

  // ===== MEMBERS =====
  const Members = () => {
    const [exp, setExp] = useState(null);
    return <div>
      <ReadOnlyBanner />
      <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-700">{members.length} Members</h3>{isAdmin && <Btn onClick={() => setModal("addMember")}>➕ Add</Btn>}</div>
      {members.length === 0 && <div className="text-center text-gray-400 py-10">No members yet.</div>}
      {members.map(m => {
        const c = transactions.filter(t => t.type === "contribution" && t.memberId === m.id).reduce((s, t) => s + t.amount, 0);
        const i = transactions.filter(t => t.type === "interest" && t.memberId === m.id).reduce((s, t) => s + t.amount, 0);
        const f = transactions.filter(t => t.type === "fine" && t.memberId === m.id).reduce((s, t) => s + t.amount, 0);
        const out = getMemberOutstanding(m.id);
        const mtx = transactions.filter(t => t.memberId === m.id);
        const open = exp === m.id;
        return <div key={m.id} className="bg-white border rounded-xl mb-3 shadow-sm overflow-hidden">
          <div className="p-4 cursor-pointer" onClick={() => setExp(open ? null : m.id)}>
            <div className="flex justify-between items-start">
              <div><div className="font-bold text-gray-800">{m.name}</div>{m.phone && <div className="text-xs text-gray-400">{m.phone}</div>}<div className="text-xs text-gray-500 mt-1">Joined: {fmtD(m.joinDate)}</div></div>
              <div className="flex items-center gap-2"><span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
                {isAdmin && <button onClick={e => { e.stopPropagation(); if (confirm(`Remove ${m.name}?`)) save({ ...data, members: members.filter(x => x.id !== m.id) }); }} className="text-red-400 text-xs">✕</button>}</div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              <span className="text-emerald-600 font-medium">Contrib: {fmt(c)}</span><span className="text-purple-600 font-medium">Interest: {fmt(i)}</span>
              {f > 0 && <span className="text-red-500 font-medium">Fines: {fmt(f)}</span>}{out > 0 && <span className="text-orange-600 font-medium">Loan: {fmt(out)}</span>}
            </div>
          </div>
          {open && mtx.length > 0 && (<div className="border-t bg-gray-50 px-4 py-3"><div className="text-xs font-bold text-gray-500 mb-2">HISTORY</div>
            {mtx.map(t => (<div key={t.id} className="flex justify-between text-xs py-1.5 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-1 flex-1 min-w-0"><span className="text-gray-500 shrink-0">{fmtD(t.date)}</span><span className={`${txBadgeBg(t.type)} px-1 py-0.5 rounded text-white text-xs shrink-0`}>{txBadge(t.type)}</span><span className="text-gray-400 truncate">{t.desc}</span></div>
              <span className={`font-bold shrink-0 ml-2 ${txTxt(t.type)}`}>{t.type === "loan_issued" ? "-" : "+"}{fmt(t.amount)}</span>
            </div>))}
          </div>)}
        </div>;
      })}
    </div>;
  };

  // ===== LOANS =====
  const LoansTab = () => {
    const [exp, setExp] = useState(null);
    return <div>
      <ReadOnlyBanner />
      <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-700">Loans</h3>{isAdmin && <Btn onClick={() => setModal("loan")}>📝 New</Btn>}</div>
      {loans.length === 0 && <div className="text-center text-gray-400 py-10">No loans.</div>}
      {loans.map(l => {
        const ltx = transactions.filter(t => t.loanId === l.id || (t.type === "interest" && t.memberId === l.memberId));
        const open = exp === l.id;
        return <div key={l.id} className={`bg-white border rounded-xl mb-3 shadow-sm overflow-hidden ${l.remaining === 0 ? "opacity-60" : ""}`}>
          <div className="p-4 cursor-pointer" onClick={() => setExp(open ? null : l.id)}>
            <div className="flex justify-between items-start">
              <div><div className="font-bold text-gray-800">{l.memberName}</div><div className="text-xs text-gray-500">{fmtD(l.date)} {l.note && `• ${l.note}`}</div></div>
              <div className="flex items-center gap-2">
                {l.remaining === 0 ? <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full">Paid</span>
                  : isAdmin && <Btn onClick={e => { e.stopPropagation(); setModal({ type: "repay", loan: l }); }} className="text-xs">Repay</Btn>}
                <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-400">Principal</span><div className="font-bold">{fmt(l.principal)}</div></div>
              <div><span className="text-gray-400">Outstanding</span><div className="font-bold text-red-600">{fmt(l.remaining)}</div></div>
              <div><span className="text-gray-400">Int Paid</span><div className="font-bold text-purple-600">{fmt(l.totalInterestPaid || 0)}</div></div>
              <div><span className="text-gray-400">Int/mo</span><div className="font-bold text-orange-600">{fmt(Math.round(l.remaining * IR))}</div></div>
            </div>
            <div className="mt-2 bg-gray-100 rounded-full h-2"><div className="bg-emerald-500 h-full rounded-full" style={{ width: `${((l.principal - l.remaining) / l.principal) * 100}%` }}></div></div>
          </div>
          {open && ltx.length > 0 && (<div className="border-t bg-gray-50 px-4 py-3"><div className="text-xs font-bold text-gray-500 mb-2">HISTORY</div>
            {ltx.map(t => (<div key={t.id} className="flex justify-between text-xs py-1.5 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-1"><span className="text-gray-500">{fmtD(t.date)}</span><span className={`${txBadgeBg(t.type)} px-1 py-0.5 rounded text-white text-xs`}>{txBadge(t.type)}</span><span className="text-gray-400">{t.desc}</span></div>
              <span className={`font-bold ${txTxt(t.type)}`}>{t.type === "loan_issued" ? "-" : "+"}{fmt(t.amount)}</span>
            </div>))}
          </div>)}
        </div>;
      })}
    </div>;
  };

  // ===== TRANSACTIONS =====
  const TxnTab = () => {
    const [filter, setFilter] = useState("all"); const [df, setDf] = useState(""); const [dt, setDt] = useState("");
    let fil = filter === "all" ? transactions : transactions.filter(t => t.type === filter);
    if (df) fil = fil.filter(t => t.date.slice(0, 10) >= df); if (dt) fil = fil.filter(t => t.date.slice(0, 10) <= dt);
    const grouped = groupByDate(fil);
    return <div>
      <ReadOnlyBanner />
      <h3 className="font-bold text-gray-700 mb-3">Transactions</h3>
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {[["all", "All"], ["contribution", "Contrib"], ["interest", "Interest"], ["fine", "Fines"], ["loan_issued", "Loans"], ["repayment", "Repay"]].map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)} className={`text-xs px-2.5 py-1.5 rounded-full font-medium ${filter === k ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}>{v}</button>
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        <div className="flex-1"><label className="text-xs text-gray-500">From</label><input type="date" value={df} onChange={e => setDf(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-xs" /></div>
        <div className="flex-1"><label className="text-xs text-gray-500">To</label><input type="date" value={dt} onChange={e => setDt(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-xs" /></div>
        {(df || dt) && <button onClick={() => { setDf(""); setDt(""); }} className="text-xs text-red-500 self-end pb-2">Clear</button>}
      </div>
      {grouped.length === 0 && <div className="text-center text-gray-400 py-10">No transactions.</div>}
      {grouped.map(([date, txns]) => (
        <div key={date} className="mb-4">
          <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg mb-2 flex justify-between"><span>{fmtD(date + "T00:00:00")}</span><span>{txns.length} txn{txns.length > 1 ? "s" : ""}</span></div>
          {txns.map(t => (
            <div key={t.id} className="flex justify-between items-center py-2.5 px-2 border-b bg-white">
              <div className="flex items-start gap-2"><div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${txColor(t.type)}`}>{txIcon(t.type)}</div>
                <div><div className="font-medium text-sm">{t.memberName}</div><div className="text-xs text-gray-400">{t.desc}</div></div></div>
              <div className={`font-bold text-sm ${txTxt(t.type)}`}>{t.type === "loan_issued" ? "-" : "+"}{fmt(t.amount)}</div>
            </div>
          ))}
        </div>
      ))}
    </div>;
  };

  // ===== REMINDERS (Admin only) =====
  const Reminders = () => {
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [sent, setSent] = useState({});
    const currentFine = calcFine(td(), month);
    const memberDetails = members.map(m => {
      const paid = hasPaidMonth(m.id, month); const out = getMemberOutstanding(m.id); const interest = Math.round(out * IR);
      const fine = calcFine(td(), month); return { ...m, paid, outstanding: out, interest, fine, total: MC + interest + fine, hasLoan: out > 0 };
    });
    const unpaid = memberDetails.filter(m => !m.paid), paidL = memberDetails.filter(m => m.paid);

    const buildSMS = (m) => {
      let msg = `Dear ${m.name},\n\nReminder from ${groupName} for ${monthName(month)}.\n\n📋 Payment Details:\n• Contribution: ${fmt(MC)}\n`;
      if (m.hasLoan) msg += `• Loan Interest (1%): ${fmt(m.interest)}\n  (Outstanding: ${fmt(m.outstanding)})\n`;
      if (m.fine > 0) msg += `• ${m.fine === FINE_LATE ? "Late" : "Overdue"} Fine: ${fmt(m.fine)}\n`;
      msg += `\n💰 Total: ${fmt(m.total)}\n\n`;
      if (m.fine === 0) msg += `⏰ Pay before 10th to avoid ₹50 fine.\n`;
      else if (m.fine === FINE_LATE) msg += `⚠️ Late! ₹50 fine. Pay before month end to avoid ₹100.\n`;
      else msg += `🚫 Overdue! ₹100 fine. Pay immediately.\n`;
      return msg + `\n🙏 Thank you!\n- ${groupName}`;
    };

    const openSMS = (ph, msg) => { window.open(`sms:${ph.replace(/[^0-9]/g, "")}?body=${encodeURIComponent(msg)}`, "_blank"); };

    if (!isAdmin) return <div><ReadOnlyBanner /><div className="text-center text-gray-400 py-10">Only admin can send reminders.</div></div>;

    return <div>
      <h3 className="font-bold text-gray-700 mb-3">📩 Send Reminders</h3>
      <Inp label="For Month" type="month" value={month} onChange={e => { setMonth(e.target.value); setSent({}); }} />
      <div className={`rounded-lg p-3 mb-4 text-sm ${currentFine === 0 ? "bg-emerald-50 border border-emerald-200" : currentFine === FINE_LATE ? "bg-yellow-50 border border-yellow-200" : "bg-red-50 border border-red-200"}`}>
        <div className="font-bold">{monthName(month)}</div>
        <div className="text-xs mt-1">{currentFine === 0 ? "✅ Within due date. No fine." : currentFine === FINE_LATE ? "⚠️ Late period. ₹50 fine." : "🚫 Overdue! ₹100 fine."}</div>
        <div className="flex gap-4 mt-2 text-xs"><span className="text-red-600 font-bold">Unpaid: {unpaid.length}</span><span className="text-emerald-600 font-bold">Paid: {paidL.length}</span></div>
      </div>
      {unpaid.length > 0 && <div className="mb-4">
        <Btn variant="sms" onClick={() => unpaid.forEach((m, i) => { if (m.phone) setTimeout(() => { openSMS(m.phone, buildSMS(m)); setSent(p => ({ ...p, [m.id]: true })); }, i * 800); })} className="w-full mb-2">📱 SMS All Unpaid ({unpaid.length})</Btn>
        <div className="text-xs text-gray-500 text-center">Opens SMS app for each member</div>
      </div>}
      {unpaid.length > 0 && <div className="mb-4"><div className="text-xs font-bold text-red-600 uppercase mb-2">❌ Unpaid ({unpaid.length})</div>
        {unpaid.map(m => (
          <div key={m.id} className="bg-white border rounded-xl p-3 mb-2 shadow-sm">
            <div className="flex justify-between items-start"><div><div className="font-bold text-sm">{m.name}</div>{m.phone && <div className="text-xs text-gray-400">{m.phone}</div>}</div>
              <div className="text-right"><div className="font-bold text-emerald-700">{fmt(m.total)}</div>{sent[m.id] && <span className="text-xs text-blue-500">Sent ✓</span>}</div></div>
            <div className="mt-2 text-xs space-y-0.5">
              <div className="flex justify-between"><span className="text-gray-500">Contribution:</span><span>{fmt(MC)}</span></div>
              {m.hasLoan && <div className="flex justify-between"><span className="text-purple-600">Interest:</span><span>{fmt(m.interest)}</span></div>}
              {m.fine > 0 && <div className="flex justify-between"><span className="text-red-500">Fine:</span><span className="font-bold text-red-600">{fmt(m.fine)}</span></div>}
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => { if (m.phone) openSMS(m.phone, buildSMS(m)); else alert("No phone!"); }} className="flex-1 bg-blue-600 text-white text-xs py-2 rounded-lg font-medium">📱 SMS</button>
              <button onClick={() => { navigator.clipboard.writeText(buildSMS(m)); alert("Copied!"); }} className="flex-1 bg-gray-200 text-gray-700 text-xs py-2 rounded-lg font-medium">📋 Copy</button>
            </div>
            <details className="mt-2"><summary className="text-xs text-blue-600 cursor-pointer">Preview</summary><pre className="text-xs bg-gray-50 p-2 rounded mt-1 whitespace-pre-wrap text-gray-600 border">{buildSMS(m)}</pre></details>
          </div>
        ))}
      </div>}
      {paidL.length > 0 && <div><div className="text-xs font-bold text-emerald-600 uppercase mb-2">✅ Paid ({paidL.length})</div>
        {paidL.map(m => (<div key={m.id} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-2 flex justify-between items-center">
          <div><div className="font-medium text-sm">{m.name}</div></div><span className="text-emerald-600 text-xs font-bold">✓ Paid</span></div>))}
      </div>}
    </div>;
  };

  const visibleTabs = isAdmin ? tabs : tabs.filter(t => t !== "Remind");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-700 text-white px-4 py-3 shadow-lg flex justify-between items-center">
        <div><h1 className="text-lg font-bold">🏦 {groupName}</h1><p className="text-xs text-emerald-200">{isAdmin ? "👑 Admin" : "👁️ Member View"}</p></div>
        <button onClick={() => { setLoggedIn(false); setIsAdmin(false); setTab("Dashboard"); setData(null); setLoading(true); }} className="text-xs bg-emerald-800 px-3 py-1.5 rounded-lg hover:bg-emerald-900">Logout</button>
      </div>
      <div className="p-4 pb-24">
        {tab === "Dashboard" && <Dashboard />}
        {tab === "Members" && <Members />}
        {tab === "Loans" && <LoansTab />}
        {tab === "Txns" && <TxnTab />}
        {tab === "Remind" && isAdmin && <Reminders />}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex shadow-lg">
        {visibleTabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-center text-xs font-medium ${tab === t ? "text-emerald-600 border-t-2 border-emerald-600 bg-emerald-50" : "text-gray-400"}`}>
            {t === "Dashboard" ? "🏠" : t === "Members" ? "👥" : t === "Loans" ? "📋" : t === "Txns" ? "📊" : "📩"}
            <div>{t}</div>
          </button>
        ))}
      </div>
      {isAdmin && modal === "addMember" && <AddMemberModal />}
      {isAdmin && modal === "collect" && <CollectModal />}
      {isAdmin && modal === "loan" && <LoanModal />}
      {isAdmin && modal?.type === "repay" && <RepayModal loan={modal.loan} />}
    </div>
  );
}
