'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import StoreWorkspace, { ListingCard, type Listing } from './store-workspace';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Bike, BookOpen, Camera,
  Check, ChevronRight, Compass, ImagePlus, Laptop, MapPin, PackageOpen,
  Phone, Plus, Recycle, Search, ShieldCheck, Store, UserRound, X,
} from 'lucide-react';

type Tab = 'store' | 'search' | 'explore' | 'me';
type AccountSection = 'personal' | 'store';
type StoreInfo = {
  id: string;
  name: string;
  storeId: string;
  category: string;
  tagline: string;
  description: string;
  hall: string;
  address: string;
  banner: string;
};

type StoreForm = Omit<StoreInfo, 'id'>;
const EMPTY_FORM: StoreForm = { name: '', storeId: '', category: '', tagline: '', description: '', hall: '', address: '', banner: '' };
const tabs: { id: Tab; label: string; icon: typeof Store }[] = [
  { id: 'store', label: 'My Store', icon: Store },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'me', label: 'Me', icon: UserRound },
];
const categories = ['Campus essentials', 'Tech & gadgets', 'Books & notes', 'Cycles', 'Room essentials', 'Other'];
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);

function Brand() {
  return <Link href="/" className="kgp-brand" aria-label="Re Market home"><span className="kgp-brand-mark"><Recycle size={20} strokeWidth={2.2}/></span><span>re<span className="kgp-brand-light">market</span><i>.</i></span></Link>;
}

