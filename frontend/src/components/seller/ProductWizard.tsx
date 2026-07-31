import { useState, useRef } from 'react';
import type { Product } from '../../types/product';
import sellerService from '../../services/sellerService';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import {
  X, Upload, Plus, AlertCircle, ImageOff,
  ChevronLeft, ChevronRight, Check, Tag, Truck, Package,
} from 'lucide-react';

const CATEGORIES = ['Electronics', 'Clothing', 'Home & Garden', 'Books', 'Sports & Outdoors'];

const STEPS = [
  'Basic Info', 'Pricing', 'Description', 'Images', 'Shipping', 'Review',
];

interface WizardData {
  name: string;
  category: string;
  brand: string;
  condition: 'new' | 'used';
  price: string;
  stock: string;
  sku: string;
  discount: string;
  description: string;
  tags: string[];
  imageMode: 'upload' | 'url';
  imageUrl: string;
  shippingOption: 'standard' | 'express' | 'pickup';
  shippingFee: 'free' | 'buyer_pays';
}

const EMPTY_DATA: WizardData = {
  name: '', category: CATEGORIES[0], brand: '', condition: 'new',
  price: '', stock: '', sku: '', discount: '',
  description: '', tags: [],
  imageMode: 'upload', imageUrl: '',
  shippingOption: 'standard', shippingFee: 'free',
};

