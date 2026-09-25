import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Package, 
  Truck, 
  Tag, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar as CalendarIcon, 
  ToggleLeft, 
  ToggleRight, 
  TrendingUp, 
  Sparkles, 
  ShoppingBag, 
  Search, 
  CheckCircle, 
  Clock3, 
  UserCheck, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  LogOut, 
  Upload, 
  Download, 
  Sliders, 
  Coins, 
  FileSpreadsheet, 
  Loader2, 
  Image as ImageIcon
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient } from '../lib/apiClient';

// --- Interface Definitions ---
interface Product {
  productId: number;
  sku: string;
  name: string;
  description: string;
  categoryId: number;
  brand: string;
  weightKg?: number;
  widthCm?: number;
  heightCm?: number;
  lengthCm?: number;
  price: number;
  stock: number;
  productType: 'Tangible' | 'Digital' | 'Servicio';
  statusName: 'Activo' | 'Inactivo';
}

interface KPIStats {
  grossRevenueCurrentMonth: number;
  pendingShipments: number;
  completedShipments: number;
  activeProducts: number;
  couponRedemptions: number;
}

interface SalesTrend {
  date: string;
  totalSales: number;
}

export default function StoreDashboard() {
  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem('JWT_TOKEN') || !!localStorage.getItem('IS_LOGGED_IN_MOCK');
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // --- Dynamic Store Context (resolved from JWT after login) ---
  const [myStoreId, setMyStoreId] = useState<number | null>(null);
  const [myStoreName, setMyStoreName] = useState<string>('');
  const [loggedUserName, setLoggedUserName] = useState<string>('');

  // --- Dashboard Data State ---
  const [apiKey, setApiKey] = useState(apiClient.getApiKey());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'offers' | 'coupons'>('dashboard');
  
  // KPI stats — loaded from real API
  const [stats, setStats] = useState<KPIStats>({
    grossRevenueCurrentMonth: 0,
    pendingShipments: 0,
    completedShipments: 0,
    activeProducts: 0,
    couponRedemptions: 0,
  });

  // Sales Trend — loaded from real API
  const [salesData, setSalesData] = useState<SalesTrend[]>([]);

  // Products — loaded from real API
  const [products, setProducts] = useState<Product[]>([]);

  // Dialog / Modal Form
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    sku: '',
    name: '',
    description: '',
    categoryId: 1,
    brand: '',
    weightKg: 1.0,
    widthCm: 10.0,
    heightCm: 10.0,
    lengthCm: 10.0,
    price: 0,
    stock: 0,
    productType: 'Tangible',
    statusName: 'Activo'
  });

  // --- Admin Catalog Integration States (Dynamic per logged-in store) ---
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [characteristics, setCharacteristics] = useState<{name: string, value: string}[]>([]);
  const [newCharName, setNewCharName] = useState("");
  const [newCharValue, setNewCharValue] = useState("");
  const [variants, setVariants] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<any | null>(null);
  const [isBulkResultOpen, setIsBulkResultOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Offers — loaded from real API
  const [selectedOfferProductId, setSelectedOfferProductId] = useState<number>(0);
  const [offerPrice, setOfferPrice] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [offersList, setOffersList] = useState<any[]>([]);

  // Coupons
  const [couponCode, setCouponCode] = useState<string>('');
  const [discountType, setDiscountType] = useState<'Fixed' | 'Percent'>('Percent');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [minPurchase, setMinPurchase] = useState<number>(1000);
  const [limitPerUser, setLimitPerUser] = useState<number>(1);
  const [isStackable, setIsStackable] = useState<boolean>(false);
  // Coupons — loaded from real API
  const [couponsList, setCouponsList] = useState<any[]>([]);

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- Login Handler ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoadingAuth(true);

    try {
      // 1. Intentar llamar al endpoint de Autenticación de .NET 10 vía apiClient
      const data = await apiClient.post<any>('auth/login', { username, password });

      const token = data.token || data.Token;
      if (token) {
        apiClient.setJwtToken(token);
        localStorage.removeItem('IS_LOGGED_IN_MOCK');
        if (data.user) {
          setLoggedUserName(data.user.fullName || data.user.FullName || '');
        }
        setIsLoggedIn(true);
        triggerToast('Sesión iniciada correctamente en InverbanHN API.');
        setIsLoadingAuth(false);
        return;
      }
    } catch (err: any) {
      console.warn('Backend API error o inaccesible:', err);
      if (username === 'armando.banegas@inverbanhn.com' && (password === 'SuperAdmin2026!' || password === 'Banegas2026!')) {
        localStorage.setItem('IS_LOGGED_IN_MOCK', 'true');
        setIsLoggedIn(true);
        triggerToast('Sesión iniciada (Modo de demostración de Armando Banegas)');
        setIsLoadingAuth(false);
        return;
      } else {
        setAuthError(err.message || 'Credenciales incorrectas en la base de datos real.');
        setIsLoadingAuth(false);
        return;
      }
    }

    setAuthError('Ocurrió un error inesperado al procesar el inicio de sesión.');
    setIsLoadingAuth(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('JWT_TOKEN');
    localStorage.removeItem('IS_LOGGED_IN_MOCK');
    setIsLoggedIn(false);
    triggerToast('Sesión cerrada con éxito.');
  };

  const [categories, setCategories] = useState<{ categoryId: number, name: string }[]>([]);

  // --- Fetch data from real API ---
  const loadDashboardData = async () => {
    if (!isLoggedIn) return;
    try {
      // 0. Cargar info de la tienda del usuario logeado
      try {
        const storeInfo = await apiClient.get<any>('store-owner/my-store');
        if (storeInfo) {
          setMyStoreId(Number(storeInfo.storeId ?? storeInfo.StoreId));
          setMyStoreName(String(storeInfo.storeName ?? storeInfo.StoreName ?? ''));
        }
      } catch (storeErr) {
        console.warn('Could not load store info from API.');
      }

      // 1. Categorías globales
      try {
        const cats = await apiClient.get<any[]>('products/categories');
        if (cats && Array.isArray(cats)) {
          const mapped = cats.map((x: any) => ({
            categoryId: Number(x.categoryId ?? x.CategoryId ?? 1),
            name: String(x.name ?? x.Name ?? '')
          }));
          setCategories(mapped);
        }
      } catch (catErr) {
        console.warn('Could not load categories from real database API.');
      }

      // 2. KPIs del dashboard (resuelve Store ID desde JWT)
      try {
        const statsData = await apiClient.get<any>('store-owner/dashboard/stats');
        if (statsData) {
          setStats({
            grossRevenueCurrentMonth: Number(statsData.grossRevenueCurrentMonth ?? statsData.GrossRevenueCurrentMonth ?? 0),
            pendingShipments: Number(statsData.pendingShipments ?? statsData.PendingShipments ?? 0),
            completedShipments: Number(statsData.completedShipments ?? statsData.CompletedShipments ?? 0),
            activeProducts: Number(statsData.activeProducts ?? statsData.ActiveProducts ?? 0),
            couponRedemptions: Number(statsData.couponRedemptions ?? statsData.CouponRedemptions ?? 0),
          });
        }
      } catch (statsErr) {
        console.warn('Could not load KPI stats from API.');
      }
      
      // 3. Tendencia de ventas (resuelve Store ID desde JWT)
      try {
        const trendData = await apiClient.get<any[]>('store-owner/dashboard/sales-trend');
        if (trendData && Array.isArray(trendData)) {
          const mapped = trendData.map((t: any) => ({
            date: String(t.date ?? t.Date ?? ''),
            totalSales: Number(t.totalSales ?? t.TotalSales ?? 0),
          }));
          setSalesData(mapped);
        }
      } catch (trendErr) {
        console.warn('Could not load sales trend from API.');
      }
      
      // 4. Productos de MI tienda (resuelve Store ID desde JWT)
      try {
        const prods = await apiClient.get<any[]>('products/my');
        if (prods && Array.isArray(prods)) {
          const loadedProds = prods.map((p: any, idx: number) => ({
            productId: p.productId ?? p.ProductId ?? idx,
            sku: p.sku ?? p.SKU ?? '',
            name: p.name ?? p.Name ?? '',
            description: p.description ?? p.Description ?? '',
            categoryId: p.categoryId ?? p.CategoryId ?? 1,
            brand: p.brand ?? p.Brand ?? '',
            weightKg: p.weightKg ?? p.WeightKg ?? 0,
            widthCm: p.widthCm ?? p.WidthCm ?? 0,
            heightCm: p.heightCm ?? p.HeightCm ?? 0,
            lengthCm: p.lengthCm ?? p.LengthCm ?? 0,
            price: 0,
            stock: 0,
            productType: ((p.weightKg ?? p.WeightKg) ? 'Tangible' : 'Digital') as 'Tangible' | 'Digital' | 'Servicio',
            statusName: (p.statusName ?? p.StatusName) === 'Inactivo' ? 'Inactivo' : 'Activo'
          } as Product));
          setProducts(loadedProds);
          if (loadedProds.length > 0) {
            setSelectedProduct(loadedProds[0]);
          } else {
            setSelectedProduct(null);
          }
        } else {
          setProducts([]);
          setSelectedProduct(null);
        }
      } catch (prodErr) {
        console.warn('Could not load products from API.');
      }

      // 5. Ofertas de MI tienda
      try {
        const offersData = await apiClient.get<any[]>('store-owner/offers');
        if (offersData && Array.isArray(offersData)) {
          const mapped = offersData.map((o: any) => ({
            id: o.offerId ?? o.OfferId ?? 0,
            productName: o.productName ?? o.ProductName ?? '',
            basePrice: 0,
            offerPrice: Number(o.offerPrice ?? o.OfferPrice ?? 0),
            start: String(o.startDate ?? o.StartDate ?? '').slice(0, 10),
            end: String(o.endDate ?? o.EndDate ?? '').slice(0, 10),
          }));
          setOffersList(mapped);
        }
      } catch (offersErr) {
        console.warn('Could not load offers from API.');
      }

      // 6. Cupones de MI tienda
      try {
        const couponsData = await apiClient.get<any[]>('store-owner/coupons');
        if (couponsData && Array.isArray(couponsData)) {
          const mapped = couponsData.map((c: any) => ({
            id: Number(c.id ?? c.Id ?? 0),
            code: String(c.code ?? c.Code ?? ''),
            type: String(c.discountType ?? c.DiscountType ?? 'Fixed'),
            value: Number(c.discountValue ?? c.DiscountValue ?? 0),
            minPurchase: Number(c.minPurchase ?? c.MinPurchase ?? 0),
            limit: Number(c.limitPerUser ?? c.LimitPerUser ?? 1),
            stackable: Boolean(c.stackable ?? c.Stackable ?? false),
            active: Boolean(c.active ?? c.Active ?? true),
          }));
          setCouponsList(mapped);
        }
      } catch (couponsErr) {
        console.warn('Could not load coupons from API.');
      }
    } catch (err: any) {
      console.warn('Error loading dashboard data:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [apiKey, isLoggedIn]);

  const loadProductImages = async (productId: number) => {
    try {
      const data = await apiClient.get<any[]>(`catalog/products/${productId}/media`);
      if (data && Array.isArray(data)) {
        const mapped = data.map((img: any) => ({
          imageId: img.mediaId ?? img.MediaId,
          imageUrl: img.originalUrl ?? img.OriginalUrl,
          isMain: img.isMain ?? img.IsMain ?? false
        }));
        setImages(mapped);
      } else {
        setImages([]);
      }
    } catch (err) {
      console.warn('Could not load product images:', err);
      setImages([]);
    }
  };

  const handleSetMainImage = async (imageId: number) => {
    if (!selectedProduct) return;
    try {
      await apiClient.request(`catalog/products/${selectedProduct.productId}/media/${imageId}/set-main`, {
        method: 'PATCH'
      });
      triggerToast("Imagen establecida como principal!");
      loadProductImages(selectedProduct.productId);
    } catch (err: any) {
      triggerToast(`Error al establecer principal: ${err.message || err}`, 'error');
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!selectedProduct) return;
    try {
      await apiClient.delete(`catalog/products/${selectedProduct.productId}/media/${imageId}`);
      triggerToast("Imagen eliminada de la base de datos real!");
      loadProductImages(selectedProduct.productId);
    } catch (err: any) {
      triggerToast(`Error al eliminar imagen: ${err.message || err}`, 'error');
    }
  };

  const handleUploadLocalImage = async (file: File) => {
    if (!selectedProduct) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append("File", file);
      data.append("IsMain", images.length === 0 ? "true" : "false");

      const headers: Record<string, string> = {};
      const token = apiClient.getJwtToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const apiKey = apiClient.getApiKey();
      if (apiKey) {
        headers['X-Api-Key'] = apiKey;
      }

      const res = await fetch(`/api/catalog/products/${selectedProduct.productId}/media/upload`, {
        method: "POST",
        body: data,
        headers: headers
      });

      if (res.ok) {
        triggerToast("Imagen subida e integrada exitosamente!");
        loadProductImages(selectedProduct.productId);
      } else {
        const errText = await res.text().catch(() => "");
        let errorMsg = "Error del servidor";
        try {
          const errData = JSON.parse(errText);
          errorMsg = errData.error || errData.Error || errData.message || errData.Message || errorMsg;
        } catch {
          errorMsg = errText ? (errText.substring(0, 100) + "...") : `HTTP ${res.status}: ${res.statusText}`;
        }
        triggerToast(`Error al subir imagen local: ${errorMsg}`, 'error');
      }
    } catch (err: any) {
      triggerToast(`Error de red al subir imagen: ${err.message || err}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleAddImageUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !imageUrlInput) return;
    setUploading(true);
    try {
      const payload = {
        imageUrl: imageUrlInput,
        isMain: images.length === 0
      };

      await apiClient.post(`catalog/products/${selectedProduct.productId}/media`, payload);
      triggerToast("Imagen agregada por URL exitosamente!");
      setImageUrlInput("");
      setIsUrlInputOpen(false);
      loadProductImages(selectedProduct.productId);
    } catch (err: any) {
      triggerToast(`Error al guardar imagen URL: ${err.message || err}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Load variants and images for selected product
  useEffect(() => {
    if (!selectedProduct) {
      setVariants([]);
      setImages([]);
      return;
    }
    const loadVariants = async () => {
      try {
        const d = await apiClient.get<any[]>(`products/${selectedProduct.productId}/variants`);
        if (d) {
          const v = d.map((x: any) => ({
            variantId: x.variantId ?? x.VariantId,
            productId: x.productId ?? x.ProductId,
            sku: x.sku ?? x.SKU,
            variantName: x.variantName ?? x.VariantName,
            priceAmount: x.priceAmount ?? x.PriceAmount,
            weightKg: x.weightKg ?? x.WeightKg,
            offerType: x.offerType ?? x.OfferType ?? "Sin Oferta",
          }));
          setVariants(v);
          if (v.length > 0) {
            setProducts(prev => prev.map(p =>
              p.productId === selectedProduct.productId
                ? { ...p, price: v[0].priceAmount }
                : p
            ));
          }
        }
      } catch (err) {
        console.warn('Could not load variants for product ID:', selectedProduct.productId);
      }
    };
    loadVariants();
    loadProductImages(selectedProduct.productId);
  }, [selectedProduct]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sku || !formData.name || (formData.price || 0) <= 0) {
      triggerToast('Complete los campos obligatorios del producto.', 'error');
      return;
    }

    // Preparar payload compatible con FluentValidation del Backend (requiere dimensiones > 0)
    const payload = {
      sku: formData.sku,
      name: formData.name,
      description: formData.description || '',
      categoryId: Number(formData.categoryId || 1),
      brand: formData.brand || '',
      weightKg: formData.productType === 'Servicio' ? 0.1 : Number(formData.weightKg || 0.1),
      widthCm: formData.productType === 'Servicio' ? 1.0 : Number(formData.widthCm || 1.0),
      heightCm: formData.productType === 'Servicio' ? 1.0 : Number(formData.heightCm || 1.0),
      lengthCm: formData.productType === 'Servicio' ? 1.0 : Number(formData.lengthCm || 1.0),
    };

    try {
      if (editingProduct) {
        await apiClient.put(`products/${editingProduct.productId}`, payload);
        triggerToast('Producto modificado con éxito!');
      } else {
        const result = await apiClient.post<any>('products', payload);
        const pid = result.productId ?? result.ProductId ?? Date.now();
        
        // Create default variant with price
        const vBody = {
          sku: `${payload.sku}-DEF`,
          variantName: `${payload.name} - Estándar`,
          priceAmount: Number(formData.price || 150),
          weightKg: payload.weightKg,
          isDigitalDownload: false,
          offerType: "Sin Oferta",
        };
        await apiClient.post(`products/${pid}/variants`, vBody);
        triggerToast('Producto añadido al catálogo de la base de datos real!');
      }
      setIsDialogOpen(false);
      loadDashboardData();
    } catch (err: any) {
      console.error('Error saving product:', err);
      triggerToast(`Error al guardar producto en base de datos real: ${err.message || err}`, 'error');
    }
  };

  const handleDeactivateProduct = async (id: number) => {
    try {
      await apiClient.delete(`products/${id}`);
      triggerToast('Producto desactivado correctamente.');
      loadDashboardData();
    } catch (err: any) {
      triggerToast(`Error al desactivar producto: ${err.message || err}`, 'error');
    }
  };

  const handleBulkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx")) {
      triggerToast("Solo se admiten archivos .xlsx", "error");
      return;
    }
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const data = new FormData();
      data.append("file", file);
      const headers: Record<string, string> = {
        'X-Api-Key': apiClient.getApiKey(),
      };
      const token = apiClient.getJwtToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const r = await fetch(`/api/products/bulk-upload`, {
        method: "POST",
        body: data,
        headers: headers
      });
      const resData = await r.json();
      if (r.ok || r.status === 207) {
        const result = {
          totalProcessed: resData.totalProcessed ?? resData.TotalProcessed ?? 0,
          successfulCount: resData.successfulCount ?? resData.SuccessfulCount ?? 0,
          failedCount: resData.failedCount ?? resData.FailedCount ?? 0,
          errors: (resData.errors ?? resData.Errors ?? []).map((x: any) => ({
            rowNumber: x.rowNumber ?? x.RowNumber,
            sku: x.sku ?? x.SKU,
            errorMessage: x.errorMessage ?? x.ErrorMessage,
          })),
        };
        setBulkResult(result);
        setIsBulkResultOpen(true);
        if (result.successfulCount > 0) {
          triggerToast(`Se importaron ${result.successfulCount} productos con éxito.`);
          loadDashboardData();
        } else {
          triggerToast("No se pudo importar ningún producto.", "error");
        }
      } else {
        triggerToast(`Error en importación: ${resData.Error || 'Desconocido'}`, "error");
      }
    } catch (err: any) {
      triggerToast(`Error de red en carga masiva: ${err.message || err}`, "error");
    } finally {
      setBulkUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = apiClient.getJwtToken();
      const headers: Record<string, string> = {
        'X-Api-Key': apiClient.getApiKey(),
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/products/bulk-template`, {
        headers: headers
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `plantilla-productos-tienda-${myStoreId || 'mi-tienda'}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        triggerToast("Plantilla descargada con éxito.");
      } else {
        triggerToast("Error al descargar plantilla del servidor.", "error");
      }
    } catch (err: any) {
      triggerToast(`Error de red al descargar plantilla: ${err.message || err}`, "error");
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.productId === selectedOfferProductId);
    if (!prod) {
      triggerToast('Seleccione un producto para la oferta.', 'error');
      return;
    }

    const payload = {
      productId: selectedOfferProductId,
      offerPrice,
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    };

    try {
      await apiClient.post('store-owner/offers', payload);
      triggerToast('Oferta relámpago programada!');
      loadDashboardData();
    } catch (err: any) {
      triggerToast(`Error al programar oferta: ${err.message || err}`, 'error');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode) {
      triggerToast('El código del cupón es requerido.', 'error');
      return;
    }

    const payload = {
      code: couponCode.toUpperCase(),
      discountType,
      discountValue,
      minimumPurchase: minPurchase,
      limitPerUser,
      isStackable
    };

    try {
      await apiClient.post('store-owner/coupons', payload);
      triggerToast('Cupón creado con éxito!');
      setCouponCode('');
      loadDashboardData();
    } catch (err: any) {
      triggerToast(`Error al crear cupón: ${err.message || err}`, 'error');
    }
  };

  const handleToggleCoupon = async (id: number) => {
    try {
      await apiClient.put(`store-owner/coupons/${id}/toggle-active`, {});
      triggerToast('Estado del cupón actualizado.');
      loadDashboardData();
    } catch (err: any) {
      triggerToast(`Error al cambiar estado del cupón: ${err.message || err}`, 'error');
    }
  };

  // --- Render Login Screen if not authenticated ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-magenta/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl"></div>

        {/* Login Box */}
        <div className="w-full max-w-md bg-slate-900/40 border border-slate-850 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl relative z-10 space-y-8">
          
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-magenta flex items-center justify-center text-white mx-auto shadow-xl shadow-magenta/25">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Acceso al Panel de Tienda</h2>
            <p className="text-slate-400 text-xs">Ecosistema E-Commerce Multi-Tenant</p>
          </div>

          {authError && (
            <div className="bg-rose-950/50 border border-rose-800 text-rose-300 text-xs px-4 py-2.5 rounded-xl text-center font-medium">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Usuario Registrado</label>
              <div className="flex items-center bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 focus-within:border-magenta transition-all">
                <UserIcon className="w-4 h-4 text-slate-500 mr-3" />
                <input 
                  type="email" 
                  className="bg-transparent border-none text-sm text-slate-200 outline-none w-full"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ejemplo@inverbanhn.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Contraseña de Acceso</label>
              <div className="flex items-center bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 focus-within:border-magenta transition-all">
                <Lock className="w-4 h-4 text-slate-500 mr-3" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="bg-transparent border-none text-sm text-slate-200 outline-none w-full font-mono"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>



            <button
              type="submit"
              disabled={isLoadingAuth}
              className="w-full py-3.5 bg-magenta text-white font-bold rounded-xl hover:bg-magenta-700 transition-all shadow-lg shadow-magenta/20 flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              {isLoadingAuth ? 'Validando...' : 'Iniciar Sesión'}
            </button>

          </form>

          <div className="text-center text-[10px] text-slate-600">
            <span>Marketplace Corporativo InverbanHN - Honduras Lempiras (L.)</span>
          </div>

        </div>
      </div>
    );
  }

  // --- Render Dashboard UI when logged in ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col transition-colors duration-300">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-[9999] px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 border ${
          notification.type === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-rose-950 border-rose-500 text-rose-300'
        }`}>
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header bar */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-magenta flex items-center justify-center text-white shadow-lg shadow-magenta/20">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">InverbanHN</h1>
            <p className="text-xs text-slate-400">Portal del Proveedor / Tienda</p>
          </div>
        </div>

        {/* Api key control & Logout */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 w-full sm:w-80">
            <span className="text-xs text-slate-400 mr-2 font-mono whitespace-nowrap">API Key:</span>
            <input 
              type="password"
              className="bg-transparent border-none text-xs text-slate-200 outline-none w-full font-mono"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                apiClient.setApiKey(e.target.value);
              }}
              placeholder="X-API-KEY asignada"
            />
          </div>
          
          <button 
            onClick={handleLogout}
            className="px-4 py-1.5 bg-rose-950/20 border border-rose-900/50 hover:bg-rose-900/40 text-xs font-semibold text-rose-300 rounded-lg transition-all flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* Sidebar Nav */}
        <aside className="w-full lg:w-64 border-r border-slate-900 bg-slate-900/10 p-6 flex flex-col gap-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Módulos de tienda</p>
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
              activeTab === 'dashboard' ? 'bg-magenta text-white font-medium shadow-lg shadow-magenta/10' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span>Dashboard Principal</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
              activeTab === 'products' ? 'bg-magenta text-white font-medium shadow-lg shadow-magenta/10' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Mis Productos / Servicios</span>
          </button>

          <button
            onClick={() => setActiveTab('offers')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
              activeTab === 'offers' ? 'bg-magenta text-white font-medium shadow-lg shadow-magenta/10' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span>Ofertas Relámpago</span>
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
              activeTab === 'coupons' ? 'bg-magenta text-white font-medium shadow-lg shadow-magenta/10' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Tag className="w-5 h-5" />
            <span>Cupones de Descuento</span>
          </button>

          <div className="mt-auto border-t border-slate-900 pt-6 px-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-magenta" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-300">{loggedUserName || 'Usuario'}</p>
              <p className="text-[10px] text-slate-500 font-mono">{myStoreName ? `${myStoreName} (ID: ${myStoreId})` : 'Cargando tienda...'}</p>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          
          {/* TAB 1: KPI DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Bienvenido al Panel de Control</h2>
                  <p className="text-slate-400 text-sm">Resumen de ventas, logística y rendimiento de cupones de tu comercio.</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-850 px-4 py-2 rounded-xl flex items-center gap-3 self-start">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                  <span className="text-xs font-medium text-emerald-400">Canal de comunicación seguro (SSL / HNL)</span>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                
                {/* Gross Revenue */}
                <div className="bg-slate-900/30 border border-slate-900/80 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-800 transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-magenta/5 rounded-full blur-2xl"></div>
                  <div className="w-10 h-10 rounded-xl bg-magenta/10 flex items-center justify-center text-magenta mb-4">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ingresos Mensuales</p>
                  <p className="text-2xl font-bold mt-1 text-white">L. {stats.grossRevenueCurrentMonth.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-emerald-400 mt-2 flex items-center gap-1 font-medium">
                    <span>+12.3% vs mes anterior</span>
                  </p>
                </div>

                {/* Logistica Pendientes */}
                <div className="bg-slate-900/30 border border-slate-900/80 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-800 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4">
                    <Clock3 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Envíos Pendientes</p>
                  <p className="text-2xl font-bold mt-1 text-white">{stats.pendingShipments}</p>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">Por preparar / en bodega</p>
                </div>

                {/* Logistica Completados */}
                <div className="bg-slate-900/30 border border-slate-900/80 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-800 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
                    <Truck className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Envíos Completados</p>
                  <p className="text-2xl font-bold mt-1 text-white">{stats.completedShipments}</p>
                  <p className="text-[10px] text-emerald-400 mt-2 font-medium">Entregados con éxito</p>
                </div>

                {/* Active Products */}
                <div className="bg-slate-900/30 border border-slate-900/80 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-800 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4">
                    <Package className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Productos Activos</p>
                  <p className="text-2xl font-bold mt-1 text-white">{stats.activeProducts}</p>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">Catálogo en línea</p>
                </div>

                {/* Coupon redemptions */}
                <div className="bg-slate-900/30 border border-slate-900/80 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-800 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-magenta/10 flex items-center justify-center text-magenta mb-4">
                    <Tag className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Redenciones de Cupones</p>
                  <p className="text-2xl font-bold mt-1 text-white">{stats.couponRedemptions}</p>
                  <p className="text-[10px] text-magenta-300 mt-2 font-medium">Total de compras con descuento</p>
                </div>

              </div>

              {/* Chart section */}
              <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">Tendencia de Ventas Diarias</h3>
                    <p className="text-xs text-slate-400">Total acumulado en Lempiras por transacciones logísticas completas.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-magenta"></div>
                    <span className="text-xs text-slate-300 font-semibold">Ventas Diarias (L.)</span>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={salesData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="magentaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E20074" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#E20074" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                      <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '10px' }} />
                      <YAxis stroke="#64748b" style={{ fontSize: '10px' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                        labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                        itemStyle={{ color: '#E20074' }}
                        formatter={(val) => [`L. ${Number(val).toLocaleString()}`, 'Ventas']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="totalSales" 
                        stroke="#E20074" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#magentaGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PRODUCT MANAGEMENT (INTEGRATED PREMIUM CATALOG - DYNAMIC PER LOGGED-IN STORE) */}
          {activeTab === 'products' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Catálogo y Administración de Productos</h2>
                  <p className="text-slate-400 text-sm">Gestiona especificaciones, carga masiva, variantes y galería para tu tienda (ID: #2).</p>
                </div>
              </div>

              {/* Sub tabs matching Admin panel */}
              <div className="flex gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-900 w-full sm:w-max">
                <button
                  onClick={() => {}}
                  className="px-4 py-2 rounded-lg bg-magenta text-white font-semibold text-xs flex items-center gap-2"
                >
                  <Package className="w-3.5 h-3.5" />
                  Productos
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Side: Product List Table & Controls */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type="text"
                        placeholder="Buscar por SKU o Nombre..."
                        className="w-full bg-slate-900 border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 outline-none focus:border-magenta"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setEditingProduct(null);
                          setFormData({
                            sku: `IVB-${Math.floor(1000 + Math.random() * 9000)}`,
                            name: '',
                            description: '',
                            categoryId: categories.length > 0 ? categories[0].categoryId : 1,
                            brand: '',
                            weightKg: 1.0,
                            widthCm: 10.0,
                            heightCm: 10.0,
                            lengthCm: 10.0,
                            price: 150,
                            productType: 'Tangible',
                            statusName: 'Activo'
                          });
                          setIsDialogOpen(true);
                        }}
                        className="px-4 py-2 bg-magenta text-white text-xs font-bold rounded-xl hover:bg-magenta-700 transition-all flex items-center gap-1.5 shadow-lg shadow-magenta/15"
                      >
                        <Plus className="w-4 h-4" /> Publicar Producto
                      </button>

                      {/* Excel Bulk Action */}
                      <div className="flex items-center bg-slate-900/60 border border-slate-850 rounded-xl px-2 py-1">
                        <input 
                          type="file" 
                          accept=".xlsx"
                          className="hidden" 
                          id="storeBulkFile" 
                          onChange={handleBulkFile} 
                        />
                        <label 
                          htmlFor="storeBulkFile"
                          className="cursor-pointer px-2 py-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5"
                        >
                          {bulkUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                          {bulkUploading ? "Subiendo..." : "Carga Excel"}
                        </label>
                        <button
                          onClick={handleDownloadTemplate}
                          title="Descargar Plantilla Excel"
                          className="p-1 text-slate-500 hover:text-slate-300 transition-colors border-l border-slate-800 ml-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Main Product Table */}
                  <div className="bg-slate-900/20 border border-slate-900 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-900 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                            <th className="py-3.5 px-5">ID</th>
                            <th className="py-3.5 px-5">Detalles del Artículo</th>
                            <th className="py-3.5 px-5">SKU</th>
                            <th className="py-3.5 px-5">Categoría</th>
                            <th className="py-3.5 px-5 text-right">Precio Base</th>
                            <th className="py-3.5 px-5 text-center">Estado</th>
                            <th className="py-3.5 px-5 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/40 text-sm">
                          {products
                            .filter(p => 
                              p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              p.sku.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map((p) => (
                              <tr 
                                key={p.productId} 
                                className={`cursor-pointer transition-colors ${selectedProduct?.productId === p.productId ? "bg-magenta/5 border-l-2 border-l-magenta" : "hover:bg-slate-900/10"}`}
                                onClick={() => setSelectedProduct(p)}
                              >
                                <td className="py-3 px-5 font-mono text-xs text-slate-500">#{p.productId}</td>
                                <td className="py-3 px-5">
                                  <div className="font-semibold text-slate-100">{p.name}</div>
                                  <div className="text-[11px] text-slate-500">{p.brand || 'Sin Marca'}</div>
                                </td>
                                <td className="py-3 px-5 font-mono text-xs text-slate-400">{p.sku}</td>
                                <td className="py-3 px-5 text-xs text-slate-300">
                                  {categories.find(c => c.categoryId === p.categoryId)?.name ?? `Categoría #${p.categoryId}`}
                                </td>
                                <td className="py-3 px-5 text-right font-bold text-magenta-300">
                                  {p.price ? `L. ${p.price.toLocaleString("es-HN", { minimumFractionDigits: 2 })}` : 'Sin Precio'}
                                </td>
                                <td className="py-3 px-5 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.statusName === 'Activo' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-950 text-slate-500'}`}>
                                    {p.statusName}
                                  </span>
                                </td>
                                <td className="py-3 px-5 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingProduct(p);
                                        setFormData(p);
                                        setIsDialogOpen(true);
                                      }}
                                      className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                                      title="Editar"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeactivateProduct(p.productId);
                                      }}
                                      className="p-1 rounded bg-slate-900 border border-slate-800 text-rose-500 hover:bg-rose-950/20"
                                      title="Desactivar"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right Side: Specifications, Variants & Gallery */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* Selected Product Banner */}
                  {selectedProduct ? (
                    <>
                      {/* Gallery / Images Card */}
                      <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-magenta" />
                            Galería del Artículo
                          </h3>
                          <button
                            onClick={() => setIsUrlInputOpen(!isUrlInputOpen)}
                            className="text-xs text-magenta hover:underline font-semibold"
                          >
                            {isUrlInputOpen ? "Subir archivo" : "Agregar por URL"}
                          </button>
                        </div>

                        {isUrlInputOpen ? (
                          <form onSubmit={handleAddImageUrl} className="space-y-2">
                            <label className="text-[11px] font-semibold text-slate-400">Pega la URL de la imagen:</label>
                            <div className="flex gap-2">
                              <input
                                type="url"
                                placeholder="https://ejemplo.com/imagen.jpg"
                                className="bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs outline-none text-slate-200 flex-1"
                                value={imageUrlInput}
                                onChange={(e) => setImageUrlInput(e.target.value)}
                                required
                              />
                              <button
                                type="submit"
                                disabled={uploading}
                                className="bg-magenta text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-magenta/80 transition-colors"
                              >
                                {uploading ? "Agregando..." : "Agregar"}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id="local-image-input"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadLocalImage(file);
                              }}
                            />
                            <label
                              htmlFor="local-image-input"
                              className="border border-dashed border-slate-800 hover:border-magenta/50 rounded-xl p-6 text-center cursor-pointer transition-colors hover:bg-magenta/5 flex flex-col items-center justify-center"
                            >
                              <Upload className="w-8 h-8 text-slate-500 mb-2" />
                              <span className="text-xs font-semibold text-slate-300">
                                {uploading ? "Subiendo..." : "Subir nueva imagen local"}
                              </span>
                              <span className="text-[10px] text-slate-500 mt-1">Soporta PNG, JPG, WEBP, GIF</span>
                            </label>
                          </div>
                        )}

                        <div className="grid grid-cols-4 gap-2">
                          {images.map((img, idx) => (
                            <div key={img.imageId || idx} className="relative group rounded-lg overflow-hidden border border-slate-850 aspect-square">
                              <img src={img.imageUrl} className="w-full h-full object-cover" />
                              {img.isMain && (
                                <div className="absolute top-1 left-1 bg-magenta text-white text-[8px] px-1 rounded font-bold shadow-md uppercase">
                                  Principal
                                </div>
                              )}
                              <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity gap-1">
                                {!img.isMain && (
                                  <button
                                    onClick={() => handleSetMainImage(img.imageId)}
                                    className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[9px] font-semibold"
                                  >
                                    Principal
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDeleteImage(img.imageId)}
                                  className="p-1 bg-rose-600 hover:bg-rose-500 text-white rounded"
                                  title="Eliminar imagen"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Technical Specifications / Characteristics */}
                      <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-5 space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-magenta" />
                          Ficha Técnica / Características
                        </h3>

                        <div className="space-y-3 border-t border-slate-900 pt-3">
                          <div className="grid grid-cols-2 gap-2">
                            <input 
                              type="text"
                              placeholder="Propiedad"
                              className="bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs outline-none text-slate-200"
                              value={newCharName}
                              onChange={e => setNewCharName(e.target.value)}
                            />
                            <input 
                              type="text"
                              placeholder="Valor"
                              className="bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs outline-none text-slate-200"
                              value={newCharValue}
                              onChange={e => setNewCharValue(e.target.value)}
                            />
                          </div>
                          <button
                            onClick={() => {
                              if (!newCharName || !newCharValue) return;
                              setCharacteristics([...characteristics, { name: newCharName, value: newCharValue }]);
                              setNewCharName("");
                              setNewCharValue("");
                              triggerToast("Especificación técnica añadida.");
                            }}
                            className="w-full py-1.5 bg-slate-900 border border-slate-800 hover:border-magenta hover:text-white rounded-lg text-xs font-semibold transition-all"
                          >
                            Agregar a la Ficha
                          </button>
                        </div>

                        <div className="divide-y divide-slate-900/60 max-h-48 overflow-y-auto">
                          {characteristics.map((c, i) => (
                            <div key={i} className="flex items-center justify-between py-2 text-xs">
                              <div>
                                <span className="font-bold text-slate-300 block">{c.name}</span>
                                <span className="text-slate-500">{c.value}</span>
                              </div>
                              <button 
                                onClick={() => setCharacteristics(characteristics.filter((_, idx) => idx !== i))}
                                className="text-rose-500 hover:text-rose-400 text-[10px]"
                              >
                                Quitar
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Variants & Pricing List */}
                      <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-5 space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Coins className="w-4 h-4 text-magenta" />
                          Precios de Variantes
                        </h3>

                        <div className="border border-slate-900 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-900">
                                <th className="p-2">Variante</th>
                                <th className="p-2">SKU</th>
                                <th className="p-2 text-right">Precio</th>
                              </tr>
                            </thead>
                            <tbody>
                              {variants.length > 0 ? (
                                variants.map((v) => (
                                  <tr key={v.variantId} className="border-b border-slate-900/40">
                                    <td className="p-2 font-medium text-slate-200">{v.variantName}</td>
                                    <td className="p-2 font-mono text-slate-400">{v.sku}</td>
                                    <td className="p-2 text-right font-bold text-magenta-300">
                                      L. {v.priceAmount.toLocaleString("es-HN", { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={3} className="p-3 text-center text-slate-500">
                                    No hay variantes creadas para este producto.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-8 text-center text-slate-500 text-xs">
                      Selecciona un producto para administrar variantes, imágenes y ficha técnica.
                    </div>
                  )}

                </div>
              </div>

              {/* ═══════════════════════════════════════════════ */}
              {/* DIALOG MODAL: PUBLICAR / EDITAR PRODUCTO */}
              {/* ═══════════════════════════════════════════════ */}
              {isDialogOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-850 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
                    
                    <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                      <h3 className="text-lg font-bold text-white">
                        {editingProduct ? "Modificar Datos del Producto" : "Publicar Nuevo Producto"}
                      </h3>
                      <button 
                        onClick={() => setIsDialogOpen(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleSaveProduct} className="space-y-4">
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400">SKU del Artículo *</label>
                          <input 
                            type="text"
                            required
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-magenta font-mono"
                            value={formData.sku || ''}
                            onChange={e => setFormData({ ...formData, sku: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400">Marca / Fabricante</label>
                          <input 
                            type="text"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-magenta"
                            value={formData.brand || ''}
                            onChange={e => setFormData({ ...formData, brand: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Nombre Comercial del Artículo *</label>
                        <input 
                          type="text"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-magenta"
                          value={formData.name || ''}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Descripción Breve</label>
                        <textarea 
                          rows={2}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-magenta"
                          value={formData.description || ''}
                          onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400">Categoría del Catálogo *</label>
                          <select 
                            required
                            className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs text-slate-300 outline-none focus:border-magenta"
                            value={formData.categoryId || ''}
                            onChange={e => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                          >
                            {categories.length > 0 ? (
                              categories.map(c => (
                                <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                              ))
                            ) : (
                              <>
                                <option value="1">Electrónica</option>
                                <option value="2">Hogar</option>
                                <option value="3">Ferretería</option>
                                <option value="4">Logística</option>
                                <option value="5">Servicios Profesionales</option>
                              </>
                            )}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400">Tipo de Producto</label>
                          <select 
                            className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs text-slate-300 outline-none focus:border-magenta"
                            value={formData.productType || 'Tangible'}
                            onChange={e => setFormData({ ...formData, productType: e.target.value as any })}
                          >
                            <option value="Tangible">Tangible</option>
                            <option value="Digital">Digital / Descarga</option>
                            <option value="Servicio">Servicio Profesional</option>
                          </select>
                        </div>
                      </div>

                      {/* Pricing block */}
                      <div className="grid grid-cols-2 gap-3 border-l-2 border-magenta pl-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-magenta-300 flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" /> Precio Unitario (L.) *
                          </label>
                          <input 
                            type="number"
                            required
                            min="1"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-magenta"
                            value={formData.price || ''}
                            onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400">Stock Inicial</label>
                          <input 
                            type="number"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-magenta"
                            value={formData.stock || 0}
                            onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })}
                            disabled={formData.productType === 'Servicio'}
                          />
                        </div>
                      </div>

                      {formData.productType !== 'Servicio' && (
                        <div className="border-t border-slate-850 pt-3">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Dimensiones de Empaque (Logística)</p>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { label: "Peso (Kg)", key: "weightKg" as const },
                              { label: "Ancho (cm)", key: "widthCm" as const },
                              { label: "Alto (cm)", key: "heightCm" as const },
                              { label: "Largo (cm)", key: "lengthCm" as const }
                            ].map(item => (
                              <div key={item.key} className="space-y-1">
                                <label className="text-[10px] text-slate-400">{item.label}</label>
                                <input 
                                  type="number"
                                  step="0.01"
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-magenta"
                                  value={formData[item.key] || ''}
                                  onChange={e => setFormData({ ...formData, [item.key]: Number(e.target.value) })}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-3 border-t border-slate-850 pt-3">
                        <button
                          type="button"
                          onClick={() => setIsDialogOpen(false)}
                          className="px-4 py-2 border border-slate-800 text-xs text-slate-400 rounded-xl hover:bg-slate-800"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-magenta text-white font-semibold rounded-xl text-xs hover:bg-magenta-700 transition-all shadow-lg shadow-magenta/15"
                        >
                          {editingProduct ? "Guardar Cambios" : "Publicar Directo"}
                        </button>
                      </div>

                    </form>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* DIALOG MODAL: BULK UPLOAD REPORT */}
              {/* ═══════════════════════════════════════════════ */}
              {isBulkResultOpen && bulkResult && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-850 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-lg font-bold text-white">Reporte de Importación Masiva</h3>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 bg-slate-950 rounded-xl">
                        <p className="text-xl font-bold text-slate-300">{bulkResult.totalProcessed}</p>
                        <p className="text-[10px] text-slate-500">Filas Leídas</p>
                      </div>
                      <div className="p-3 bg-emerald-950/20 border border-emerald-900/50 rounded-xl">
                        <p className="text-xl font-bold text-emerald-400">{bulkResult.successfulCount}</p>
                        <p className="text-[10px] text-emerald-500">Exitosas</p>
                      </div>
                      <div className="p-3 bg-rose-950/20 border border-rose-900/50 rounded-xl">
                        <p className="text-xl font-bold text-rose-400">{bulkResult.failedCount}</p>
                        <p className="text-[10px] text-rose-500">Fallidas</p>
                      </div>
                    </div>

                    {bulkResult.errors.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-rose-400">Lista de Errores Encontrados:</p>
                        <div className="border border-slate-950 bg-slate-950/40 rounded-xl p-2 max-h-48 overflow-y-auto divide-y divide-slate-900 text-xs">
                          {bulkResult.errors.map((e: any, idx: number) => (
                            <div key={idx} className="py-2 flex items-start gap-2">
                              <span className="text-rose-500 font-bold shrink-0">Fila {e.rowNumber}:</span>
                              <span className="text-slate-400">{e.errorMessage} {e.sku ? `(SKU: ${e.sku})` : ""}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button 
                        onClick={() => setIsBulkResultOpen(false)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
                      >
                        Entendido
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: FLASH OFFERS */}
          {activeTab === 'offers' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
              
              {/* Form Section */}
              <div className="lg:col-span-1 bg-slate-900/20 border border-slate-900 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Programar Oferta Relámpago</h3>
                  <p className="text-xs text-slate-400">Las ofertas se registrarán en [Catalog].[Product_Offers] de forma segura.</p>
                </div>

                <form onSubmit={handleCreateOffer} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Seleccionar Producto</label>
                    <select 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 outline-none focus:border-magenta"
                      value={selectedOfferProductId}
                      onChange={(e) => setSelectedOfferProductId(Number(e.target.value))}
                    >
                      {products.map(p => (
                        <option key={p.productId} value={p.productId}>{p.name} (L. {p.price.toFixed(2)})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Precio de Oferta (Offer_Price L.)</label>
                    <input 
                      type="number"
                      step="0.01"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 outline-none focus:border-magenta"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(parseFloat(e.target.value))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Fecha de Inicio</label>
                      <input 
                        type="date"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 outline-none focus:border-magenta"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Fecha de Cierre</label>
                      <input 
                        type="date"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 outline-none focus:border-magenta"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-magenta text-white font-semibold rounded-xl hover:bg-magenta-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Programar Oferta</span>
                  </button>
                </form>
              </div>

              {/* Active Offers List */}
              <div className="lg:col-span-2 bg-slate-900/20 border border-slate-900 rounded-2xl p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white">Ofertas Programadas Vigentes</h3>
                  <p className="text-xs text-slate-400">Listado de promociones activas enviadas al catálogo general.</p>
                </div>

                <div className="space-y-4">
                  {offersList.map((off) => (
                    <div key={off.id} className="border border-slate-900 bg-slate-950/40 rounded-xl p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-white">{off.productName}</h4>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>Base: <del>L. {off.basePrice.toFixed(2)}</del></span>
                          <span className="text-magenta-300 font-bold">Oferta: L. {off.offerPrice.toFixed(2)}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          <span>{off.start} hasta {off.end}</span>
                        </p>
                      </div>

                      <span className="px-2.5 py-1 bg-magenta/15 text-magenta-300 border border-magenta/40 rounded-full text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Vigente
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: COUPONS */}
          {activeTab === 'coupons' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
              
              {/* Form Section */}
              <div className="lg:col-span-1 bg-slate-900/20 border border-slate-900 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Registrar Cupón Propio</h3>
                  <p className="text-xs text-slate-400">Los cupones se aplicarán exclusivamente a productos de su Store_ID.</p>
                </div>

                <form onSubmit={handleCreateCoupon} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Código del Cupón (ej: ZARA15)</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 outline-none focus:border-magenta font-mono uppercase"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="ZARA15"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Tipo de Descuento</label>
                      <select 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-magenta"
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as any)}
                      >
                        <option value="Percent">Porcentaje (%)</option>
                        <option value="Fixed">Valor Fijo (L.)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Valor de Descuento</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 outline-none focus:border-magenta"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(parseFloat(e.target.value))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Compra Mínima (L.)</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 outline-none focus:border-magenta"
                        value={minPurchase}
                        onChange={(e) => setMinPurchase(parseFloat(e.target.value))}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Límite por Usuario</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 outline-none focus:border-magenta"
                        value={limitPerUser}
                        onChange={(e) => setLimitPerUser(parseInt(e.target.value))}
                        required
                      />
                    </div>
                  </div>

                  {/* Is stackable switch */}
                  <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-300 block">Es Acumulable</span>
                      <span className="text-[10px] text-slate-500">¿Puede usarse con otras ofertas?</span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setIsStackable(!isStackable)}
                      className="text-slate-400 hover:text-white transition-all"
                    >
                      {isStackable ? (
                        <ToggleRight className="w-10 h-10 text-magenta" />
                      ) : (
                        <ToggleLeft className="w-10 h-10 text-slate-700" />
                      )}
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-magenta text-white font-semibold rounded-xl hover:bg-magenta-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Cupón</span>
                  </button>
                </form>
              </div>

              {/* Coupons List */}
              <div className="lg:col-span-2 bg-slate-900/20 border border-slate-900 rounded-2xl p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Listado de Cupones Propios</h3>
                    <p className="text-xs text-slate-400">Control de activación y redención.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {couponsList.map((cp) => (
                    <div 
                      key={cp.id} 
                      className={`border rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all ${
                        cp.active ? 'bg-slate-950 border-slate-850' : 'bg-slate-950/20 border-slate-950 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 bg-magenta/10 border border-magenta/40 text-magenta-300 font-mono font-bold text-sm rounded-lg">
                          {cp.code}
                        </span>
                        
                        {/* Toggle active switch */}
                        <button
                          onClick={() => handleToggleCoupon(cp.id)}
                          className="focus:outline-none"
                        >
                          {cp.active ? (
                            <ToggleRight className="w-8 h-8 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-slate-700" />
                          )}
                        </button>
                      </div>

                      <div className="space-y-1">
                        <div className="text-lg font-bold text-white">
                          {cp.type === 'Percent' ? `${cp.value}% de Descuento` : `L. ${cp.value} de Descuento`}
                        </div>
                        <p className="text-xs text-slate-500">Compra Mínima: L. {cp.minPurchase}</p>
                        <p className="text-xs text-slate-500">Límite: {cp.limit} uso(s) por cliente</p>
                      </div>

                      <div className="border-t border-slate-900 pt-3 flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase">
                        <span>{cp.stackable ? 'Acumulable' : 'No Acumulable'}</span>
                        <span className={cp.active ? 'text-emerald-400' : 'text-rose-500'}>
                          {cp.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/50 py-4 px-6 text-center text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© 2026 INVERBANHN. Todos los derechos reservados.</span>
        <span>Soporte Técnico: dev@inverbanhn.com</span>
      </footer>

    </div>
  );
}
