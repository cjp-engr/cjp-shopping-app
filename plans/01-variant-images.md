# Plan 01 — Variant Image Upload

**Goal:** Each product variant can have its own `images: string[]` (cover = index 0).  
Sellers can upload, replace, delete, reorder, and set a cover image per variant.  
Buyers see the selected variant's images on the Product Details page; fallback to product images when none.

---

## Phase 0 — Discovery (DONE)

### Current state (verified from source)

| Layer | File | Relevant finding |
|---|---|---|
| Backend schema | `backend/src/models/Product.ts` | `IProductVariant.image?: string` (single); no `images[]` on variant |
| Backend service | `backend/src/services/sellerService.ts` | `variants: any[]` passed through as-is; no per-variant image processing |
| Backend controller | `backend/src/controllers/productController.ts` | Existing `POST /:id/image` → single file → sets top-level `image` field. Cloudinary + multer already configured |
| Backend routes | `backend/src/routes/productRoutes.ts` | `POST /:id/image` uses `upload.single('image')`. No variant image route |
| Upload middleware | `backend/src/middleware/upload.ts` | `productStorage` → `tokomart/products/`, max 5 MB, 800×800. Exports `upload` (multer instance) |
| Web wizard | `frontend/src/components/seller/ProductWizard.tsx` | `VariantRow` has no `image` field; submit payload omits variant images |
| Flutter `_VariantRow` | `add_edit_product_screen.dart` | Has `imageUrl: String` (URL, loaded from edit); no `XFile?` for local pick |
| Flutter model | `product_model.dart` | `ProductVariantModel.fromJson` already reads `json['image']`; change needed to read `json['images']` array |
| Flutter entity | `product_entity.dart` | `ProductVariant.image: String` (single) |

### Architecture decision

Use **upload-first, then save-URL** pattern:
- Frontend uploads each variant image immediately on pick → backend returns Cloudinary URL.
- Variant `images: string[]` in the form state holds confirmed CDN URLs.
- On product create/update, variant objects include `images: string[]` in the JSON payload — no multipart complexity at form-submit time.

Variant schema change: `image?: string` → `images: string[]` (cover = `images[0]`).  
Backward compat: `image` getter on the entity returns `images[0] ?? ''`.

---

## Phase 1 — Backend: Schema + Upload Endpoint

**Files to change:**
- `backend/src/models/Product.ts`
- `backend/src/routes/productRoutes.ts`
- `backend/src/controllers/productController.ts`
- `backend/src/services/sellerService.ts`

### 1a — Update `IProductVariant` and Mongoose schema

In `models/Product.ts`:

```ts
// Interface — replace image?: string
export interface IProductVariant {
  attributes: Map<string, string>;
  price: number;
  stock: number;
  sku?: string;
  images: string[];   // ← was: image?: string
  discount?: number;
}
```

In the Mongoose sub-document schema:

```ts
// Replace: image: { type: String, default: '' }
images: { type: [String], default: [] },
```

### 1b — Add variant image upload endpoint

In `controllers/productController.ts`, add:

```ts
// POST /api/products/variant-image
// Body: multipart/form-data, field name: 'image' (single file)
// Returns: { success: true, url: string }
export const uploadVariantImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    const file = req.file as Express.Multer.File & { path: string };
    res.status(200).json({ success: true, url: file.path });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Upload failed' });
  }
};
```

> `file.path` is the Cloudinary URL when using `CloudinaryStorage` — same pattern as the existing `uploadProductImage` handler.

In `routes/productRoutes.ts`:

```ts
import { ..., uploadVariantImage } from '../controllers/productController.js';
// Add before the /:id routes to avoid param conflicts:
router.post('/variant-image', protect, requireSeller, upload.single('image'), uploadVariantImage);
```

### 1c — Patch `createSellerProduct` / `updateSellerProduct`

The services already spread `variants: any[]` through. No service change is needed — the variant objects will now contain `images: string[]` in the payload, and Mongoose will store them because the schema accepts `[String]`.

However, add a migration-safe fallback in `createSellerProduct` and `updateSellerProduct`: if a variant arrives with `image: string` (legacy), coerce it:

```ts
// In sellerService.ts, before Product.create / Product.findByIdAndUpdate:
const normalizedVariants = (data.variants ?? []).map((v: any) => ({
  ...v,
  images: Array.isArray(v.images) ? v.images : (v.image ? [v.image] : []),
}));
```

### Verification checklist — Phase 1

- [ ] `tsc --noEmit` passes in `backend/`
- [ ] `POST /api/products/variant-image` with a valid image file returns `{ success: true, url: "https://res.cloudinary.com/..." }`
- [ ] Create a product with variants having `images: ["url1","url2"]` and verify MongoDB stores the array on the variant subdocument
- [ ] Fetch the product — `GET /api/products/:id` — and confirm `variants[n].images` is present in the response