interface ProductWizardProps {
  product?: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

const ImgFallback: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 ${className ?? ''}`}>
        <ImageOff className="w-5 h-5 text-gray-300" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
};

export const ProductWizard: React.FC<ProductWizardProps> = ({ product, onClose, onSaved }) => {
  const isEditing = !!product;

  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(() =>
    product
      ? {
          ...EMPTY_DATA,
          name: product.name,
          category: product.category,
          price: String(product.price),
          stock: String(product.stock),
          description: product.description,
          tags: product.tags ?? [],
        }
      : EMPTY_DATA,
  );
  const [tagInput, setTagInput] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>(() => {
    if (!product) return [];
    return product.images?.length ? product.images : product.image ? [product.image] : [];
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof WizardData>(k: K, v: WizardData[K]) =>
    setData(prev => ({ ...prev, [k]: v }));

  const validate = (): string | null => {
    if (step === 1) {
      if (!data.name.trim()) return 'Product name is required.';
      if (!data.category) return 'Category is required.';
    }
    if (step === 2) {
      if (!data.price || Number(data.price) <= 0) return 'Price must be greater than 0.';
      if (data.stock === '' || Number(data.stock) < 0) return 'Stock quantity is required.';
    }
    if (step === 3) {
      if (!data.description.trim()) return 'Description is required.';
    }
    if (step === 4) {
      const ok = data.imageMode === 'url'
        ? !!data.imageUrl.trim()
        : imageFiles.length > 0 || existingUrls.length > 0;
      if (!ok) return 'Please add at least one product image.';
    }
    return null;
  };

  const next = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => s + 1);
  };

  const back = () => { setError(null); setStep(s => s - 1); };

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    const merged = [...imageFiles, ...picked].slice(0, 10);
    setImageFiles(merged);
    setImagePreviews(merged.map(f => URL.createObjectURL(f)));
    e.target.value = '';
  };

  const removeFile = (i: number) => {
    const next = imageFiles.filter((_, idx) => idx !== i);
    setImageFiles(next);
    setImagePreviews(next.map(f => URL.createObjectURL(f)));
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || data.tags.includes(t)) { setTagInput(''); return; }
    set('tags', [...data.tags, t]);
    setTagInput('');
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: data.name.trim(),
        description: data.description.trim(),
        price: Number(data.price),
        category: data.category,
        stock: Number(data.stock),
        image: data.imageMode === 'url' ? data.imageUrl : (existingUrls[0] ?? ''),
        brand: data.brand.trim() || undefined,
        condition: data.condition,
        sku: data.sku.trim() || undefined,
        discount: data.discount ? Number(data.discount) : undefined,
        tags: data.tags.length > 0 ? data.tags : undefined,
        shippingOption: data.shippingOption,
        shippingFee: data.shippingFee,
      };
      if (isEditing) {
        await sellerService.updateProduct(
          product!.id, payload, imageFiles.length > 0 ? imageFiles : undefined,
        );
      } else {
        await sellerService.createProduct(payload, imageFiles.length > 0 ? imageFiles : undefined);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step indicator ──────────────────────────────────────────────────────────
  const StepBar = () => (
    <div className="flex items-center gap-0 px-6 py-3 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done ? 'bg-primary-600 text-white' :
                active ? 'bg-primary-600 text-white ring-4 ring-primary-100 dark:ring-primary-900/40' :
                'bg-gray-100 dark:bg-gray-700 text-gray-400'
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap ${
                active ? 'text-primary-600 dark:text-primary-400' :
                done ? 'text-gray-500' : 'text-gray-300 dark:text-gray-600'
              }`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 sm:w-10 h-0.5 mx-0.5 mb-4 flex-shrink-0 ${done ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Step 1: Basic Info ──────────────────────────────────────────────────────
  const Step1 = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Basic Information</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Tell buyers about your product</p>
      </div>
      <Input label="Product Name" value={data.name} onChange={e => set('name', e.target.value)}
        placeholder="e.g. Sony WH-1000XM5 Headphones" fullWidth required />
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Category <span className="text-red-500">*</span>
        </label>
        <select value={data.category} onChange={e => set('category', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <Input label="Brand (Optional)" value={data.brand} onChange={e => set('brand', e.target.value)}
        placeholder="e.g. Sony, Apple, Samsung" fullWidth />
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Condition</label>
        <div className="grid grid-cols-2 gap-3">
          {(['new', 'used'] as const).map(c => (
            <button key={c} type="button" onClick={() => set('condition', c)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                data.condition === c
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}>
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                data.condition === c ? 'border-primary-500' : 'border-gray-300'
              }`}>
                {data.condition === c && <div className="w-2 h-2 rounded-full bg-primary-500" />}
              </div>
              <div>
                <p className={`text-sm font-semibold ${data.condition === c ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                  {c === 'new' ? 'Brand New' : 'Used'}
                </p>
                <p className="text-xs text-gray-400">{c === 'new' ? 'Never used' : 'Pre-owned'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Step 2: Pricing ─────────────────────────────────────────────────────────
  const Step2 = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pricing & Inventory</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Set your price and stock details</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Price ($)" type="number" value={data.price} onChange={e => set('price', e.target.value)}
          placeholder="0.00" fullWidth required />
        <Input label="Stock Quantity" type="number" value={data.stock} onChange={e => set('stock', e.target.value)}
          placeholder="0" fullWidth required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="SKU (Optional)" value={data.sku} onChange={e => set('sku', e.target.value)}
          placeholder="e.g. SKU-001" fullWidth />
        <Input label="Discount % (Optional)" type="number" value={data.discount}
          onChange={e => set('discount', e.target.value)} placeholder="e.g. 10" fullWidth />
      </div>
      {data.discount && Number(data.discount) > 0 && data.price && Number(data.price) > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
          <Tag className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-400">
            <span className="font-semibold">
              Sale price: ${(Number(data.price) * (1 - Number(data.discount) / 100)).toFixed(2)}
            </span>
            <span className="text-green-500 ml-1.5">({data.discount}% off)</span>
          </p>
        </div>
      )}
    </div>
  );

  // ── Step 3: Description ─────────────────────────────────────────────────────
  const Step3 = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Description</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Describe your product to buyers</p>
      </div>
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Description <span className="text-red-500">*</span>
          </label>
          <span className={`text-xs ${data.description.length >= 200 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
            {data.description.length}/200
          </span>
        </div>
        <textarea value={data.description} onChange={e => set('description', e.target.value)}
          rows={7} maxLength={200}
          placeholder="Describe your product's features, condition, and any relevant details..."
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tags <span className="text-xs text-gray-400 font-normal">(Optional)</span>
        </label>
        <div className="flex gap-2 mb-2">
          <input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Add a tag and press Enter..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          />
          <Button type="button" variant="outline" size="sm" onClick={addTag}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium">
                {t}
                <button type="button" onClick={() => set('tags', data.tags.filter(x => x !== t))}
                  className="hover:text-primary-900 transition-colors ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── Step 4: Images ──────────────────────────────────────────────────────────
  const Step4 = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Product Images</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Add photos to showcase your product (up to 10)</p>
      </div>
      <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 w-fit">
        {(['upload', 'url'] as const).map(mode => (
          <button key={mode} type="button" onClick={() => set('imageMode', mode)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              data.imageMode === mode
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
            }`}>
            {mode === 'upload' ? 'Upload Files' : 'Image URL'}
          </button>
        ))}
      </div>

      {data.imageMode === 'url' ? (
        <div className="space-y-3">
          <Input label="Image URL" value={data.imageUrl} onChange={e => set('imageUrl', e.target.value)}
            placeholder="https://example.com/product.jpg" fullWidth />
          {data.imageUrl && (
            <div className="w-28 h-28 rounded-xl overflow-hidden bg-gray-100">
              <ImgFallback src={data.imageUrl} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {existingUrls.length > 0 && imageFiles.length === 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Current images — upload new files to replace them</p>
              <div className="flex gap-2 flex-wrap">
                {existingUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    <ImgFallback src={url} alt={`img-${i}`}
                      className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                    <button type="button" onClick={() => setExistingUrls(p => p.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {imagePreviews.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt={`new-${i}`} className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                  <button type="button" onClick={() => removeFile(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {imageFiles.length < 10 && (
            <label className="flex flex-col items-center gap-3 px-6 py-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors">
              <Upload className="w-8 h-8 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {imageFiles.length === 0 ? 'Click to upload photos' : 'Add more photos'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  PNG, JPG, WEBP · up to {10 - imageFiles.length} more
                </p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
            </label>
          )}
          {imageFiles.length > 0 && isEditing && (
            <p className="text-xs text-amber-600 dark:text-amber-400">New photos will replace the current images when saved.</p>
          )}
        </div>
      )}
    </div>
  );

  // ── Step 5: Shipping ────────────────────────────────────────────────────────
  const Step5 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Shipping</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Set delivery options for buyers</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Delivery Option</label>
        <div className="space-y-2">
          {([
            { value: 'standard', label: 'Standard', desc: '3–7 business days', Icon: Truck },
            { value: 'express',  label: 'Express',  desc: '1–2 business days', Icon: Package },
            { value: 'pickup',   label: 'Pickup',   desc: 'Buyer collects in person', Icon: Package },
          ] as const).map(({ value, label, desc, Icon }) => (
            <button key={value} type="button" onClick={() => set('shippingOption', value)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
                data.shippingOption === value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}>
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                data.shippingOption === value ? 'border-primary-500' : 'border-gray-300'
              }`}>
                {data.shippingOption === value && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
              </div>
              <Icon className={`w-4 h-4 flex-shrink-0 ${data.shippingOption === value ? 'text-primary-600' : 'text-gray-400'}`} />
              <div>
                <p className={`text-sm font-semibold ${data.shippingOption === value ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200'}`}>
                  {label}
                </p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Shipping Fee</label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'free',       label: 'Free Shipping', desc: 'You absorb the cost' },
            { value: 'buyer_pays', label: 'Buyer Pays',    desc: 'Fee added at checkout' },
          ] as const).map(({ value, label, desc }) => (
            <button key={value} type="button" onClick={() => set('shippingFee', value)}
              className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
                data.shippingFee === value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}>
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                data.shippingFee === value ? 'border-primary-500' : 'border-gray-300'
              }`}>
                {data.shippingFee === value && <div className="w-2 h-2 rounded-full bg-primary-500" />}
              </div>
              <div>
                <p className={`text-sm font-semibold ${data.shippingFee === value ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200'}`}>
                  {label}
                </p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Step 6: Review ──────────────────────────────────────────────────────────
  const Step6 = () => {
    const previewSrc = data.imageMode === 'url'
      ? data.imageUrl
      : imagePreviews[0] ?? existingUrls[0] ?? '';

    const Row = ({ label, value, onEdit, mono = false }: {
      label: string; value: string; onEdit: () => void; mono?: boolean;
    }) => (
      <div className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 w-24">{label}</span>
        <span className={`text-sm text-gray-800 dark:text-gray-200 flex-1 ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
        <button type="button" onClick={onEdit}
          className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex-shrink-0">
          Edit
        </button>
      </div>
    );

    const imgCount = data.imageMode === 'url'
      ? (data.imageUrl ? 1 : 0)
      : imageFiles.length + existingUrls.length;

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Review Your Listing</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Make sure everything looks right before publishing</p>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
          {previewSrc && (
            <div className="h-40 bg-gray-100 dark:bg-gray-800">
              <img src={previewSrc} alt="preview" className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}
          <div className="p-4">
            {/* Basic */}
            <div className="mb-3">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-bold text-gray-900 dark:text-white">{data.name || '—'}</span>
                <button type="button" onClick={() => setStep(1)}
                  className="text-xs text-primary-600 hover:underline">Edit</button>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">{data.category}</span>
                {data.brand && <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">{data.brand}</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${data.condition === 'new' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {data.condition === 'new' ? 'Brand New' : 'Used'}
                </span>
              </div>
            </div>

            <Row label="Price" value={data.price ? `$${data.price}${data.discount ? ` (${data.discount}% off)` : ''}` : '—'} onEdit={() => setStep(2)} />
            <Row label="Stock" value={data.stock ? `${data.stock} units` : '—'} onEdit={() => setStep(2)} />
            {data.sku && <Row label="SKU" value={data.sku} onEdit={() => setStep(2)} mono />}
            <Row label="Description" value={data.description ? `${data.description.slice(0, 60)}${data.description.length > 60 ? '…' : ''}` : '—'} onEdit={() => setStep(3)} />
            {data.tags.length > 0 && (
              <Row label="Tags" value={data.tags.join(', ')} onEdit={() => setStep(3)} />
            )}
            <Row label="Images" value={`${imgCount} photo${imgCount !== 1 ? 's' : ''}`} onEdit={() => setStep(4)} />
            <Row
              label="Shipping"
              value={`${data.shippingOption.charAt(0).toUpperCase() + data.shippingOption.slice(1)} · ${data.shippingFee === 'free' ? 'Free shipping' : 'Buyer pays'}`}
              onEdit={() => setStep(5)}
            />
          </div>
        </div>
      </div>
    );
  };

  // Call as plain functions, NOT as <Step1 /> — avoids React treating them as
  // new component types on each render, which unmounts inputs and drops focus.
  const renderStep = () => {
    switch (step) {
      case 1: return Step1();
      case 2: return Step2();
      case 3: return Step3();
      case 4: return Step4();
      case 5: return Step5();
      case 6: return Step6();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Product' : 'Create New Listing'}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Step {step} of {STEPS.length} · {STEPS[step - 1]}</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <StepBar />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50 rounded-b-2xl">
          <Button variant="outline" onClick={step === 1 ? onClose : back}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step < 6 ? (
            <Button onClick={next}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Save Draft</Button>
              <Button onClick={submit} loading={submitting}>
                {isEditing ? 'Save Changes' : 'Publish Listing'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