export default function KgpianDashboard() {
  const [tab, setTab] = useState<Tab>('store');
  const [section, setSection] = useState<AccountSection>('personal');
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [paidPreview, setPaidPreview] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StoreForm>(EMPTY_FORM);
  const [handleTouched, setHandleTouched] = useState(false);
  const [storeMessage, setStoreMessage] = useState('');
  const [bannerError, setBannerError] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneMessage, setPhoneMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [address, setAddress] = useState('');
  const [items, setItems] = useState<Listing[]>([]);
  const [workspace, setWorkspace] = useState<{ storeId: string; view: 'edit' | 'view' } | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('remarket:kgpian-stores') || '[]');
      const savedItems = JSON.parse(localStorage.getItem('remarket:kgpian-items') || '[]');
      if (Array.isArray(savedItems)) setItems(savedItems.filter((item): item is Listing => item && typeof item.id === 'string' && typeof item.storeId === 'string' && typeof item.name === 'string'));
      setAddress(localStorage.getItem('remarket:kgpian-address') || '');
      if (Array.isArray(stored)) setStores(stored.filter((item): item is StoreInfo => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.storeId === 'string').slice(0, 5));
    } catch { /* Storage is optional in this prototype. */ }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem('remarket:kgpian-stores', JSON.stringify(stores)); }
    catch { setStoreMessage('This device is out of storage. Your changes will remain until you leave this page.'); }
  }, [stores, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem('remarket:kgpian-items', JSON.stringify(items)); localStorage.setItem('remarket:kgpian-address', address); }
    catch { setStoreMessage('This device is out of storage. Your changes will remain until you leave this page.'); }
  }, [items, address, hydrated]);

  // PLACEHOLDER SEARCH: reads browser-local drafts only. Replace with database-backed search after the backend is connected.
  const searchResults = items.filter(item => {
    const store = stores.find(entry => entry.id === item.storeId);
    const query = searchTerm.trim().toLowerCase();
    return store && (!query || [item.name, item.description, item.condition, store.name, store.category].some(value => (value || '').toLowerCase().includes(query)));
  });
  const activeStore = stores.find(item => item.id === workspace?.storeId);
  const allowedStores = paidPreview || stores.length > 1 ? 5 : 1;
  const atLimit = stores.length >= allowedStores;
  const firstStoreIsFree = stores.length === 0;

  function changeTab(next: Tab) { setWorkspace(null); setTab(next); setStoreMessage(''); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function beginStore(store?: StoreInfo) {
    if (!store && atLimit) {
      setTab('store');
      document.getElementById('kgp-plan-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setEditingId(store?.id ?? null);
    setForm(store ? { name: store.name, storeId: store.storeId, category: store.category, tagline: store.tagline, description: store.description, hall: store.hall, address: store.address, banner: store.banner } : EMPTY_FORM);
    setHandleTouched(Boolean(store));
    setBannerError('');
    setStoreMessage('');
    setWorkspace(null);
    setTab('me');
    setSection('store');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function setField<K extends keyof StoreForm>(field: K, value: StoreForm[K]) { setForm(prev => ({ ...prev, [field]: value })); }
  function onStoreName(value: string) { setForm(prev => ({ ...prev, name: value, storeId: handleTouched ? prev.storeId : slugify(value) })); }
  async function onBanner(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBannerError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setBannerError('Choose a PNG, JPG, or WebP image.'); event.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { setBannerError('Choose an image under 5 MB.'); event.target.value = ''; return; }
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const ratio = Math.min(1, 1440 / bitmap.width, 600 / bitmap.height);
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      setField('banner', canvas.toDataURL('image/jpeg', .76));
    } catch { setBannerError('Could not read that image. Please try another one.'); }
    event.target.value = '';
  }
  function saveStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStoreMessage('');
    const storeId = slugify(form.storeId);
    if (storeId.length < 3) { setStoreMessage('Choose a Store ID with at least 3 letters or numbers.'); return; }
    if (stores.some(item => item.storeId === storeId && item.id !== editingId)) { setStoreMessage('That Store ID is already used in your stores. Try another.'); return; }
    if (!editingId && stores.length >= allowedStores) { setStoreMessage('You have reached the store limit in this preview.'); return; }
    const nextStore: StoreInfo = { ...form, id: editingId ?? `local-${Date.now()}`, name: form.name.trim(), storeId, tagline: form.tagline.trim(), description: form.description.trim(), hall: form.hall.trim(), address: form.address.trim() };
    setStores(prev => editingId ? prev.map(item => item.id === editingId ? nextStore : item) : [...prev, nextStore]);
    setEditingId(null);
    setTab('store');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  return <div id="kgpians" className={`kgp-app kgp-theme-${tab}`}>
    <aside className="kgp-sidebar"><div className="kgp-sidebar-top"><Brand/><div className="kgp-space-pill"><span/> KGP STUDENT SPACE</div></div>
      <nav aria-label="KGPian sections" className="kgp-side-nav">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`kgp-nav-item ${tab === id ? 'active' : ''}`} onClick={() => changeTab(id)} aria-current={tab === id ? 'page' : undefined}><Icon size={20} strokeWidth={1.8}/><span>{label}</span>{tab === id && <span className="kgp-nav-indicator"/>}</button>)}</nav>
      <div className="kgp-sidebar-bottom"><div className="kgp-mini-plan"><span className="kgp-mini-plan-icon"><Store size={18}/></span><strong>Make it yours.</strong><p>Your first store is on us. Dream bigger with up to five stores on a paid plan.</p><span className="kgp-mini-plan-line"><span style={{width:`${Math.max(0, stores.length / 5 * 100)}%`}}/></span><small>{stores.length} of 5 possible stores</small></div><div className="kgp-sidebar-user"><div className="kgp-avatar">K</div><div><strong>KGPian account</strong><span>Preview workspace</span></div><ChevronRight size={16}/></div></div>
    </aside>

    <div className="kgp-main-wrap"><header className="kgp-topbar"><div className="kgp-mobile-brand"><Brand/></div><div className="kgp-breadcrumb">RE MARKET <span>/</span> KGP SPACE <span>/</span> <strong>{tabs.find(item => item.id === tab)?.label}</strong></div><div className="kgp-top-actions"><span className="kgp-preview-chip"><span/> UI PREVIEW</span><div className="kgp-avatar kgp-top-avatar">K</div></div></header>
      <main className="kgp-main">
        {storeMessage && tab !== 'me' && <p role="alert" className="kgp-storage-warning">{storeMessage}</p>}
        {tab === 'store' && workspace && activeStore && <StoreWorkspace key={`${activeStore.id}-${workspace.view}`} store={activeStore} items={items.filter(item => item.storeId === activeStore.id)} view={workspace.view} onBack={() => setWorkspace(null)} onView={view => setWorkspace({ storeId: activeStore.id, view })} onEditDetails={() => beginStore(activeStore)} onSaveItem={item => setItems(previous => previous.some(entry => entry.id === item.id) ? previous.map(entry => entry.id === item.id ? item : entry) : [...previous, item])} onDeleteItem={id => setItems(previous => previous.filter(item => item.id !== id))}/>}
        {tab === 'store' && !workspace && <section className="kgp-section" aria-labelledby="store-title"><div className="kgp-heading-row"><div><span className="kgp-eyebrow">YOUR LITTLE CORNER OF CAMPUS</span><h1 id="store-title">My Store<span className="kgp-heading-dot">.</span></h1><p>Give the good things you’ve got a place to go next.</p></div>{stores.length > 0 && <button className="kgp-main-action" onClick={() => beginStore()} disabled={stores.length >= 5}><Plus size={18}/> Create another store</button>}</div>
          <div className="kgp-store-summary"><div className="kgp-summary-icon"><Store size={22}/></div><div><span>YOUR STORES</span><strong>{stores.length} <small>/ {allowedStores}</small></strong></div><div className="kgp-summary-divider"/><p>{stores.length === 0 ? 'Your first store is free. Start with a name and make it your own.' : `${stores.length === 1 ? 'Your first store is free.' : 'You’re previewing the paid tier.'} Store details are saved on this device.`}</p><span className="kgp-summary-squiggle">↻</span></div>
          {stores.length === 0 ? <div className="kgp-empty-store"><div className="kgp-empty-art" aria-hidden="true"><div className="kgp-art-floor"/><div className="kgp-art-window"><div className="kgp-art-awning"><i/><i/><i/><i/><i/></div><div className="kgp-art-window-pane"><span><Store size={45} strokeWidth={1.3}/></span></div><div className="kgp-art-step"/></div><div className="kgp-art-leaf one"/><div className="kgp-art-leaf two"/></div><div className="kgp-empty-copy"><span className="kgp-eyebrow">A SPACE FOR WHAT’S NEXT</span><h2>Your store starts here.</h2><p>Every campus find has a story. Set up your space, give it a name, and get ready to share yours.</p><button type="button" className="kgp-primary" onClick={() => beginStore()}><Plus size={18}/> Create store</button><span className="kgp-free-note"><Check size={14}/> Your first store is free</span></div></div> : <div className="kgp-store-list">{stores.map((item, index) => <article className="kgp-store-card" key={item.id}><div className={`kgp-store-banner ${item.banner ? 'has-image' : ''}`} style={item.banner ? { backgroundImage: `url(${item.banner})` } : undefined}><span className="kgp-card-type">{index === 0 ? 'FREE STORE' : 'PAID TIER PREVIEW'}</span><span className="kgp-store-banner-logo"><Store size={32}/></span></div><div className="kgp-store-card-body"><div><span className="kgp-card-kicker">STORE DRAFT · {item.category}</span><h2>{item.name}</h2><p>@{item.storeId}</p></div><span className="kgp-store-count">{items.filter(entry => entry.storeId === item.id).length} items</span></div><div className="kgp-store-card-footer"><span><MapPin size={14}/>{item.hall || 'KGP campus'}</span><span>Saved on this device</span></div><div className="kgp-store-card-actions"><button type="button" onClick={() => { setWorkspace({storeId:item.id,view:'view'}); window.scrollTo({top:0}); }}>View store <ArrowUpRight size={15}/></button><button type="button" onClick={() => { setWorkspace({storeId:item.id,view:'edit'}); window.scrollTo({top:0}); }}>Edit store <ArrowRight size={15}/></button></div></article>)}</div>}
          <section id="kgp-plan-card" className="kgp-plan-card"><div className="kgp-plan-intro"><span className="kgp-eyebrow">ROOM TO GROW</span><h2>One store is free.<br/><span>Five is the dream.</span></h2><p>Every KGPian can start with one free store. A paid plan will let you run up to five in total once payments are connected.</p></div><div className="kgp-plan-options"><div className="kgp-plan-option"><div><span className="kgp-option-icon"><Check size={17}/></span><strong>Free</strong></div><span>1 store / account</span></div><div className="kgp-plan-option"><div><span className="kgp-option-icon paid"><Plus size={17}/></span><strong>Paid plan</strong></div><span>Up to 5 stores total</span></div><button type="button" className="kgp-plan-button" onClick={() => setPaidPreview(true)} disabled={paidPreview || stores.length >= 5}>{paidPreview ? 'Paid tier preview enabled' : stores.length >= 5 ? 'Five-store limit reached' : 'Preview paid tier'} <ArrowUpRight size={16}/></button><small>No payment is taken in this UI preview.</small></div></section>
        </section>}

        {tab === 'search' && <section className="kgp-section" aria-labelledby="search-title"><div className="kgp-heading-row"><div><span className="kgp-eyebrow">FIND YOUR NEXT GOOD THING</span><h1 id="search-title">Search<span className="kgp-heading-dot">.</span></h1><p>What?s on your campus wish list?</p></div></div><label className="kgp-search-field"><Search size={21}/><input type="search" placeholder="Try cycles, books, tech..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} aria-label="Search Re Market"/></label><p className="kgp-search-notice">Placeholder search: showing listings saved on this device. This temporary logic will be replaced with database results later.</p>{searchResults.length > 0 ? <><div className="kgp-search-results-heading"><h2>Campus finds</h2><span>{searchResults.length} {searchResults.length === 1 ? 'item' : 'items'}</span></div><div className="kgp-listing-grid">{searchResults.map(item => { const store = stores.find(entry => entry.id === item.storeId); return <ListingCard key={item.id} item={item} store={store} onOpen={() => { setTab('store'); setWorkspace({storeId:item.storeId,view:'view'}); window.scrollTo({top:0}); }}/>; })}</div></> : <div className="kgp-placeholder"><span className="kgp-placeholder-icon"><Search size={35} strokeWidth={1.5}/></span><span className="kgp-eyebrow">THE GOOD FINDS ARE ON THEIR WAY</span><h2>{searchTerm.trim() ? 'No matching items yet.' : 'No listings yet.'}</h2><p>{searchTerm.trim() ? 'Try another search or add an item to your store.' : 'Items you add to a store will appear here in this preview.'}</p></div>}</section>}

        {tab === 'explore' && <section className="kgp-section" aria-labelledby="explore-title"><div className="kgp-heading-row"><div><span className="kgp-eyebrow">LOOK AROUND CAMPUS</span><h1 id="explore-title">Explore<span className="kgp-heading-dot">.</span></h1><p>A place for the things that deserve another chapter.</p></div></div><div className="kgp-placeholder kgp-explore-placeholder"><span className="kgp-placeholder-icon"><Compass size={36} strokeWidth={1.5}/></span><span className="kgp-eyebrow">COMING TO THIS SPACE</span><h2>Nothing to explore yet.</h2><p>When campus stores and listings are ready, this is where you’ll discover them.</p></div></section>}

        {tab === 'me' && <section className="kgp-section kgp-me" aria-labelledby="me-title"><div className="kgp-heading-row"><div><span className="kgp-eyebrow">A LITTLE ABOUT YOU</span><h1 id="me-title">Me<span className="kgp-heading-dot">.</span></h1><p>Your details and your store, all in one place.</p></div></div><div className="kgp-profile-hero"><div className="kgp-profile-badge">K</div><div><span className="kgp-eyebrow">KGP STUDENT ACCOUNT</span><h2>Your profile, your space.</h2><p>Personal details will sync from Google after sign-in is connected.</p></div><span className="kgp-profile-hero-icon"><UserRound size={28}/></span></div><div className="kgp-settings"><nav className="kgp-settings-tabs" aria-label="Account settings sections"><button type="button" className={section === 'personal' ? 'active' : ''} aria-current={section === 'personal' ? 'page' : undefined} onClick={() => setSection('personal')}><UserRound size={18}/> Personal info <ChevronRight size={16}/></button><button type="button" className={section === 'store' ? 'active' : ''} aria-current={section === 'store' ? 'page' : undefined} onClick={() => setSection('store')}><Store size={18}/> Store info <ChevronRight size={16}/></button></nav><div className="kgp-settings-panel">
          {section === 'personal' ? <><div className="kgp-panel-top"><span className="kgp-eyebrow">ACCOUNT SETTINGS</span><h2>Personal info</h2><p>These details will come from your IIT KGP Google account.</p></div><div className="kgp-readonly-grid"><label>Full name<input readOnly placeholder="Will be prefilled by Google" aria-label="Full name"/></label><label>IIT KGP email<input readOnly placeholder="Will be prefilled by Google" aria-label="IIT KGP email"/></label></div><div className="kgp-panel-separator"/><div className="kgp-panel-top"><h3>Contact details</h3><p>Add a phone number to prepare your account. Verification will be connected later.</p></div><div className="kgp-phone-row"><label htmlFor="kgp-phone">Phone number</label><div><span className="kgp-country-code">+91</span><input id="kgp-phone" type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} placeholder="10-digit phone number" value={phone} onChange={event => { setPhone(event.target.value.replace(/\D/g, '')); setPhoneMessage(''); }}/><button type="button" onClick={() => setPhoneMessage(phone.length === 10 ? 'Phone verification will be available when the backend is connected. No SMS was sent.' : 'Enter a 10-digit phone number first.')}><Phone size={15}/> Verify</button></div><small><ShieldCheck size={14}/> Verification required before publishing a store.</small>{phoneMessage && <p role="status" className="kgp-inline-message">{phoneMessage}</p>}</div><div className="kgp-panel-separator"/><div className="kgp-address-field"><label htmlFor="kgp-personal-address">Address</label><p>Where can you be reached on campus?</p><textarea id="kgp-personal-address" rows={3} maxLength={300} placeholder="Hall, room number and campus address" value={address} onChange={event => setAddress(event.target.value)}/><small>Saved on this device for now.</small></div><div className="kgp-panel-separator"/><div className="kgp-personal-note"><BadgeCheck size={22}/><div><strong>Made for KGPians</strong><p>Your Google name and email will be filled automatically once account sign-in is live.</p></div></div></> : <><div className="kgp-panel-top"><span className="kgp-eyebrow">{editingId ? 'UPDATE YOUR SPACE' : 'OPEN YOUR STORE'}</span><h2>{editingId ? 'Edit store info' : 'Store info'}</h2><p>{editingId ? 'Keep your store details up to date.' : 'A name, a little personality, and you’re ready for your first chapter.'}</p></div>{!editingId && stores.length >= allowedStores ? <div className="kgp-limit-notice"><Store size={20}/><p>Your current preview allows {allowedStores} {allowedStores === 1 ? 'store' : 'stores'}. Open My Store to preview the paid plan for up to five.</p><button type="button" onClick={() => changeTab('store')}>Go to My Store <ArrowRight size={16}/></button></div> : <form className="kgp-store-form" onSubmit={saveStore}><div className="kgp-form-banner"><label htmlFor="kgp-banner" className="kgp-form-label">Store banner <span>Optional</span></label><label htmlFor="kgp-banner" className="kgp-banner-upload" style={form.banner ? {backgroundImage:`url(${form.banner})`} : undefined}><span className="kgp-banner-upload-content"><ImagePlus size={27}/><strong>{form.banner ? 'Change banner' : 'Upload a store banner'}</strong><small>PNG, JPG or WebP · up to 5 MB</small></span></label><input id="kgp-banner" type="file" accept="image/png,image/jpeg,image/webp" onChange={onBanner} className="kgp-file-input"/>{bannerError && <p className="kgp-form-error" role="alert">{bannerError}</p>}{form.banner && <button type="button" className="kgp-remove-banner" onClick={() => setField('banner','')}><X size={14}/> Remove banner</button>}</div><div className="kgp-form-grid"><label>Store name <span>Required</span><input required maxLength={60} placeholder="e.g. The Campus Closet" value={form.name} onChange={event => onStoreName(event.target.value)}/></label><label>Store ID <span>Required</span><div className="kgp-handle-field"><span>@</span><input required pattern="[a-z0-9-]{3,30}" title="3–30 lowercase letters, numbers or hyphens" placeholder="campus-closet" value={form.storeId} onChange={event => { setHandleTouched(true); setField('storeId',slugify(event.target.value)); }}/></div></label></div><label>What will you sell? <span>Required</span><select required value={form.category} onChange={event => setField('category',event.target.value)}><option value="">Choose a category</option>{categories.map(item => <option key={item}>{item}</option>)}</select></label><label>Short tagline <span>Optional</span><input maxLength={100} placeholder="The good stuff, one more time." value={form.tagline} onChange={event => setField('tagline',event.target.value)}/></label><label>About your store <span>Optional</span><textarea rows={4} maxLength={500} placeholder="A little about what you’re passing on…" value={form.description} onChange={event => setField('description',event.target.value)}/></label><div className="kgp-form-grid"><label>Hall or campus area <span>Required</span><input required maxLength={80} placeholder="e.g. RK Hall" value={form.hall} onChange={event => setField('hall',event.target.value)}/></label><label>Pickup address or note <span>Optional</span><input maxLength={160} placeholder="e.g. Meet near the hall entrance" value={form.address} onChange={event => setField('address',event.target.value)}/></label></div>{storeMessage && <p className="kgp-form-error" role="alert">{storeMessage}</p>}<div className="kgp-form-footer"><div><ShieldCheck size={18}/><span>This saves a private draft on this device. Phone verification and publishing will come later.</span></div><button type="submit" className="kgp-primary">{editingId ? 'Save changes' : firstStoreIsFree ? 'Create free store' : 'Create store draft'} <ArrowRight size={17}/></button></div></form>}</>}
          </div></div></section>}
      </main><footer className="kgp-footer"><span>Re Market · Built with a little KGP spirit.</span><span>UI preview · Stores live only on this device</span></footer>
    </div>
    <nav className="kgp-bottom-nav" aria-label="KGPian mobile navigation">{tabs.map(({id,label,icon:Icon}) => <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => changeTab(id)} aria-current={tab === id ? 'page' : undefined}><Icon size={21} strokeWidth={1.8}/><span>{label}</span></button>)}</nav>
  </div>;
}