---

## Phase 2 — Web Frontend: Seller Variant Image UI

**Files to change:**
- `frontend/src/components/seller/ProductWizard.tsx`
- `frontend/src/services/sellerService.ts` (if the upload helper isn't there yet — check first)

### 2a — Extend `VariantRow` type

```ts
interface VariantRow {
  attributes: Record<string, string>;
  price: string;
  stock: string;
  sku: string;
  discount: string;
  images: string[];      // ← ADD: confirmed Cloudinary URLs
}
```

In `EMPTY_DATA` and variant generation (the Cartesian-product fn), initialize each row with `images: []`.  
In the edit-product path where `VariantRow` is built from existing product data, initialize `images: v.images ?? (v.image ? [v.image] : [])`.

In the submit payload, add `images: v.images` to each variant object (already spreads `v`, so adding it to the interface means it's included).

### 2b — Add upload helper to `sellerService.ts`

Check if `sellerService.ts` already has an image upload helper. If not, add:

```ts
export async function uploadVariantImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${API_BASE}/products/variant-image`, {
    method: 'POST',
    headers: getAuthHeaders({ noContentType: true }),
    body: form,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message ?? 'Upload failed');
  return data.url as string;
}
```

> `getAuthHeaders({ noContentType: true })` — do NOT set Content-Type when sending FormData; the browser sets the multipart boundary automatically. Check how existing product image upload calls do this and copy the exact pattern.

### 2c — Variant image UI in ProductWizard

Locate the per-variant row renderer (the table/card that renders price/stock/sku fields per variant). Add an image section below the existing fields for each row.

Pattern to implement per variant row:
```tsx
{/* Variant images */}
<div className="mt-3">
  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
    Variant Images <span className="text-gray-400">(optional — falls back to product images)</span>
  </p>

  {/* Thumbnails row with cover, reorder, delete */}
  <div className="flex flex-wrap gap-2 mb-2">
    {row.images.map((url, imgIdx) => (
      <div key={imgIdx} className="relative group w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-200">
        <img src={url} alt="" className="w-full h-full object-cover" />
        {imgIdx === 0 && (
          <span className="absolute top-0 left-0 text-[9px] font-bold bg-primary-600 text-white px-1">
            Cover
          </span>
        )}
        {/* Move left */}
        {imgIdx > 0 && (
          <button onClick={() => moveVariantImage(variantIdx, imgIdx, -1)}
            className="absolute bottom-0 left-0 bg-black/50 text-white text-xs p-0.5 hidden group-hover:block">
            ←
          </button>
        )}
        {/* Move right */}
        {imgIdx < row.images.length - 1 && (
          <button onClick={() => moveVariantImage(variantIdx, imgIdx, 1)}
            className="absolute bottom-0 right-0 bg-black/50 text-white text-xs p-0.5 hidden group-hover:block">
            →
          </button>
        )}
        {/* Delete */}
        <button onClick={() => removeVariantImage(variantIdx, imgIdx)}
          className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hidden group-hover:flex">
          ×
        </button>
      </div>
    ))}

    {/* Upload button */}
    {row.images.length < 5 && (
      <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-primary-400">
        <input type="file" accept="image/*" className="hidden"
          onChange={e => handleVariantImagePick(variantIdx, e)} />
        <Plus className="w-5 h-5 text-gray-400" />
      </label>
    )}
  </div>
</div>
```

State helpers to add (operate on `data.variants[idx].images`):

```ts
const handleVariantImagePick = async (variantIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = '';
  try {
    const url = await uploadVariantImage(file);   // from sellerService
    set('variants', data.variants.map((v, i) =>
      i === variantIdx ? { ...v, images: [...v.images, url] } : v
    ));
  } catch { /* show toast */ }
};

const removeVariantImage = (variantIdx: number, imgIdx: number) => {
  set('variants', data.variants.map((v, i) =>
    i === variantIdx ? { ...v, images: v.images.filter((_, j) => j !== imgIdx) } : v
  ));
};

const moveVariantImage = (variantIdx: number, imgIdx: number, dir: -1 | 1) => {
  set('variants', data.variants.map((v, i) => {
    if (i !== variantIdx) return v;
    const imgs = [...v.images];
    [imgs[imgIdx], imgs[imgIdx + dir]] = [imgs[imgIdx + dir], imgs[imgIdx]];
    return { ...v, images: imgs };
  }));
};
```

### Verification checklist — Phase 2

- [ ] Open "Create Product" → enable variants → pick images for a variant → images appear as thumbnails
- [ ] Reorder: clicking ← and → swaps thumbnails (cover badge moves to index 0)
- [ ] Delete: × removes thumbnail
- [ ] Submit form → inspect POST body → `variants[n].images` contains Cloudinary URLs
- [ ] Edit existing product → variant images load from saved URLs

---

## Phase 3 — Flutter Mobile: Seller Variant Image UI

**Files to change:**
- `frontend-mobile/lib/features/seller/presentation/screens/add_edit_product_screen.dart`
- `frontend-mobile/lib/features/products/domain/entities/product_entity.dart`
- `frontend-mobile/lib/features/products/data/models/product_model.dart`
- `frontend-mobile/lib/features/seller/data/datasources/seller_remote_datasource.dart` (add upload helper)

### 3a — Update entity and model

**`product_entity.dart` — `ProductVariant`:**

```dart
// Replace: final String image;
final List<String> images;

// Update constructor and copyWith
const ProductVariant({
  ...
  this.images = const [],
});

// Backward-compat getter
String get image => images.isNotEmpty ? images[0] : '';
```

**`product_model.dart` — `ProductVariantModel.fromJson`:**

```dart
// Replace the single image line:
images: (json['images'] as List?)
    ?.map((e) => e?.toString() ?? '')
    .where((s) => s.isNotEmpty)
    .toList() ??
  (json['image']?.toString().isNotEmpty == true
      ? [json['image'].toString()]
      : []),
```

This handles both old `image: string` and new `images: string[]` responses.

**`toJson` in `ProductVariantModel`** (if it exists — check):

```dart
'images': images,
```

### 3b — Extend `_VariantRow`

```dart
class _VariantRow {
  // existing fields ...
  List<String> imageUrls;    // confirmed remote URLs
  List<XFile> imageFiles;    // locally picked, not yet uploaded

  _VariantRow({
    ...
    List<String>? imageUrls,
    List<XFile>? imageFiles,
  })  : imageUrls = imageUrls ?? [],
        imageFiles = imageFiles ?? [];

  // cover getter
  String get coverImage => imageUrls.isNotEmpty ? imageUrls[0] : '';
}
```

Initialize from edit mode in `initState`:
```dart
imageUrls: v.images,   // was: imageUrl: v.image
```

### 3c — Upload helper in seller datasource

In `seller_remote_datasource.dart` (or wherever product upload is done), add:

```dart
Future<String> uploadVariantImage(XFile file) async {
  final form = FormData.fromMap({
    'image': await MultipartFile.fromFile(file.path, filename: file.name),
  });
  final response = await _dio.post('/products/variant-image', data: form);
  return response.data['url'] as String;
}
```

### 3d — Variant image UI in the variant step

Find the variant list builder in the variant step of `add_edit_product_screen.dart`. Below the discount field for each `_VariantRow`, add:

```dart
// Variant images row
const SizedBox(height: 8),
Text('Images', style: TextStyle(fontSize: 12, color: context.onSurfaceMuted, fontWeight: FontWeight.w600)),
const SizedBox(height: 6),
_VariantImagesRow(
  row: row,
  onUpload: (xfile) async {
    final url = await _sellerDatasource.uploadVariantImage(xfile);
    setState(() => row.imageUrls.add(url));
  },
  onRemove: (idx) => setState(() => row.imageUrls.removeAt(idx)),
  onReorder: (oldIdx, newIdx) => setState(() {
    final item = row.imageUrls.removeAt(oldIdx);
    row.imageUrls.insert(newIdx, item);
  }),
),
```

**`_VariantImagesRow` widget:**

```dart
class _VariantImagesRow extends StatelessWidget {
  final _VariantRow row;
  final Future<void> Function(XFile) onUpload;
  final void Function(int) onRemove;
  final void Function(int oldIdx, int newIdx) onReorder;
  const _VariantImagesRow({required this.row, required this.onUpload, required this.onRemove, required this.onReorder});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 72,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          ...row.imageUrls.asMap().entries.map((entry) {
            final idx = entry.key;
            final url = entry.value;
            return Stack(
              children: [
                Container(
                  width: 64, height: 64, margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: idx == 0 ? AppColors.primary : AppColors.border,
                      width: idx == 0 ? 2 : 1,
                    ),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(7),
                    child: Image.network(url, fit: BoxFit.cover),
                  ),
                ),
                if (idx == 0)
                  Positioned(
                    bottom: 2, left: 2,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(4)),
                      child: const Text('Cover', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w700)),
                    ),
                  ),
                Positioned(
                  top: 0, right: 8,
                  child: GestureDetector(
                    onTap: () => onRemove(idx),
                    child: Container(
                      width: 18, height: 18,
                      decoration: const BoxDecoration(color: AppColors.danger, shape: BoxShape.circle),
                      child: const Icon(Icons.close, size: 12, color: Colors.white),
                    ),
                  ),
                ),
              ],
            );
          }),
          if (row.imageUrls.length < 5)
            GestureDetector(
              onTap: () async {
                final picker = ImagePicker();
                final xfile = await picker.pickImage(source: ImageSource.gallery);
                if (xfile != null) await onUpload(xfile);
              },
              child: Container(
                width: 64, height: 64,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.border, style: BorderStyle.solid),
                  color: context.surfaceVariantColor,
                ),
                child: Icon(Icons.add_photo_alternate_outlined, color: context.onSurfaceMuted, size: 24),
              ),
            ),
        ],
      ),
    );
  }
}
```

### 3e — Submit payload

In the form submit, update variant serialization:

```dart
// was: 'image': row.imageUrl
'images': row.imageUrls,
```

### Verification checklist — Phase 3

- [ ] `flutter analyze` passes with no errors
- [ ] Open Add Product → Variants → tap the add-image button on a variant → gallery opens → image uploads and thumbnail appears
- [ ] Cover badge appears on the first image
- [ ] Tap × on a thumbnail → it removes
- [ ] Submit product → inspect network request → `variants[n].images` is a non-empty list
- [ ] Edit product → variant images load and show their thumbnails

---

## Phase 4 — Buyer-facing: Variant Image Swap on Product Details

**Files to change:**
- `frontend/src/pages/ProductDetails.tsx` (web)
- `frontend-mobile/lib/features/products/presentation/screens/product_detail_screen.dart` (mobile)

### 4a — Web: swap gallery when variant is selected

The web ProductDetails already has:
```ts
const [selectedImage, setSelectedImage] = useState(0);
const images = product.images || [product.image];
```

Add a derived `displayImages` that replaces with variant images when a variant is selected:

```ts
const displayImages = useMemo(() => {
  if (selectedVariant?.images?.length) return selectedVariant.images;
  return product.images?.length ? product.images : [product.image];
}, [selectedVariant, product]);
```

Replace all references to `images` variable (in the gallery `<img>` and thumbnail strip) with `displayImages`.

Also reset `selectedImage` to 0 when `selectedVariant` changes:
```ts
useEffect(() => { setSelectedImage(0); }, [selectedVariant]);
```

### 4b — Mobile: swap carousel when variant is selected

In `product_detail_screen.dart`, the `images` list used by `_ImageCarousel` is built at the top of `build()`:

```dart
// Current:
final images = product.images.isNotEmpty ? product.images : [product.image];

