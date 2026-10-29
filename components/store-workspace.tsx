'use client';

import { useState, type FormEvent, type ChangeEvent } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, MapPin, PackageOpen, Pencil, Plus, Store, Trash2, X } from 'lucide-react';

export type Listing = { id: string; storeId: string; name: string; price: string; condition: string; description: string; image: string };
export type ListingStore = { id: string; name: string; storeId: string; category: string; tagline: string; description: string; hall: string; banner: string };
const blank = { name: '', price: '', condition: 'Good', description: '', image: '' };

export function ListingCard({ item, store, onOpen }: { item: Listing; store?: ListingStore; onOpen?: () => void }) {
  return <article className="kgp-listing-card"><div className="kgp-listing-image">{item.image ? <img src={item.image} alt={item.name}/> : <PackageOpen size={36} strokeWidth={1.3}/>}<span>{item.condition}</span></div><div className="kgp-listing-body"><div className="kgp-listing-title"><h3>{item.name}</h3><strong>₹{Number(item.price).toLocaleString('en-IN')}</strong></div>{item.description && <p>{item.description}</p>}{store && <button type="button" className="kgp-listing-store" onClick={onOpen}><Store size={14}/> {store.name} <ArrowRight size={13}/></button>}</div></article>;
}

export default function StoreWorkspace({ store, items, view, onBack, onView, onEditDetails, onSaveItem, onDeleteItem }: {
  store: ListingStore; items: Listing[]; view: 'edit' | 'view'; onBack: () => void; onView: (view: 'edit' | 'view') => void; onEditDetails: () => void; onSaveItem: (item: Listing) => void; onDeleteItem: (id: string) => void;
}) {
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [imageError, setImageError] = useState('');
  function reset() { setForm(blank); setEditing(null); setShowForm(false); setImageError(''); }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || Number(form.price) < 0) return;
    onSaveItem({ ...form, name: form.name.trim(), description: form.description.trim(), id: editing ?? `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, storeId: store.id });
    reset();
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setImageError('Choose a PNG, JPG or WebP under 5 MB.'); event.target.value = ''; return; }
    try {
      const image = await createImageBitmap(file); const canvas = document.createElement('canvas');
      const ratio = Math.min(1, 900 / image.width, 900 / image.height);
      canvas.width = Math.max(1, Math.round(image.width * ratio)); canvas.height = Math.max(1, Math.round(image.height * ratio));
      const context = canvas.getContext('2d'); if (!context) throw new Error();
      context.drawImage(image, 0, 0, canvas.width, canvas.height); image.close();
      setForm(current => ({ ...current, image: canvas.toDataURL('image/jpeg', .75) }));
    } catch { setImageError('Could not read that image. Please try another.'); }
    event.target.value = '';
  }
  return <section className="kgp-section kgp-workspace"><button type="button" className="kgp-back-link" onClick={onBack}><ArrowLeft size={16}/> My Store</button><div className="kgp-workspace-hero" style={store.banner ? {backgroundImage: `linear-gradient(90deg, rgba(15,35,54,.84), rgba(15,35,54,.25)), url(${store.banner})`} : undefined}><div><span className="kgp-workspace-label">{view === 'view' ? 'STOREFRONT PREVIEW' : 'YOUR STORE WORKSPACE'}</span><h1>{store.name}</h1><p>@{store.storeId} {store.hall && <> · <MapPin size={13}/> {store.hall}</>}</p>{store.tagline && <p className="kgp-workspace-tagline">{store.tagline}</p>}</div><div className="kgp-workspace-actions"><button type="button" onClick={() => onView(view === 'edit' ? 'view' : 'edit')}>{view === 'edit' ? 'View store' : 'Edit store'} <ArrowRight size={15}/></button>{view === 'edit' && <button type="button" className="kgp-workspace-secondary" onClick={onEditDetails}>Store details <Pencil size={14}/></button>}</div></div>
    {view === 'view' && <p className="kgp-preview-note">Storefront preview · Only available on this device until the marketplace is connected.</p>}
    {store.description && view === 'view' && <p className="kgp-store-description">{store.description}</p>}
    <div className="kgp-listings-heading"><div><span className="kgp-eyebrow">{view === 'edit' ? 'YOUR INVENTORY' : 'THE COLLECTION'}</span><h2>{view === 'edit' ? 'Your items' : 'Available in this store'} <span>{items.length}</span></h2><p>{view === 'edit' ? 'Add the things you’re ready to pass on.' : 'A little something for its next chapter.'}</p></div>{view === 'edit' && <button type="button" className="kgp-primary" onClick={() => { reset(); setShowForm(true); }}><Plus size={17}/> Add item</button>}</div>
    {view === 'edit' && showForm && <form className="kgp-item-form" onSubmit={save}><div className="kgp-item-form-heading"><div><span className="kgp-eyebrow">{editing ? 'UPDATE YOUR LISTING' : 'A NEW FIND'}</span><h3>{editing ? 'Edit item' : 'Add an item'}</h3></div><button type="button" aria-label="Close item form" onClick={reset}><X size={20}/></button></div><div className="kgp-item-fields"><label>Item name<input required maxLength={80} placeholder="e.g. Study lamp" value={form.name} onChange={e => setForm({...form,name:e.target.value})}/></label><label>Price (₹)<input required type="number" min="0" max="99999999" step="0.01" placeholder="e.g. 450" value={form.price} onChange={e => setForm({...form,price:e.target.value})}/></label><label>Condition<select value={form.condition} onChange={e => setForm({...form,condition:e.target.value})}><option>Like new</option><option>Good</option><option>Well used</option></select></label><label className="kgp-item-description">Description <span>Optional</span><textarea rows={3} maxLength={500} placeholder="Tell us a little about it" value={form.description} onChange={e => setForm({...form,description:e.target.value})}/></label><div className="kgp-item-photo"><label htmlFor="kgp-item-image"><ImagePlus size={18}/> {form.image ? 'Change photo' : 'Add a photo'} <span>Optional · PNG, JPG or WebP</span></label><input id="kgp-item-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={upload}/>{form.image && <div className="kgp-photo-preview"><img src={form.image} alt="Selected item"/><button type="button" onClick={() => setForm({...form,image:''})}>Remove photo</button></div>}{imageError && <p role="alert">{imageError}</p>}</div></div><div className="kgp-item-form-footer"><button type="button" onClick={reset}>Cancel</button><button type="submit" className="kgp-primary">{editing ? 'Save changes' : 'Add item'} <ArrowRight size={16}/></button></div></form>}
    {items.length === 0 ? <div className="kgp-items-empty"><span><PackageOpen size={32}/></span><h3>{view === 'edit' ? 'Your shelves are waiting.' : 'Nothing on the shelves yet.'}</h3><p>{view === 'edit' ? 'Add your first item to see it in your store and in search.' : 'Check back soon for some campus finds.'}</p></div> : <div className="kgp-listing-grid">{items.map(item => <div key={item.id}><ListingCard item={item}/>{view === 'edit' && <div className="kgp-item-actions"><button type="button" onClick={() => { setEditing(item.id); setForm({name:item.name,price:item.price,condition:item.condition,description:item.description,image:item.image}); setShowForm(true); window.scrollTo({top:0,behavior:'smooth'}); }}><Pencil size={14}/> Edit item</button><button type="button" onClick={() => { if (window.confirm(`Remove ${item.name} from your store?`)) onDeleteItem(item.id); }}><Trash2 size={14}/> Remove</button></div>}</div>)}</div>}
  </section>;
}
