import { useEffect, useState, useMemo } from "react";
import "./App.css";

type Product = {
  id: number;
  name: string;
  price: number;
};

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [apiStatus, setApiStatus] = useState<"connected" | "error" | "checking">("checking");
  
  // Form states
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Filter & Search & View states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price-desc" | "price-asc" | "name-asc">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const loadProducts = async (isInitial = false) => {
    const startTime = performance.now();
    try {
      if (isInitial) setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/Products`);
      
      if (!response.ok) {
        throw new Error(`HTTP Hata: ${response.status}`);
      }
      
      const data: Product[] = await response.json();
      const elapsed = Math.round(performance.now() - startTime);
      
      setProducts(data);
      setApiLatency(elapsed);
      setApiStatus("connected");
    } catch (err) {
      console.error("API Bağlantı Hatası:", err);
      setApiStatus("error");
      addToast("Backend API'ye ulaşılamadı. Docker container'ın çalıştığından emin olun.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts(true);
    const interval = setInterval(() => {
      loadProducts(false);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleAddProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim() || !price || isNaN(Number(price))) {
      addToast("Lütfen geçerli bir ürün adı ve fiyatı giriniz.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/api/Products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          price: Number(price),
        }),
      });

      if (!res.ok) throw new Error("Ürün eklenemedi");

      setName("");
      setPrice("");
      setIsAddModalOpen(false);
      addToast(`"${name.trim()}" başarıyla eklendi.`, "success");
      await loadProducts();
    } catch (err) {
      addToast("Ürün eklenirken bir hata oluştu.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditPrice(product.price.toString());
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editName.trim() || !editPrice || isNaN(Number(editPrice))) {
      addToast("Lütfen geçerli bilgiler giriniz.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/api/Products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingProduct.id,
          name: editName.trim(),
          price: Number(editPrice),
        }),
      });

      if (!res.ok) throw new Error("Güncelleme başarısız");

      setIsEditModalOpen(false);
      setEditingProduct(null);
      addToast("Ürün başarıyla güncellendi.", "success");
      await loadProducts();
    } catch (err) {
      addToast("Ürün güncellenirken bir hata oluştu.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`"${product.name}" ürününü silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/Products/${product.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Silinemedi");

      addToast(`"${product.name}" silindi.`, "info");
      await loadProducts();
    } catch (err) {
      addToast("Ürün silinirken bir sorun oluştu.", "error");
    }
  };

  const handleSeedDemoData = async () => {
    const demoItems = [
      { name: "Apple MacBook Pro 16\" M3 Max", price: 124999 },
      { name: "Dell UltraSharp 32\" 4K Thunderbolt", price: 38500 },
      { name: "Logitech MX Master 3S Kablosuz Mouse", price: 4250 },
      { name: "Keychron Q1 Pro Mekanik Klavye", price: 7900 },
      { name: "Docker & Kubernetes Cloud Server", price: 18500 }
    ];

    try {
      setIsSubmitting(true);
      for (const item of demoItems) {
        await fetch(`${API_BASE_URL}/api/Products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
      }
      addToast("Örnek demo ürünleri başarıyla yüklendi!", "success");
      await loadProducts();
    } catch (error) {
      addToast("Örnek veriler eklenirken hata oluştu.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations
  const stats = useMemo(() => {
    const totalCount = products.length;
    const totalValue = products.reduce((acc, p) => acc + (p.price || 0), 0);
    const avgPrice = totalCount > 0 ? totalValue / totalCount : 0;
    return { totalCount, totalValue, avgPrice };
  }, [products]);

  // Filtered & Sorted list
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (sortBy) {
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name, "tr"));
        break;
      case "newest":
      default:
        result.sort((a, b) => b.id - a.id);
        break;
    }
    return result;
  }, [products, searchQuery, sortBy]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="app-layout">
      {/* Background ambient lighting effects */}
      <div className="ambient-light light-1"></div>
      <div className="ambient-light light-2"></div>

      {/* Top Navigation Bar */}
      <header className="navbar">
        <div className="nav-container">
          <div className="brand-group">
            <div className="docker-badge-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.186v1.887c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186zm0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.186.185.186zm-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.888c0 .102.083.186.185.186zm-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.888c0 .102.084.186.186.186zm5.893 2.715h2.118a.186.186 0 00.186-.186V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.186v1.887c0 .102.082.185.185.185zm-2.93 0h2.12a.185.185 0 00.184-.186V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.186v1.887c0 .102.083.185.185.185zm-2.964 0h2.119a.185.185 0 00.185-.186V9.006a.185.185 0 00-.185-.186H5.136a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185zm-2.928 0h2.119a.185.185 0 00.185-.186V9.006a.185.185 0 00-.185-.186H2.208a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185zM23.957 12.3c-.092-.582-.55-1.03-1.077-1.127l-.427-.08-.344.256c-.732.546-1.636.84-2.583.84-.26 0-.523-.024-.783-.075-.386-.076-.807-.282-1.251-.614a6.38 6.38 0 00-1.874-.887c-.694-.19-1.428-.291-2.18-.291H1.875C.84 10.322 0 11.162 0 12.197c0 3.328 1.488 6.438 4.083 8.532C6.467 22.67 9.537 23.5 12.72 23.5c4.764 0 9.07-2.394 10.742-6.223.336-.767.538-1.597.538-2.457 0-.877-.015-1.74-.043-2.52z"/>
              </svg>
            </div>
            <div>
              <div className="brand-title">
                <span>Docker</span>Learning
                <span className="version-tag">Full-Stack</span>
              </div>
              <div className="brand-sub">Multi-Container Micro-Architecture</div>
            </div>
          </div>

          {/* System Status Indicators */}
          <div className="cluster-status-bar">
            <div className="service-node">
              <span className="dot dot-active"></span>
              <span className="node-label">React (3000)</span>
            </div>
            <div className="node-divider">➔</div>
            <div className="service-node">
              <span className={`dot ${apiStatus === "connected" ? "dot-active" : "dot-error"}`}></span>
              <span className="node-label">.NET 8 API (5000)</span>
            </div>
            <div className="node-divider">➔</div>
            <div className="service-node">
              <span className={`dot ${apiStatus === "connected" ? "dot-active" : "dot-error"}`}></span>
              <span className="node-label">MSSQL (1433)</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-container">
        
        {/* Hero Banner Section */}
        <section className="hero-section">
          <div className="hero-text">
            <div className="hero-badge">
              <span className="pulse-icon">⚡</span> Modern Cloud-Native Envanter Yönetimi
            </div>
            <h1>Containerized <span>Envanter & Ürün</span> Portalı</h1>
            <p>
              React 19, ASP.NET Core 8 Web API ve Microsoft SQL Server 2022 mimarisi ile Docker Compose üzerinde izole çalışan tam teşekküllü CRUD ekosistemi.
            </p>
          </div>

          <div className="hero-actions">
            <button 
              className="btn btn-primary"
              onClick={() => setIsAddModalOpen(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Yeni Ürün Ekle
            </button>
            <button 
              className="btn btn-secondary"
              onClick={handleSeedDemoData}
              disabled={isSubmitting}
              title="Örnek ürünler yükler"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              Demo Verisi Ekle
            </button>
            <button 
              className="btn btn-ghost"
              onClick={() => loadProducts(false)}
              title="Listeyi Yenile"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? "spin" : ""}>
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>
        </section>

        {/* Live Metrics Grid */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrap icon-blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-title">Toplam Kayıtlı Ürün</span>
              <div className="stat-value">{stats.totalCount} <span className="stat-unit">Adet</span></div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap icon-emerald">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-title">Toplam Envanter Değeri</span>
              <div className="stat-value">{formatCurrency(stats.totalValue)}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap icon-purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-title">Ortalama Ürün Fiyatı</span>
              <div className="stat-value">{formatCurrency(stats.avgPrice)}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className={`stat-icon-wrap ${apiStatus === "connected" ? "icon-cyan" : "icon-rose"}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-title">API Yanıt & Gecikme</span>
              <div className="stat-value">
                {apiStatus === "connected" ? (
                  <>
                    <span className="text-success">{apiLatency ?? 12}ms</span>
                    <span className="stat-status-badge">Aktif</span>
                  </>
                ) : (
                  <span className="text-danger">Bağlantı Yok</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Controls: Search, Sort & View Switches */}
        <section className="controls-panel">
          <div className="search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Ürün adı ile canlı ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery("")}>
                ✕
              </button>
            )}
          </div>

          <div className="filter-group">
            <div className="select-wrap">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="newest">En Yeni Eklenenler</option>
                <option value="price-desc">Fiyat: Azalan (En Yüksek)</option>
                <option value="price-asc">Fiyat: Artan (En Düşük)</option>
                <option value="name-asc">İsim: A'dan Z'ye</option>
              </select>
            </div>

            <div className="view-toggle">
              <button
                className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
                title="Kart Görünümü"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </button>
              <button
                className={`view-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Tablo Görünümü"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Product Items Display */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Docker SQL Veritabanından Ürünler Yükleniyor...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>Ürün Bulunamadı</h3>
            <p>
              {searchQuery
                ? `"${searchQuery}" aramasına uygun hiçbir ürün eşleşmedi.`
                : "Henüz veritabanında kayıtlı bir ürün bulunmuyor."}
            </p>
            <div className="empty-actions">
              {searchQuery ? (
                <button className="btn btn-secondary" onClick={() => setSearchQuery("")}>
                  Aramayı Temizle
                </button>
              ) : (
                <>
                  <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                    İlk Ürünü Ekle
                  </button>
                  <button className="btn btn-secondary" onClick={handleSeedDemoData}>
                    Örnek Demo Yükle
                  </button>
                </>
              )}
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <div className="product-card" key={product.id}>
                <div className="product-card-top">
                  <span className="product-id-tag">#ID-{product.id}</span>
                  <div className="product-actions-inline">
                    <button
                      className="icon-btn edit-btn"
                      onClick={() => handleEditClick(product)}
                      title="Düzenle"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button
                      className="icon-btn delete-btn"
                      onClick={() => handleDeleteProduct(product)}
                      title="Sil"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="product-card-body">
                  <h3 className="product-card-title">{product.name}</h3>
                  <div className="product-price-badge">
                    {formatCurrency(product.price)}
                  </div>
                </div>

                <div className="product-card-footer">
                  <span className="stock-badge">
                    <span className="dot dot-active"></span> MSSQL Senkron
                  </span>
                  <button
                    className="quick-edit-link"
                    onClick={() => handleEditClick(product)}
                  >
                    Fiyat Güncelle →
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Kayıt ID</th>
                  <th>Ürün Adı</th>
                  <th>Birim Fiyatı</th>
                  <th>Durum</th>
                  <th style={{ textAlign: "right" }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <span className="product-id-tag">#{product.id}</span>
                    </td>
                    <td className="table-product-name">{product.name}</td>
                    <td>
                      <span className="table-price">{formatCurrency(product.price)}</span>
                    </td>
                    <td>
                      <span className="stock-badge">
                        <span className="dot dot-active"></span> Veritabanında
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="table-actions">
                        <button
                          className="btn-table edit"
                          onClick={() => handleEditClick(product)}
                        >
                          Düzenle
                        </button>
                        <button
                          className="btn-table delete"
                          onClick={() => handleDeleteProduct(product)}
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Docker Topology Architecture Diagram */}
        <section className="docker-topology-section">
          <div className="topology-header">
            <div>
              <h3>🐳 Docker Compose Multi-Container Mimarisi</h3>
              <p>Sistemdeki tüm bileşenler ayrı konteynerler olarak Docker Network üzerinden konuşur.</p>
            </div>
            <div className="topology-badge">Bridge Network: Isolated</div>
          </div>

          <div className="containers-grid">
            <div className="container-box">
              <div className="box-header">
                <span className="box-tag frontend-tag">Frontend</span>
                <span className="status-pill online">Port 3000:80</span>
              </div>
              <h4>learning-frontend</h4>
              <p>React 19 + TypeScript + Vite, Nginx Alpine üzerinde optimize static bundle olarak yayınlanır.</p>
            </div>

            <div className="arrow-connector">➔</div>

            <div className="container-box">
              <div className="box-header">
                <span className="box-tag backend-tag">Web API</span>
                <span className="status-pill online">Port 5000:8080</span>
              </div>
              <h4>learning-api</h4>
              <p>ASP.NET Core 8 RESTful Web API, Entity Framework Core ile otomatik migration yürütür.</p>
            </div>

            <div className="arrow-connector">➔</div>

            <div className="container-box">
              <div className="box-header">
                <span className="box-tag db-tag">Database</span>
                <span className="status-pill online">Port 1433:1433</span>
              </div>
              <h4>learning-sql</h4>
              <p>MS SQL Server 2022 image, <code>sql-data</code> Docker named volume ile kalıcı depolama sağlar.</p>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <p>© {new Date().getFullYear()} DockerLearning • Full-Stack Container Orchestration Showcase</p>
          <div className="footer-techs">
            <span>React 19</span> • <span>.NET 8</span> • <span>MSSQL 2022</span> • <span>Docker Compose</span>
          </div>
        </div>
      </footer>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📦 Yeni Ürün Tanımla</h3>
              <button className="modal-close" onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddProduct} className="modal-form">
              <div className="form-group">
                <label>Ürün Adı</label>
                <input
                  type="text"
                  placeholder="Örn: iPhone 16 Pro Max"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label>Fiyat (₺)</label>
                <input
                  type="number"
                  placeholder="Örn: 79999"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0"
                  step="any"
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Kaydediliyor..." : "Veritabanına Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && editingProduct && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Ürün Bilgisini Güncelle</h3>
              <button className="modal-close" onClick={() => setIsEditModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleUpdateProduct} className="modal-form">
              <div className="form-group">
                <label>Ürün ID</label>
                <input
                  type="text"
                  value={`#${editingProduct.id}`}
                  disabled
                  className="input-disabled"
                />
              </div>

              <div className="form-group">
                <label>Ürün Adı</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Fiyat (₺)</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  min="0"
                  step="any"
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Güncelleniyor..." : "Değişiklikleri Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Popups */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-card toast-${toast.type}`}>
            <span className="toast-icon">
              {toast.type === "success" && "✓"}
              {toast.type === "error" && "⚠️"}
              {toast.type === "info" && "ℹ"}
            </span>
            <span className="toast-msg">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}