'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import StoreWorkspace, { ListingCard, type Listing } from './store-workspace';
import { createClient } from '@/utils/supabase/client';
import { useMarketplace, uploadImage, errorMessage } from '@/utils/supabase/marketplace';
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

export default function KgpianDashboard({ accountType = 'kgpians' }: { accountType?: 'kgpians' | 'nonkgpians' }) {
  const market = useMarketplace(accountType);
  const { stores, allStores, items, user, profile, loading, error, reload } = market;
  const visibleTabs = accountType === 'kgpians' ? tabs : tabs.filter(entry => entry.id !== 'store');
  const [tab, setTab] = useState<Tab>(accountType === 'kgpians' ? 'store' : 'search');
  const [section, setSection] = useState<AccountSection>('personal');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingStore, setCreatingStore] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [form, setForm] = useState<StoreForm>(EMPTY_FORM);
  const [handleTouched, setHandleTouched] = useState(false);
  const [storeMessage, setStoreMessage] = useState('');
  const [bannerError, setBannerError] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneMessage, setPhoneMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [workspace, setWorkspace] = useState<{ storeId: string; view: 'edit' | 'view' } | null>(null);

  useEffect(() => { if (profile) setAddress(profile.address); }, [profile]);
  // Search only uses rows confirmed by the database, never unsaved local drafts.
  const searchResults = items.filter(item => {
    const store = allStores.find(entry => entry.id === item.storeId);
    const query = searchTerm.trim().toLowerCase();
    return store && (!query || [item.name, item.description, item.condition, store.name, store.category].some(value => (value || '').toLowerCase().includes(query)));
  });
  const activeStore = allStores.find(item => item.id === workspace?.storeId);
  const isPaidPlan = market.storeLimit > 1;
  const allowedStores = market.storeLimit;
  const atLimit = stores.length >= allowedStores;
  const firstStoreIsFree = stores.length === 0;

  function changeTab(next: Tab) { setWorkspace(null); setCreatingStore(false); setTab(next); setStoreMessage(''); setSavedNotice(''); void reload().catch(error => setStoreMessage(errorMessage(error))); window.scrollTo({ top: 0, behavior: 'instant' }); }
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
    setSavedNotice('');
    setCreatingStore(!store);
    setTab(store ? 'me' : 'store');
    setSection(store ? 'store' : 'personal');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function openStoreInfo() {
    if (stores.length === 0) { changeTab('store'); return; }
    setSavedNotice('');
    if (isPaidPlan) { setEditingId(null); setSection('store'); }
    else beginStore(stores[0]);
  }
  async function saveAddress() {
    if (!user) return;
    const { error } = await createClient().from('profiles').update({ address }).eq('id',user.id);
    setSavedNotice(error ? error.message : 'Address saved.');
  }
  async function verifyPhone() {
    if (phone.length !== 10) { setPhoneMessage('Enter a 10-digit phone number.'); return; }
    const client = createClient();
    if (!phoneCodeSent) {
      const { error } = await client.auth.updateUser({ phone: '+91'+phone });
      setPhoneMessage(error ? error.message : 'Enter the code sent to your phone.');
      if (!error) setPhoneCodeSent(true);
    } else {
      const { error } = await client.auth.verifyOtp({ phone: '+91'+phone, token: phoneCode, type: 'phone_change' });
      setPhoneMessage(error ? error.message : 'Phone number verified.');
      if (!error) { setPhoneCodeSent(false); await reload(); }
    }
  }
  async function saveItem(item: Listing) {
    if (!user) throw new Error('Please sign in again.');
    if (!user.phone_confirmed_at) throw new Error('Verify your phone number in Me before adding a listing.');
    const client = createClient();
    const payload = { name:item.name, price:Number(item.price), condition:item.condition, description:item.description, store_id:item.storeId, image:await uploadImage(item.image,user.id) };
    const result = items.some(entry => entry.id === item.id) ? await client.from('listings').update(payload).eq('id',item.id).select().single() : await client.from('listings').insert(payload).select().single();
    if (result.error) throw result.error;
    await reload();
  }
  async function deleteItem(id: string) {
    const { error } = await createClient().from('listings').delete().eq('id',id);
    if (error) { setStoreMessage(error.message); return; }
    await reload();
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
  async function saveStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStoreMessage('');
    const storeId = slugify(form.storeId);
    if (storeId.length < 3) { setStoreMessage('Choose a Store ID with at least 3 letters or numbers.'); return; }
    if (stores.some(item => item.storeId === storeId && item.id !== editingId)) { setStoreMessage('That Store ID is already used in your stores. Try another.'); return; }
    if (!editingId && stores.length >= allowedStores) { setStoreMessage('Your account has reached its store limit.'); return; }
    if (!user || busy) return;
    setBusy(true);
    try {
      const { storeId: ignored, ...details } = form;
      const payload = { ...details, name:form.name.trim(), store_id:storeId, owner_id:user.id, banner:await uploadImage(form.banner,user.id) };
      const client = createClient();
      const result = editingId ? await client.from('stores').update(payload).eq('id',editingId).select().single() : await client.from('stores').insert(payload).select().single();
      if (result.error) throw result.error;
      await reload();
      if (editingId) setSavedNotice('Store details saved.');
      else { setCreatingStore(false); setTab('store'); }
    } catch (error) { setStoreMessage(errorMessage(error)); }
    finally { setBusy(false); }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  const storeForm = (<form className="kgp-store-form" onSubmit={saveStore}><div className="kgp-form-banner"><label htmlFor="kgp-banner" className="kgp-form-label">Store banner <span>Optional</span></label><label htmlFor="kgp-banner" className="kgp-banner-upload" style={form.banner ? {backgroundImage:`url(${form.banner})`} : undefined}><span className="kgp-banner-upload-content"><ImagePlus size={27}/><strong>{form.banner ? 'Change banner' : 'Upload a store banner'}</strong><small>PNG, JPG or WebP · up to 5 MB</small></span></label><input id="kgp-banner" type="file" accept="image/png,image/jpeg,image/webp" onChange={onBanner} className="kgp-file-input"/>{bannerError && <p className="kgp-form-error" role="alert">{bannerError}</p>}{form.banner && <button type="button" className="kgp-remove-banner" onClick={() => setField('banner','')}><X size={14}/> Remove banner</button>}</div><div className="kgp-form-grid"><label>Store name <span>Required</span><input required maxLength={60} placeholder="e.g. The Campus Closet" value={form.name} onChange={event => onStoreName(event.target.value)}/></label><label>Store ID <span>Required</span><div className="kgp-handle-field"><span>@</span><input required pattern="[a-z0-9-]{3,30}" title="3–30 lowercase letters, numbers or hyphens" placeholder="campus-closet" value={form.storeId} onChange={event => { setHandleTouched(true); setField('storeId',slugify(event.target.value)); }}/></div></label></div><label>What will you sell? <span>Required</span><select required value={form.category} onChange={event => setField('category',event.target.value)}><option value="">Choose a category</option>{categories.map(item => <option key={item}>{item}</option>)}</select></label><label>Short tagline <span>Optional</span><input maxLength={100} placeholder="The good stuff, one more time." value={form.tagline} onChange={event => setField('tagline',event.target.value)}/></label><label>About your store <span>Optional</span><textarea rows={4} maxLength={500} placeholder="A little about what you’re passing on…" value={form.description} onChange={event => setField('description',event.target.value)}/></label><div className="kgp-form-grid"><label>Hall or campus area <span>Required</span><input required maxLength={80} placeholder="e.g. RK Hall" value={form.hall} onChange={event => setField('hall',event.target.value)}/></label><label>Pickup address or note <span>Optional</span><input maxLength={160} placeholder="e.g. Meet near the hall entrance" value={form.address} onChange={event => setField('address',event.target.value)}/></label></div>{storeMessage && <p className="kgp-form-error" role="alert">{storeMessage}</p>}<div className="kgp-form-footer"><div><ShieldCheck size={18}/><span>Your store details are saved to your account.</span></div><button type="submit" disabled={busy} className="kgp-primary">{editingId ? 'Save changes' : firstStoreIsFree ? 'Create free store' : 'Create store'} <ArrowRight size={17}/></button></div></form>);

  if (loading || error || !profile) return <main className="kgp-connection"><h1>{error ? "Unable to load your account" : "Loading Re Market…"}</h1>{error && <><p role="alert">{error}</p><button onClick={() => window.location.reload()}>Try again</button><a href="/">Return to Re Market</a><button onClick={() => createClient().auth.signOut()}>Sign out</button></>}</main>;
  return <div id={accountType} className={`kgp-app kgp-theme-${tab}`}>
    <aside className="kgp-sidebar"><div className="kgp-sidebar-top"><Brand/></div>
      <nav aria-label="KGPian sections" className="kgp-side-nav">{visibleTabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`kgp-nav-item ${tab === id ? 'active' : ''}`} onClick={() => changeTab(id)} aria-current={tab === id ? 'page' : undefined}><Icon size={20} strokeWidth={1.8}/><span>{label}</span>{tab === id && <span className="kgp-nav-indicator"/>}</button>)}</nav>
      <div className="kgp-sidebar-bottom"><div className="kgp-mini-plan" hidden={accountType !== "kgpians"}><span className="kgp-mini-plan-icon"><Store size={18}/></span><strong>Make it yours.</strong><p>Your first store is on us. Dream bigger with up to five stores on a paid plan.</p><span className="kgp-mini-plan-line"><span style={{width:`${Math.max(0, stores.length / 5 * 100)}%`}}/></span><small>{stores.length} of 5 possible stores</small></div><div className="kgp-sidebar-user"><div className="kgp-avatar">{profile.full_name.charAt(0) || "R"}</div><div><strong>{profile.full_name || "Your account"}</strong><span>{accountType === "kgpians" ? "KGPian" : "Community member"}</span></div><ChevronRight size={16}/></div></div>
    </aside>

    <div className="kgp-main-wrap"><header className="kgp-topbar"><div className="kgp-mobile-brand"><Brand/></div><div className="kgp-breadcrumb">RE MARKET <span>/</span> KGP SPACE <span>/</span> <strong>{tabs.find(item => item.id === tab)?.label}</strong></div></header>
      <main className="kgp-main">
        {storeMessage && tab !== 'me' && <p role="alert" className="kgp-storage-warning">{storeMessage}</p>}
        {tab === 'store' && !creatingStore && workspace && activeStore && <StoreWorkspace key={`${activeStore.id}-${workspace.view}`} store={activeStore} items={items.filter(item => item.storeId === activeStore.id)} view={workspace.view} onBack={() => changeTab(accountType === 'kgpians' ? 'store' : 'search')} onView={view => setWorkspace({ storeId: activeStore.id, view: activeStore.ownerId === user?.id ? view : 'view' })} onEditDetails={() => beginStore(activeStore)} canEdit={activeStore.ownerId === user?.id} onSaveItem={saveItem} onDeleteItem={deleteItem}/>}
        {tab === 'store' && creatingStore && <section className="kgp-section kgp-create-store"><button type="button" className="kgp-back-link" onClick={() => { setCreatingStore(false); setStoreMessage(''); }}><ArrowLeft size={16}/> My Store</button><div className="kgp-create-panel"><div className="kgp-panel-top"><span className="kgp-eyebrow">OPEN YOUR STORE</span><h1>Create your store.</h1><p>Add the details that will make your store yours. You can change these later in Store info.</p></div>{storeForm}</div></section>}
        {tab === 'store' && !workspace && !creatingStore && <section className="kgp-section" aria-labelledby="store-title"><div className="kgp-heading-row"><div><span className="kgp-eyebrow">YOUR LITTLE CORNER OF CAMPUS</span><h1 id="store-title">My Store<span className="kgp-heading-dot">.</span></h1><p>Give the good things you’ve got a place to go next.</p></div>{stores.length > 0 && <button className="kgp-main-action" onClick={() => beginStore()} disabled={stores.length >= 5}><Plus size={18}/> Create another store</button>}</div>
          <div className="kgp-store-summary"><div className="kgp-summary-icon"><Store size={22}/></div><div><span>YOUR STORES</span><strong>{stores.length} <small>/ {allowedStores}</small></strong></div><div className="kgp-summary-divider"/><p>{stores.length === 0 ? 'Your first store is free. Start with a name and make it your own.' : `${stores.length === 1 ? 'Your first store is free.' : 'Your paid plan is active.'} Store details are saved to your account.`}</p><span className="kgp-summary-squiggle">↻</span></div>
          {stores.length === 0 ? <div className="kgp-empty-store"><div className="kgp-empty-art" aria-hidden="true"><div className="kgp-art-floor"/><div className="kgp-art-window"><div className="kgp-art-awning"><i/><i/><i/><i/><i/></div><div className="kgp-art-window-pane"><span><Store size={45} strokeWidth={1.3}/></span></div><div className="kgp-art-step"/></div><div className="kgp-art-leaf one"/><div className="kgp-art-leaf two"/></div><div className="kgp-empty-copy"><span className="kgp-eyebrow">A SPACE FOR WHAT’S NEXT</span><h2>Your store starts here.</h2><p>Every campus find has a story. Set up your space, give it a name, and get ready to share yours.</p><button type="button" className="kgp-primary" onClick={() => beginStore()}><Plus size={18}/> Create store</button><span className="kgp-free-note"><Check size={14}/> Your first store is free</span></div></div> : <div className="kgp-store-list">{stores.map((item, index) => <article className="kgp-store-card" key={item.id}><div className={`kgp-store-banner ${item.banner ? 'has-image' : ''}`} style={item.banner ? { backgroundImage: `url(${item.banner})` } : undefined}><span className="kgp-card-type">{index === 0 ? 'FREE STORE' : 'PAID STORE'}</span><span className="kgp-store-banner-logo"><Store size={32}/></span></div><div className="kgp-store-card-body"><div><span className="kgp-card-kicker">STORE · {item.category}</span><h2>{item.name}</h2><p>@{item.storeId}</p></div><span className="kgp-store-count">{items.filter(entry => entry.storeId === item.id).length} items</span></div><div className="kgp-store-card-footer"><span><MapPin size={14}/>{item.hall || 'KGP campus'}</span><span>Saved to your account</span></div><div className="kgp-store-card-actions"><button type="button" onClick={() => { setWorkspace({storeId:item.id,view:'view'}); window.scrollTo({top:0}); }}>View store <ArrowUpRight size={15}/></button><button type="button" onClick={() => { setWorkspace({storeId:item.id,view:'edit'}); window.scrollTo({top:0}); }}>Edit store <ArrowRight size={15}/></button></div></article>)}</div>}
          <section id="kgp-plan-card" className="kgp-plan-card"><div className="kgp-plan-intro"><span className="kgp-eyebrow">ROOM TO GROW</span><h2>One store is free.<br/><span>Five is the dream.</span></h2><p>Every KGPian can start with one free store. A paid plan will let you run up to five in total when a paid plan is available.</p></div><div className="kgp-plan-options"><div className="kgp-plan-option"><div><span className="kgp-option-icon"><Check size={17}/></span><strong>Free</strong></div><span>1 store / account</span></div><div className="kgp-plan-option"><div><span className="kgp-option-icon paid"><Plus size={17}/></span><strong>Paid plan</strong></div><span>Up to 5 stores total</span></div><button type="button" className="kgp-plan-button"  disabled>{isPaidPlan ? 'Paid plan active' : 'Paid plans are not available yet'} <ArrowUpRight size={16}/></button><small>Your current plan is managed securely on your account.</small></div></section>
        </section>}

        {tab === 'search' && <section className="kgp-section" aria-labelledby="search-title"><div className="kgp-heading-row"><div><span className="kgp-eyebrow">FIND YOUR NEXT GOOD THING</span><h1 id="search-title">Search<span className="kgp-heading-dot">.</span></h1><p>What?s on your campus wish list?</p></div></div><label className="kgp-search-field"><Search size={21}/><input type="search" placeholder="Try cycles, books, tech..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} aria-label="Search Re Market"/></label><p className="kgp-search-notice">Search the latest listings from Re Market stores.</p>{searchResults.length > 0 ? <><div className="kgp-search-results-heading"><h2>Campus finds</h2><span>{searchResults.length} {searchResults.length === 1 ? 'item' : 'items'}</span></div><div className="kgp-listing-grid">{searchResults.map(item => { const store = allStores.find(entry => entry.id === item.storeId); return <ListingCard key={item.id} item={item} store={store} onOpen={() => { setTab('store'); setWorkspace({storeId:item.storeId,view:'view'}); window.scrollTo({top:0}); }}/>; })}</div></> : <div className="kgp-placeholder"><span className="kgp-placeholder-icon"><Search size={35} strokeWidth={1.5}/></span><span className="kgp-eyebrow">THE GOOD FINDS ARE ON THEIR WAY</span><h2>{searchTerm.trim() ? 'No matching items yet.' : 'No listings yet.'}</h2><p>{searchTerm.trim() ? 'Try another search or add an item to your store.' : 'No listings are available yet. Check back soon.'}</p></div>}</section>}

        {tab === 'explore' && <section className="kgp-section"><div className="kgp-heading-row"><div><span className="kgp-eyebrow">DISCOVER RE MARKET</span><h1>Explore<span className="kgp-heading-dot">.</span></h1><p>Find the latest additions from campus stores.</p></div></div>{items.length ? <div className="kgp-listing-grid">{items.map(item => <ListingCard key={item.id} item={item} store={allStores.find(store => store.id === item.storeId)} onOpen={() => { setTab('store'); setWorkspace({storeId:item.storeId,view:'view'}); }}/>)}</div> : <div className="kgp-placeholder kgp-explore-placeholder"><Compass size={36}/><h2>No listings yet.</h2><p>New listings will appear here as stores add them.</p></div>}</section>}

        {tab === 'me' && <section className="kgp-section kgp-me" aria-labelledby="me-title"><div className="kgp-heading-row"><div><span className="kgp-eyebrow">A LITTLE ABOUT YOU</span><h1 id="me-title">Me<span className="kgp-heading-dot">.</span></h1><p>Your details and your store, all in one place.</p></div></div><div className="kgp-profile-hero"><div className="kgp-profile-badge">{profile.full_name.charAt(0) || "R"}</div><div><span className="kgp-eyebrow">RE MARKET ACCOUNT</span><h2>Your profile, your space.</h2><p>Your account details and contact information.</p></div><span className="kgp-profile-hero-icon"><UserRound size={28}/></span></div><div className="kgp-settings"><nav className="kgp-settings-tabs" aria-label="Account settings sections"><button type="button" className={section === 'personal' ? 'active' : ''} aria-current={section === 'personal' ? 'page' : undefined} onClick={() => setSection('personal')}><UserRound size={18}/> Personal info <ChevronRight size={16}/></button><button hidden={accountType !== 'kgpians'} type="button" className={section === 'store' ? 'active' : ''} aria-current={section === 'store' ? 'page' : undefined} onClick={openStoreInfo}><Store size={18}/> Store info <ChevronRight size={16}/></button></nav><div className="kgp-settings-panel">
          {section === 'personal' ? <><div className="kgp-panel-top"><span className="kgp-eyebrow">ACCOUNT SETTINGS</span><h2>Personal info</h2><p>These details come from your verified sign-in account.</p></div><div className="kgp-readonly-grid"><label>Full name<input readOnly value={profile.full_name} aria-label="Full name"/></label><label>Email<input readOnly value={profile.email} aria-label="IIT KGP email"/></label></div><div className="kgp-panel-separator"/><div className="kgp-panel-top"><h3>Contact details</h3><p>Verify a phone number for your account.</p></div><div className="kgp-phone-row"><label htmlFor="kgp-phone">Phone number</label><div><span className="kgp-country-code">+91</span><input id="kgp-phone" type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} placeholder="10-digit phone number" value={phone} onChange={event => { setPhone(event.target.value.replace(/\D/g, '')); setPhoneMessage(''); setPhoneCodeSent(false); }}/><button type="button" onClick={verifyPhone}><Phone size={15}/> Verify</button></div><small><ShieldCheck size={14}/> Verify your number before adding listings.</small>{phoneCodeSent && <input aria-label="Phone verification code" autoComplete="one-time-code" value={phoneCode} onChange={event => setPhoneCode(event.target.value)}/>}{user?.phone_confirmed_at && <p>Verified phone: +{user.phone}</p>}{phoneMessage && <p role="status" className="kgp-inline-message">{phoneMessage}</p>}</div><div className="kgp-panel-separator"/><div className="kgp-address-field"><label htmlFor="kgp-personal-address">Address</label><p>Where can you be reached on campus?</p><textarea id="kgp-personal-address" rows={3} maxLength={300} placeholder="Hall, room number and campus address" value={address} onChange={event => setAddress(event.target.value)}/><button type="button" className="kgp-primary" onClick={saveAddress}>Save address</button>{savedNotice && <p role="status">{savedNotice}</p>}</div><div className="kgp-panel-separator"/><div className="kgp-personal-note"><BadgeCheck size={22}/><div><strong>Your Re Market account</strong><p>Your name and email are managed by your sign-in provider.</p></div></div></> : <><div className="kgp-panel-top"><span className="kgp-eyebrow">YOUR STORES</span><h2>Store info</h2><p>{isPaidPlan ? 'Choose a store to update its details.' : 'Update the details of your store.'}</p></div>{isPaidPlan && <div className="kgp-store-selector"><span className="kgp-selector-label">SELECT A STORE</span>{stores.map(store => <button type="button" key={store.id} className={`kgp-selector-store ${editingId === store.id ? 'active' : ''}`} onClick={() => beginStore(store)} aria-pressed={editingId === store.id}><span className="kgp-selector-icon"><Store size={18}/></span><span><strong>{store.name}</strong><small>@{store.storeId}</small></span><span className="kgp-selector-action">{editingId === store.id ? 'Editing' : 'Edit'} <ChevronRight size={15}/></span></button>)}</div>}{editingId ? <>{isPaidPlan && <div className="kgp-selected-store-heading"><h3>Edit store details</h3><p>Changes apply to the selected store.</p></div>}{savedNotice && <p role="status" className="kgp-save-notice">{savedNotice}</p>}{storeForm}</> : isPaidPlan ? <p className="kgp-select-hint">Select a store above to edit its details.</p> : null}</>}
          </div></div></section>}
      </main><button className="kgp-back-link" style={{marginLeft:30}} onClick={() => createClient().auth.signOut()}>Sign out</button><footer className="kgp-footer"><span>Re Market · Built with a little KGP spirit.</span><span>Buy. Sell. Re Market.</span></footer>
    </div>
    <nav className="kgp-bottom-nav" aria-label="KGPian mobile navigation">{visibleTabs.map(({id,label,icon:Icon}) => <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => changeTab(id)} aria-current={tab === id ? 'page' : undefined}><Icon size={21} strokeWidth={1.8}/><span>{label}</span></button>)}</nav>
  </div>;
}
