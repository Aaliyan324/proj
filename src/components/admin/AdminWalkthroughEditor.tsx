import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Walkthrough,
  WalkthroughSection,
  fetchAdminWalkthroughs,
  fetchAdminWalkthrough,
  createWalkthrough,
  updateWalkthrough,
  publishWalkthrough,
  unpublishWalkthrough,
  deleteWalkthrough,
  addWalkthroughSection,
  updateWalkthroughSection,
  deleteWalkthroughSection,
  reorderWalkthroughSections,
  uploadWalkthroughImage,
  resolveRoomImageSrc,
} from '../../services/apiService';

// Admin Website Walkthrough editor. Content lives in Neon as one walkthrough
// with ordered sections; only a PUBLISHED walkthrough renders on the public
// site, and the public section shows nothing until then (never a fallback).
const field = 'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none';
const label = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1';

const AdminWalkthroughEditor: React.FC = () => {
  const [list, setList] = useState<Walkthrough[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wt, setWt] = useState<Walkthrough | null>(null);
  const [sections, setSections] = useState<WalkthroughSection[]>([]);
  const [title, setTitle] = useState('');
  const [intro, setIntro] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingSection, setUploadingSection] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const fileForSection = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text });
    window.setTimeout(() => setMsg(null), 4500);
  };

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setList(await fetchAdminWalkthroughs());
    setLoadingList(false);
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const openWalkthrough = async (id: string) => {
    setSelectedId(id);
    const d = await fetchAdminWalkthrough(id);
    if (d) {
      setWt(d.walkthrough);
      setTitle(d.walkthrough.title || '');
      setIntro(d.walkthrough.intro || '');
      setSections(d.sections || []);
    }
  };

  const reload = async (id: string) => {
    const d = await fetchAdminWalkthrough(id);
    if (d) { setWt(d.walkthrough); setSections(d.sections || []); }
  };

  const create = async () => {
    const name = window.prompt('New walkthrough title', 'Website Walkthrough');
    if (name === null) return;
    setBusy(true);
    try {
      const created = await createWalkthrough(name.trim() || 'Website Walkthrough', '');
      await loadList();
      await openWalkthrough(created.id);
      flash('ok', 'Walkthrough created as a draft.');
    } catch (err: any) {
      flash('err', err?.message || 'Create failed.');
    } finally {
      setBusy(false);
    }
  };

  const saveMeta = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const updated = await updateWalkthrough(selectedId, { title, intro });
      setWt(updated);
      await loadList();
      flash('ok', 'Details saved.');
    } catch (err: any) {
      flash('err', err?.message || 'Save failed.');
    } finally {
      setBusy(false);
    }
  };

  const doPublish = async () => {
    if (!selectedId) return;
    const res = await publishWalkthrough(selectedId);
    if (res.success) { await reload(selectedId); await loadList(); flash('ok', 'Published to the website.'); }
    else flash('err', res.message || 'Publish failed (needs at least one section with a heading).');
  };

  const doUnpublish = async () => {
    if (!selectedId) return;
    const res = await unpublishWalkthrough(selectedId);
    if (res.success) { await reload(selectedId); await loadList(); flash('ok', 'Unpublished — hidden from the website.'); }
    else flash('err', res.message || 'Unpublish failed.');
  };

  const doDelete = async () => {
    if (!selectedId || !wt) return;
    if (!window.confirm('Delete this walkthrough and all its sections?')) return;
    const ok = await deleteWalkthrough(selectedId);
    if (ok) { setSelectedId(null); setWt(null); setSections([]); await loadList(); flash('ok', 'Walkthrough deleted.'); }
    else flash('err', 'Delete failed.');
  };

  const addSection = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      await addWalkthroughSection(selectedId, { heading: 'New section' });
      await reload(selectedId);
    } catch (err: any) {
      flash('err', err?.message || 'Failed to add section.');
    } finally {
      setBusy(false);
    }
  };

  const patchSection = (id: string, patch: Partial<WalkthroughSection>) =>
    setSections((arr) => arr.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const saveSection = async (sec: WalkthroughSection) => {
    if (!sec.heading.trim()) { flash('err', 'A section heading is required.'); return; }
    setBusy(true);
    try {
      await updateWalkthroughSection(sec.id, {
        heading: sec.heading.trim(),
        body: sec.body,
        imageRef: sec.image_ref,
        caption: sec.caption,
        videoUrl: sec.video_url,
      });
      flash('ok', 'Section saved.');
    } catch (err: any) {
      flash('err', err?.message || 'Section save failed.');
    } finally {
      setBusy(false);
    }
  };

  const delSection = async (sec: WalkthroughSection) => {
    if (!selectedId) return;
    if (!window.confirm('Delete this section?')) return;
    const ok = await deleteWalkthroughSection(sec.id);
    if (ok) await reload(selectedId); else flash('err', 'Failed to delete section.');
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!selectedId) return;
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const reordered = [...sections];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setSections(reordered);
    await reorderWalkthroughSections(selectedId, reordered.map((s) => s.id));
  };

  const pickImage = (sectionId: string) => {
    fileForSection.current = sectionId;
    fileRef.current?.click();
  };

  const onImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const sectionId = fileForSection.current;
    if (!file || !sectionId) return;
    setUploadingSection(sectionId);
    try {
      const { ref } = await uploadWalkthroughImage(file);
      patchSection(sectionId, { image_ref: ref });
      flash('ok', 'Image uploaded — remember to save the section.');
    } catch (err: any) {
      flash('err', err?.message || 'Image upload failed.');
    } finally {
      setUploadingSection(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onImage} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          Write the public <strong>Website Walkthrough</strong>. Only a published walkthrough appears on the site; drafts are private.
        </p>
        <button onClick={create} disabled={busy} className="text-xs font-bold px-3 py-2 rounded-lg bg-hotel-primary text-white hover:bg-blue-900 disabled:opacity-60 cursor-pointer">
          <i className="fa fa-plus me-1.5"></i>New Walkthrough
        </button>
      </div>

      {msg && (
        <div className={`text-sm rounded-lg px-4 py-2.5 ${msg.kind === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 max-h-[70vh] overflow-y-auto">
          {loadingList ? (
            <div className="p-6 text-center text-sm text-gray-500"><i className="fa fa-spinner fa-spin me-2"></i>Loading…</div>
          ) : list.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">No walkthroughs yet. Create one to get started.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {list.map((w) => (
                <li key={w.id}>
                  <button onClick={() => openWalkthrough(w.id)} className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 ${selectedId === w.id ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">{w.title || 'Untitled'}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${w.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{w.status}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{w.section_count ?? 0} section(s)</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Editor */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 lg:p-5">
          {!selectedId || !wt ? (
            <div className="flex items-center justify-center text-sm text-gray-400 py-16">
              <i className="fa fa-arrow-left me-1.5"></i>Select a walkthrough, or create a new one.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full ${wt.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {wt.status === 'published' ? 'Published' : 'Draft'}
                </span>
                <div className="flex items-center gap-2">
                  {wt.status === 'published' ? (
                    <button onClick={doUnpublish} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer">Unpublish</button>
                  ) : (
                    <button onClick={doPublish} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer">Publish</button>
                  )}
                  <button onClick={doDelete} className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-600 border border-red-200 hover:bg-red-50 cursor-pointer">Delete</button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div><label className={label}>Title</label><input className={field} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div><label className={label}>Intro</label><textarea rows={2} className={field} value={intro} onChange={(e) => setIntro(e.target.value)} /></div>
                <div><button onClick={saveMeta} disabled={busy} className="text-xs font-bold px-4 py-2 rounded-lg bg-hotel-primary text-white hover:bg-blue-900 disabled:opacity-60 cursor-pointer">Save details</button></div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-black text-blue-950">Sections ({sections.length})</h4>
                  <button onClick={addSection} disabled={busy} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer">
                    <i className="fa fa-plus me-1.5"></i>Add section
                  </button>
                </div>

                {sections.length === 0 ? (
                  <p className="text-xs text-gray-500">No sections yet. A published walkthrough needs at least one section with a heading.</p>
                ) : (
                  <div className="space-y-3">
                    {sections.map((sec, i) => (
                      <div key={sec.id} className="rounded-xl border border-gray-200 p-3 bg-gray-50/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-500">Section {i + 1}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => move(i, -1)} title="Move up" className="text-gray-500 hover:text-blue-900 text-[11px] px-1.5 cursor-pointer"><i className="fa fa-arrow-up"></i></button>
                            <button onClick={() => move(i, 1)} title="Move down" className="text-gray-500 hover:text-blue-900 text-[11px] px-1.5 cursor-pointer"><i className="fa fa-arrow-down"></i></button>
                            <button onClick={() => delSection(sec)} title="Delete" className="text-red-500 hover:text-red-700 text-[11px] px-1.5 cursor-pointer"><i className="fa fa-trash"></i></button>
                          </div>
                        </div>
                        <input className={field} placeholder="Heading" value={sec.heading} onChange={(e) => patchSection(sec.id, { heading: e.target.value })} />
                        <textarea rows={3} className={field} placeholder="Description" value={sec.body} onChange={(e) => patchSection(sec.id, { body: e.target.value })} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input className={field} placeholder="Caption (optional)" value={sec.caption} onChange={(e) => patchSection(sec.id, { caption: e.target.value })} />
                          <input className={field} placeholder="Video URL (YouTube/Vimeo, optional)" value={sec.video_url} onChange={(e) => patchSection(sec.id, { video_url: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => pickImage(sec.id)} disabled={uploadingSection === sec.id} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-white disabled:opacity-60 cursor-pointer">
                            {uploadingSection === sec.id ? 'Uploading…' : sec.image_ref ? 'Replace image' : 'Upload image'}
                          </button>
                          {sec.image_ref ? (
                            <img src={resolveRoomImageSrc(sec.image_ref)} alt="Preview" className="h-12 w-16 rounded-lg object-cover border border-gray-200" onError={(e: any) => { e.currentTarget.style.opacity = '0.3'; }} />
                          ) : (
                            <span className="text-[11px] text-gray-400">No image</span>
                          )}
                          <button onClick={() => saveSection(sec)} disabled={busy} className="ml-auto text-xs font-bold px-4 py-1.5 rounded-lg bg-hotel-primary text-white hover:bg-blue-900 disabled:opacity-60 cursor-pointer">Save section</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminWalkthroughEditor;
