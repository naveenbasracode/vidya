// Upload curriculum PDFs for Maths, English, Verbal and Quantitative (FR7).
import { useRef, useState } from 'react';
import { Button, InlineNotification, Select, SelectItem, Stack, Tile } from '@carbon/react';
import { TrashCan, Upload } from '@carbon/icons-react';
import { api } from '../../api.js';
import { useLoad } from '../../hooks.js';
import { Busy, EmptyState, ErrorNote, PageTitle, SubjectChip } from '../../components/common.jsx';
import { SUBJECTS, SUBJECT_KEYS } from '../../utils.js';

export default function AdminDocuments() {
  const { data, error, loading, reload } = useLoad(() => api('/admin/documents'), []);
  const [subject, setSubject] = useState('MATHS');
  const [grade, setGrade] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('subject', subject);
      if (grade) form.append('grade', grade);
      const r = await api('/admin/documents', { method: 'POST', form });
      setMsg(r.warning ? { kind: 'warning', text: r.warning } : { kind: 'success', text: `Uploaded “${r.document.originalName}” (${r.document.pageCount} pages).` });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      reload();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (doc) => {
    if (!window.confirm(`Delete “${doc.originalName}”?`)) return;
    try {
      await api(`/admin/documents/${doc.id}`, { method: 'DELETE' });
      reload();
    } catch (e) {
      setErr(e.message);
    }
  };

  const download = async (doc) => {
    // fetch with auth header, then hand the file to the browser
    const res = await fetch(`/api/admin/documents/${doc.id}/file`, { headers: { Authorization: `Bearer ${localStorage.getItem('vidya.token')}` } });
    if (!res.ok) return setErr('Could not download the file.');
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.originalName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageTitle emoji="📄" title="Curriculum PDFs" subtitle="Students and parents can generate practice questions from these PDFs by topic." />
      <ErrorNote error={error || err} onClose={err ? () => setErr(null) : undefined} />
      {msg && <InlineNotification kind={msg.kind} lowContrast title={msg.text} onClose={() => setMsg(null)} className="note" />}
      <Tile className="section-tile">
        <h2>⬆️ Upload a PDF</h2>
        <Stack gap={5} className="upload-form">
          <div className="inline-fields">
            <Select id="doc-subject" labelText="Subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
              {SUBJECT_KEYS.map((s) => (
                <SelectItem key={s} value={s} text={`${SUBJECTS[s].emoji} ${SUBJECTS[s].label}`} />
              ))}
            </Select>
            <Select id="doc-grade" labelText="Grade (optional)" value={grade} onChange={(e) => setGrade(e.target.value)}>
              <SelectItem value="" text="Any grade" />
              <SelectItem value="5" text="Grade 5" />
              <SelectItem value="6" text="Grade 6" />
              <SelectItem value="7" text="Grade 7" />
            </Select>
          </div>
          <div>
            <label className="cds--label" htmlFor="doc-file">
              PDF file (max 25 MB)
            </label>
            <input id="doc-file" ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <Button renderIcon={Upload} onClick={upload} disabled={!file || busy}>
            {busy ? 'Uploading & reading…' : 'Upload'}
          </Button>
        </Stack>
      </Tile>
      <Tile className="section-tile">
        <h2>📚 Uploaded PDFs</h2>
        {loading && !data && <Busy />}
        {data && data.documents.length === 0 && (
          <EmptyState emoji="📭" title="No PDFs yet">
            <p>Practice uses the built-in curriculum until PDFs are uploaded.</p>
          </EmptyState>
        )}
        <ul className="doc-list">
          {data?.documents.map((d) => (
            <li key={d.id}>
              <div>
                <button type="button" className="link-button" onClick={() => download(d)}>
                  {d.originalName}
                </button>
                <div className="muted small">
                  {d.pageCount} pages · {Math.round(d.sizeBytes / 1024)} KB · {d.grade ? `Grade ${d.grade}` : 'Any grade'} · {new Date(d.createdAt).toLocaleDateString()}
                  {d.characters === 0 && ' · ⚠️ no readable text'}
                </div>
                {d.topicsFound.length > 0 && <div className="small">Topics found: {d.topicsFound.join(', ')}</div>}
              </div>
              <SubjectChip subject={d.subject} small />
              <Button kind="ghost" size="sm" hasIconOnly renderIcon={TrashCan} iconDescription="Delete" tooltipPosition="left" onClick={() => remove(d)} />
            </li>
          ))}
        </ul>
      </Tile>
    </>
  );
}