// Replace with:
final images = () {
  if (variantSelected != null && variantSelected.images.isNotEmpty) {
    return variantSelected.images;
  }
  return product.images.isNotEmpty ? product.images : [product.image];
}();
```

Also reset the carousel to page 0 when the selected variant changes. Add a `useEffect`-style reset: in `onAttrSelected` callback (inside the `_VariantSelector` `onAttrSelected` parameter), after `setState`, reset `_currentImagePage = 0` and call `_imageController.jumpToPage(0)`.

### Verification checklist — Phase 4

- [ ] Web: select a variant that has images → gallery changes to variant images; deselect → reverts to product images
- [ ] Web: select a variant with no images → gallery stays on product images (fallback)
- [ ] Mobile: same behavior as above with the `PageController`-driven carousel
- [ ] Mobile: selecting a different color variant swaps the hero image to that variant's cover

---

## Execution Order

```
Phase 1 (backend)  →  Phase 2 (web UI)  →  Phase 3 (Flutter UI)  →  Phase 4 (buyer view)
```

Each phase is self-contained. Phase 2 and 3 can run in parallel after Phase 1 is done.

## Files changed summary

| File | Change |
|---|---|
| `backend/src/models/Product.ts` | `image?: string` → `images: string[]` on variant |
| `backend/src/controllers/productController.ts` | Add `uploadVariantImage` handler |
| `backend/src/routes/productRoutes.ts` | Add `POST /products/variant-image` route |
| `backend/src/services/sellerService.ts` | `normalizedVariants` coercion (legacy compat) |
| `frontend/src/components/seller/ProductWizard.tsx` | `VariantRow.images[]`, thumbnail UI, upload/reorder/delete helpers |
| `frontend/src/services/sellerService.ts` | `uploadVariantImage(file)` helper |
| `frontend/src/pages/ProductDetails.tsx` | `displayImages` derived from selectedVariant |
| `frontend-mobile/.../product_entity.dart` | `images: List<String>`, `image` getter |
| `frontend-mobile/.../product_model.dart` | `fromJson` reads `images[]` with `image` fallback |
| `frontend-mobile/.../add_edit_product_screen.dart` | `_VariantRow.imageUrls`, `_VariantImagesRow` widget, submit payload |
| `frontend-mobile/.../seller_remote_datasource.dart` | `uploadVariantImage(XFile)` helper |
| `frontend-mobile/.../product_detail_screen.dart` | `displayImages` derived from selectedVariant |
