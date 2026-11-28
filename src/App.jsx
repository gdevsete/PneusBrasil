import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { products } from "./data/products";
import { aro12Products } from "./data/aro12Products";
import { rimProducts } from "./data/rimProducts";
import { fullCatalog } from "./data/fullCatalog";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function parseBrazilianPrice(value) {
  const normalized = String(value).trim().replace(/[^\d.,-]/g, "");
  if (!normalized) return Number.NaN;
  if (normalized.includes(",")) {
    return Number(normalized.replace(/\./g, "").replace(",", "."));
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) {
    return Number(normalized.replace(/\./g, ""));
  }
  return Number(normalized);
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function productSlug(product) {
  return product.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getAllProducts() {
  const catalog = [
    ...products,
    ...aro12Products,
    ...Object.values(fullCatalog.byRim).flat(),
    ...Object.values(fullCatalog.byMeasure).flat(),
  ];
  Object.values(rimProducts).forEach((items) => catalog.push(...items));
  const unique = new Map();
  catalog.forEach((product) => unique.set(productSlug(product), product));
  return [...unique.values()];
}

const CartContext = createContext(null);

function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cart-items")) || [];
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("cart-items", JSON.stringify(items));
  }, [items]);

  const addItem = (product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.slug === productSlug(product));
      if (existing) {
        return current.map((item) =>
          item.slug === productSlug(product)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...current, { ...product, slug: productSlug(product), quantity }];
    });
    setOpen(true);
  };

  const removeItem = (slug) => setItems((current) => current.filter((item) => item.slug !== slug));
  const changeQuantity = (slug, quantity) => {
    setItems((current) =>
      current.map((item) => item.slug === slug ? { ...item, quantity: Math.max(1, quantity) } : item)
    );
  };
  const cartCount = items.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = items.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, changeQuantity, cartCount, cartTotal, open, setOpen }}>
      {children}
    </CartContext.Provider>
  );
}

function useCart() {
  return useContext(CartContext);
}

function CartDrawer() {
  const cart = useCart();
  const navigate = useNavigate();

  if (!cart.open) return null;

  return (
    <>
      <button className="cart-backdrop" type="button" aria-label="Fechar carrinho" onClick={() => cart.setOpen(false)} />
      <aside className="cart-drawer" aria-label="Carrinho de compras">
        <header>
          <strong>Meu carrinho</strong>
          <button type="button" aria-label="Fechar carrinho" onClick={() => cart.setOpen(false)}>×</button>
        </header>
        <div className="cart-items">
          {cart.items.length === 0 ? (
            <div className="cart-empty">
              <CartIcon />
              <strong>Seu carrinho está vazio</strong>
              <span>Adicione produtos para continuar.</span>
            </div>
          ) : cart.items.map((item) => (
            <article className="cart-item" key={item.slug}>
              <img src={item.image} alt={item.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/tire-placeholder.svg"; }} />
              <div>
                <strong>{item.brand}</strong>
                <span>{item.name}</span>
                <b>{money.format(item.price)}</b>
                <div className="cart-quantity">
                  <button type="button" aria-label="Diminuir quantidade" onClick={() => cart.changeQuantity(item.slug, item.quantity - 1)}>−</button>
                  <span>{item.quantity}</span>
                  <button type="button" aria-label="Aumentar quantidade" onClick={() => cart.changeQuantity(item.slug, item.quantity + 1)}>+</button>
                </div>
              </div>
              <button className="cart-remove" type="button" aria-label="Remover produto" onClick={() => cart.removeItem(item.slug)}>×</button>
            </article>
          ))}
        </div>
        {cart.items.length > 0 && (
          <footer className="cart-summary">
            <div className="cash-on-delivery">
              <div className="cod-icon" aria-hidden="true">
                <img src="/truck-with-money-svgrepo-com.svg" alt="" />
              </div>
              <div>
                <strong>PAGAMENTO NA ENTREGA</strong>
                <span>Nenhum valor é pago antecipadamente</span>
              </div>
            </div>
            <div><span>Subtotal</span><strong>{money.format(cart.cartTotal)}</strong></div>
            <button className="cart-checkout" type="button" onClick={() => { cart.setOpen(false); navigate("/finalizar-pedido"); }}>FINALIZAR PEDIDO</button>
            <button className="cart-continue" type="button" onClick={() => { cart.setOpen(false); navigate("/"); }}>CONTINUAR COMPRANDO</button>
          </footer>
        )}
      </aside>
    </>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20.5 7H6" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

function AndroidIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <path d="M14 12 10.5 6.5a1 1 0 0 1 1.7-1l3.8 6a16 16 0 0 1 16 0l3.8-6a1 1 0 1 1 1.7 1L33.9 12A15 15 0 0 1 41 24H7a15 15 0 0 1 7-12Z" />
        <path d="M8 26h32v11a3 3 0 0 1-3 3h-2v4a2 2 0 0 1-4 0v-4H17v4a2 2 0 0 1-4 0v-4h-2a3 3 0 0 1-3-3V26Z" />
        <path d="M3 27a2 2 0 0 1 4 0v9a2 2 0 0 1-4 0v-9Zm38 0a2 2 0 0 1 4 0v9a2 2 0 0 1-4 0v-9Z" />
      </g>
      <g fill="#fff"><circle cx="17" cy="18" r="1.4" /><circle cx="31" cy="18" r="1.4" /></g>
    </svg>
  );
}

function Header({ cartCount, query, onQueryChange, onSearch, onRimSelect }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState("Medidas");
  const [desktopSection, setDesktopSection] = useState("Medidas");
  const cart = useCart();


  const agriculturalRims = [
    "Aro 12", "Aro 14", "Aro 15", "Aro 15.5", "Aro 16",
    "Aro 18", "Aro 20", "Aro 22.5", "Aro 24", "Aro 25",
    "Aro 26/28", "Aro 30/32", "Aro 34/36", "Aro 38", "Aro 42",
  ];

  const hotRodRims = [
    "Aro 10", "Aro 12", "Aro 13", "Aro 14", "Aro 15",
    "Aro 16", "Aro 17", "Aro 18", "Aro 19", "Aro 20",
    "Aro 22",
  ];

  const truckRims = [
    "Aro 15", "Aro 16", "Aro 17.5", "Aro 19", "Aro 20",
    "Aro 22", "Aro 22.5", "Aro 24", "Aro 24.5",
  ];

  const carAndTruckRims = [
    "Aro 13", "Aro 14", "Aro 15", "Aro 16", "Aro 17",
    "Aro 18", "Aro 19", "Aro 20", "Aro 21", "Aro 22",
    "Aro 24",
  ];

  function submitSearch(event) {
    event.preventDefault();
    onSearch();
  }

  const hotRodMenu = [
    "Aro 10", "Aro 12", "Aro 13", "Aro 14", "Aro 15",
    "Aro 16", "Aro 17", "Aro 18", "Aro 19", "Aro 20",
    "Aro 22", "Aro 26",
  ];

  const truckMenu = [
    "Aro 20", "Aro 22", "Aro 25", "Aro 26", "Aro 27",
    "Aro 28", "Aro 28.5", "Aro 32", "Aro 38", "Aro 42",
  ];

  const truckAndSuvSizes = [
    "265/70R15", "235/70R16", "245/70R16", "265/70R16",
    "265/65R17", "225/60R18", "235/60R18", "265/65R18",
  ];

  const carSizes = [
    "175/70R13", "175/75R13", "175/70R14", "175/75R14",
    "185/80R14", "195/60R15", "195/65R15", "205/55R16",
    "205/65R16", "205/60R16",
  ];

  const truckSizes = [
    "7.00-15", "7.00-16", "215/75R17.5", "235/75R17.5",
    "8.00-20", "10.00-20", "275/80R22.5", "295/80R22.5",
    "12.00R24", "11R24.5",
  ];

  const suvSizes = [
    "265/70R15", "235/70R16", "245/70R16", "265/70R16",
    "265/65R17", "225/60R18", "235/60R18", "265/65R18",
  ];

  const agricultureMenu = [
    "Aro 12", "Aro 14", "Aro 15", "Aro 15.5", "Aro 16",
    "Aro 18", "Aro 20", "Aro 22.5", "Aro 24", "Aro 25",
  ];

  return (
    <>
      <div className="promo-strip">
        <div className="promo-track" aria-label="Black Friday Oficial">
          {Array.from({ length: 10 }, (_, index) => (
            <span key={index}>
              {index % 2 === 0 ? "BLACK FRIDAY OFICIAL" : "PAGUE NA ENTREGA"}
            </span>
          ))}
          {Array.from({ length: 10 }, (_, index) => (
            <span key={`repeat-${index}`} aria-hidden="true">
              {index % 2 === 0 ? "BLACK FRIDAY OFICIAL" : "PAGUE NA ENTREGA"}
            </span>
          ))}
        </div>
      </div>

      <header className="header">
        <div className="header-main">
          <a className="brand" href="#" aria-label="Início">
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
            <span>Pneus<span className="brand-dot">Brasil</span></span>
          </a>

          <form className="search" onSubmit={submitSearch}>
            <input
              type="search"
              placeholder="Pesquisar pneu por medida ou marca..."
              aria-label="Pesquisar pneus"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
            <button type="submit" aria-label="Buscar"><SearchIcon /></button>
          </form>

          <div className="header-actions">
            <button className="cart" type="button" aria-label="Abrir carrinho" onClick={() => cart.setOpen(true)}>
              <CartIcon />
              <span>{cart.cartCount}</span>
            </button>
          </div>
        </div>

        <nav className="nav">
          <div className="menu-wrap">
            <button
              className="menu-button"
              type="button"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              Escolha seu pneu <span>⌄</span>
            </button>

            {menuOpen && (
              <div className="mega-menu">
                <div className="mobile-menu-head">
                  <strong>Categorias de pneus</strong>
                  <button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">×</button>
                </div>
                <div className="mobile-menu-tabs">
                  {[
                    ["Aros", agriculturalRims],
                    ["Medidas", fullCatalog.measureLabels],
                    ["Caminhões", truckSizes],
                    ["Caminhões/SUV", suvSizes],
                  ].map(([label]) => (
                    <button
                      type="button"
                      className={mobileSection === label ? "active" : ""}
                      onClick={() => setMobileSection(label)}
                      key={label}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mobile-menu-content">
                  {mobileSection === "Aros" && agriculturalRims.map((item) => (
                    <a
                      href="#"
                      key={item}
                      onClick={(event) => {
                        event.preventDefault();
                        onRimSelect(item === "Aro 12" ? item : `${item} agrícola`);
                        setMenuOpen(false);
                      }}
                    >
                      {item}<span>›</span>
                    </a>
                  ))}
                  {mobileSection === "Medidas" && fullCatalog.measureLabels.map((item) => (
                    <a href="#" key={item} onClick={(event) => { event.preventDefault(); onRimSelect(item); setMenuOpen(false); }}>{item}<span>›</span></a>
                  ))}
                  {mobileSection === "Caminhões" && truckSizes.map((item) => (
                    <a href="#" key={item}>{item}<span>›</span></a>
                  ))}
                  {mobileSection === "Caminhões/SUV" && suvSizes.map((item) => (
                    <a href="#" key={item}>{item}<span>›</span></a>
                  ))}
                </div>
                <div className="mega-column main-column">
                  <h3>Navegue por</h3>
                  <a href="#" className={desktopSection === "Aros" ? "active" : ""} onClick={(event) => { event.preventDefault(); setDesktopSection("Aros"); }}>Aros</a>
                  <a href="#" className={desktopSection === "Medidas" ? "active" : ""} onClick={(event) => { event.preventDefault(); setDesktopSection("Medidas"); }}>Medidas</a>
                </div>

                {desktopSection === "Aros" ? (
                  <>
                    <div className="mega-column">
                      <h3>Agrícola</h3>
                      {agriculturalRims.map((item) => (
                        <a
                          href="#"
                          key={item}
                          onClick={(event) => {
                            event.preventDefault();
                            onRimSelect(item === "Aro 12" ? item : `${item} agrícola`);
                            setMenuOpen(false);
                          }}
                        >
                          {item}
                        </a>
                      ))}
                    </div>
                    <div className="mega-column">
                      <h3>Hot Rod</h3>
                      {hotRodRims.map((item) => (
                        <a href="#" key={item} onClick={(event) => { event.preventDefault(); onRimSelect(`${item} hot rod`); setMenuOpen(false); }}>{item}</a>
                      ))}
                    </div>
                    <div className="mega-column">
                      <h3>Caminhão</h3>
                      {truckRims.map((item) => (
                        <a href="#" key={item} onClick={(event) => { event.preventDefault(); onRimSelect(`${item} caminhão`); setMenuOpen(false); }}>{item}</a>
                      ))}
                    </div>
                    <div className="mega-column">
                      <h3>Carros / Camionete</h3>
                      {carAndTruckRims.map((item) => (
                        <a href="#" key={item} onClick={(event) => { event.preventDefault(); onRimSelect(`${item} carro`); setMenuOpen(false); }}>{item}</a>
                      ))}
                    </div>
                  </>
                ) : desktopSection === "Medidas" ? (
                  <>
                    <div className="mega-column measure-column">
                      <h3>Medidas disponíveis</h3>
                      {fullCatalog.measureLabels.map((item) => (
                        <a href="#" key={item} onClick={(event) => { event.preventDefault(); onRimSelect(item); setMenuOpen(false); }}>{item}</a>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
          <Link className="android-app-nav" to="/app"><AndroidIcon /><span>Aplicativo Android</span></Link>
        </nav>
      </header>
    </>
  );
}

function Filters() {
  const [open, setOpen] = useState("Categorias");
  const groups = ["Categorias", "Altura", "Aro", "Carga", "Categoria", "Diâmetro", "Largura"];

  return (
    <aside className="filters">
      <div className="filters-heading">
        <span>Filtros</span>
        <button type="button">Limpar</button>
      </div>
      {groups.map((item) => (
        <div className="filter-group" key={item}>
          <button
            className="filter-item"
            type="button"
            aria-expanded={open === item}
            onClick={() => setOpen(open === item ? "" : item)}
          >
            <span>{item}</span><b>{open === item ? "−" : "+"}</b>
          </button>
          {open === item && (
            <div className="filter-options">
              {item === "Categorias" ? (
                <>
                  <label><input type="checkbox" /> Caminhão</label>
                  <label><input type="checkbox" /> Ônibus</label>
                  <label><input type="checkbox" /> Agrícola</label>
                </>
              ) : (
                <>
                  <label><input type="checkbox" /> Opção 1</label>
                  <label><input type="checkbox" /> Opção 2</label>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </aside>
  );
}

function ProductCard({ product }) {
  const [added, setAdded] = useState(false);
  const navigate = useNavigate();
  const cart = useCart();
  const brand = product.brand || "Marca não informada";
  const brandClass = brand.toLowerCase();

  function buyProduct() {
    cart.addItem(product, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  return (
    <article className="product-card" onClick={() => navigate(`/produto/${productSlug(product)}`)}>
      <div className="product-image">
        <span className={`brand-logo brand-logo-${brandClass}`}>
          {brand === "JK" ? "JK TYRE" : brand}
        </span>
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/tire-placeholder.svg";
          }}
        />
      </div>
      <div className="product-content">
        <div className="brand-name">{brand}</div>
        <div className="product-name">{product.name}</div>
        <div className="rating"><strong>Produto novo</strong></div>
      </div>
      <div className="product-purchase">
        <div className="price">{money.format(product.price)}</div>
        <div className="installments">
          ou em até 12x de R$ {(product.price / 12).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} no cartão
        </div>
        <div className="payment-on-delivery">PAGAMENTO NA ENTREGA</div>
        <button className={added ? "buy-button added" : "buy-button"} type="button" onClick={(event) => { event.stopPropagation(); buyProduct(); }}>
          {added ? "Adicionado" : "Adicionar ao carrinho"}
        </button>
      </div>
    </article>
  );
}

function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [query, setQuery] = useState("");
  const cart = useCart();
  const allProducts = getAllProducts();
  const product = allProducts.find((item) => productSlug(item) === slug);

  if (!product) {
    return (
      <>
        <Header cartCount={0} query="" onQueryChange={() => {}} onSearch={() => navigate("/")} onRimSelect={() => navigate("/")} />
        <main><div className="product-not-found"><strong>Produto não encontrado</strong><button type="button" onClick={() => navigate("/")}>Voltar ao catálogo</button></div></main>
      </>
    );
  }

  const measureMatch = product.name.match(/\b\d+(?:[.,]\d+)?(?:X|\/)[\dX.]+(?:R\d+(?:[.,]\d+)*)?\b/i);
  const measure = measureMatch?.[1] || "";
  const rimMatch = product.name.match(/Aro\s+(\d+(?:[.,]\d+)*)/i);
  const plyMatch = product.name.match(/(\d+)\s+Lonas/i);
  const isAgricultural = /Agrícola|F-2|I-1|R-1|R-4|PK-/i.test(product.name);
  const related = allProducts
    .filter((item) => productSlug(item) !== slug)
    .sort((a, b) => Number(b.brand === product.brand) - Number(a.brand === product.brand))
    .slice(0, 3);
  const gallery = [product.image, product.image, product.image, product.image];

  return (
    <>
      <Header
        cartCount={cart.cartCount}
        query={query}
        onQueryChange={setQuery}
        onSearch={() => navigate("/")}
        onRimSelect={(rim) => navigate("/")}
      />
      <main className="detail-main">
        <div className="detail-breadcrumb">
          <Link to="/">Início</Link><span>›</span><span>{product.brand}</span><span>›</span><strong>{product.name}</strong>
        </div>

        <section className="product-detail">
          <div className="detail-gallery">
            <div className="detail-badge">360°</div>
            <div className="detail-image">
              <img
                src={gallery[activeImage]}
                alt={product.name}
                onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/tire-placeholder.svg"; }}
              />
            </div>
            <div className="detail-thumbnails">
              {gallery.map((image, index) => (
                <button type="button" className={activeImage === index ? "active" : ""} onClick={() => setActiveImage(index)} key={`${image}-${index}`}>
                  <img src={image} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/tire-placeholder.svg"; }} />
                </button>
              ))}
            </div>
          </div>

          <div className="detail-info">
            <span className="detail-brand">{product.brand || "Marca não informada"}</span>
            <h1>{product.name}</h1>
            <div className="detail-rating"><small>Produto novo</small></div>
            <div className="detail-price">{money.format(product.price)}</div>
            <div className="detail-installments">
              ou em até 12x de R$ {(product.price / 12).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} no cartão
            </div>
            <div className="detail-delivery">PAGAMENTO NA ENTREGA</div>
            <div className="detail-actions">
              <select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} aria-label="Quantidade">
                {[1,2,3,4,5,6].map((value) => <option value={value} key={value}>{value}</option>)}
              </select>
              <button type="button" onClick={() => cart.addItem(product, quantity)}>COMPRAR</button>
            </div>
          </div>
        </section>

        <section className="technical-section">
          <h2>Informações técnicas</h2>
          <div className="technical-grid">
            <div><span>Marca</span><strong>{product.brand || "Não informada"}</strong></div>
            <div><span>Medida</span><strong>{measure || "Consulte o nome do produto"}</strong></div>
            <div><span>Aro</span><strong>{rimMatch ? rimMatch[1] : "Consulte o nome do produto"}</strong></div>
            <div><span>Quantidade de lonas</span><strong>{plyMatch ? plyMatch[1] : "Consulte o nome do produto"}</strong></div>
            <div><span>Categoria</span><strong>{isAgricultural ? "Agrícola" : "Carga"}</strong></div>
            <div><span>Montagem</span><strong>{/TL/.test(product.name) ? "Sem Câmara" : "Consulte o nome do produto"}</strong></div>
          </div>
        </section>

        <section className="related-section">
          <h2>Produtos relacionados</h2>
          <div className="related-grid">
            {related.map((item) => (
              <Link className="related-card" to={`/produto/${productSlug(item)}`} key={productSlug(item)}>
                <div className="related-image"><img src={item.image} alt={item.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/tire-placeholder.svg"; }} /></div>
                <strong>{item.brand}</strong>
                <span>{item.name}</span>
                <b>{money.format(item.price)}</b>
                <small>ou em até 12x no cartão</small>
              </Link>
            ))}
          </div>
        </section>

        <section className="review-section">
          <h2>Avaliações</h2>
          <p>Ainda não há avaliações para este produto.</p>
        </section>
      </main>
    </>
  );
}

function CatalogApp() {
  const [sort, setSort] = useState("featured");
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRim, setSelectedRim] = useState("");

  const sortedProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const existingSource = selectedRim
      ? (rimProducts[selectedRim] || (selectedRim === "Aro 12" ? aro12Products : []))
      : [];
    const extractedRimSource = selectedRim ? (fullCatalog.byRim[selectedRim] || []) : [];
    const extractedMeasureSource = selectedRim ? (fullCatalog.byMeasure[selectedRim] || []) : [];
    const merged = [...existingSource, ...extractedRimSource, ...extractedMeasureSource];
    const unique = new Map();
    merged.forEach((product) => {
      if (!unique.has(product.name)) unique.set(product.name, product);
    });
    const source = selectedRim ? [...unique.values()] : products;
    const items = [...source].filter((product) => {
      if (!normalizedSearch) return true;
      return `${product.brand} ${product.name}`.toLowerCase().includes(normalizedSearch);
    });
    if (sort === "price-low") return items.sort((a, b) => a.price - b.price);
    if (sort === "price-high") return items.sort((a, b) => b.price - a.price);
    return items;
  }, [sort, searchTerm, selectedRim]);

  return (
    <>
      <Header
        cartCount={0}
        query={query}
        onQueryChange={setQuery}
        onSearch={() => setSearchTerm(query)}
        onRimSelect={(rim) => {
          setSelectedRim(rim);
          setSearchTerm("");
          setQuery("");
        }}
      />
      <main>
        <div className="catalog">
          <section className="products-area">
            {selectedRim && (
              <h1 className="category-title">Pneus {selectedRim.replace(/ (agrícola|caminhão|carro|hot rod)$/, "")}</h1>
            )}
            <button className="mobile-filters" type="button">Filtrar produtos <span>≡</span></button>
            <div className="catalog-toolbar">
              <div>
                <strong>{sortedProducts.length} produtos</strong>
                <span>encontrados</span>
              </div>
              <label>
                Ordenar por
                <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Ordenar produtos">
                  <option value="featured">Lançamentos</option>
                  <option value="price-low">Menor preço</option>
                  <option value="price-high">Maior preço</option>
                </select>
              </label>
            </div>
            <div className="product-list">
              {sortedProducts.length > 0 ? (
                sortedProducts.map((product) => (
                  <ProductCard product={product} key={productSlug(product)} />
                ))
              ) : (
                <div className="updating-products" role="status">
                  <div className="updating-icon" aria-hidden="true">
                    <span />
                  </div>
                  <strong>Estamos atualizando os produtos</strong>
                  <p>Estamos inserindo novos pneus desta categoria no site.<br />Em breve eles estarão disponíveis aqui.</p>
                  <button type="button" onClick={() => setSelectedRim("")}>Ver todos os pneus</button>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

    </>
  );
}

function detectDevice() {
  const ua = navigator.userAgent || "";
  const uaData = navigator.userAgentData;
  if (/iPad|iPhone|iPod/i.test(ua) || /iOS/i.test(uaData?.platform || "")) {
    return { type: "Apple", label: "iPhone / iPad", ua };
  }
  if (/Android/i.test(ua) || /Android/i.test(uaData?.platform || "")) {
    return { type: "Android", label: "Celular Android", ua };
  }
  return { type: "Computador", label: "Computador", ua };
}

function CheckoutPage() {
  const { token } = useParams();
  const cart = useCart();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [sharedItems, setSharedItems] = useState(null);
  const [sharedError, setSharedError] = useState("");
  const [cepStatus, setCepStatus] = useState("");
  const [form, setForm] = useState({
    name: "",
    whatsapp: "",
    cep: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    complement: "",
    payment: "Pix",
  });

  useEffect(() => {
    if (!token) return;
    let active = true;
    setSharedItems(null);
    setSharedError("");
    if (!supabase) {
      setSharedError("Este link precisa de uma conexão ativa com o sistema. Fale com o vendedor.");
      return () => { active = false; };
    }
    supabase.rpc("get_checkout_link", { p_token: token }).then(({ data, error }) => {
      if (!active) return;
      if (error || !data || data.length === 0) {
        setSharedError("Este link expirou ou já foi usado. Fale com o vendedor para receber um novo link.");
      } else {
        setSharedItems(data[0].items || []);
      }
    }).catch(() => {
      if (active) setSharedError("NÃ£o foi possível consultar este pedido. Verifique sua conexão e tente novamente.");
    });
    return () => { active = false; };
  }, [token]);

  const checkoutItems = token ? (sharedItems || []) : cart.items;
  const checkoutTotal = checkoutItems.reduce((total, item) => total + item.price * item.quantity, 0);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const searchCep = async (rawCep) => {
    const cep = rawCep.replace(/\D/g, "");
    if (cep.length !== 8) {
      setCepStatus(cep.length === 0 ? "" : "Digite um CEP válido");
      return;
    }

    setCepStatus("Buscando endereço...");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (data.erro) {
        setCepStatus("CEP não encontrado");
        return;
      }
      setForm((current) => ({
        ...current,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      }));
      setCepStatus("Endereço encontrado");
    } catch {
      setCepStatus("Não foi possível buscar o CEP");
    }
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (checkoutItems.length === 0) return;
    setSubmitError("");
    setSubmitting(true);
    const device = detectDevice();

    try {
      if (token) {
        const { error } = await supabase.rpc("submit_checkout_link_order", {
          p_token: token,
          p_customer_name: form.name,
          p_whatsapp: form.whatsapp,
          p_cep: form.cep,
          p_street: form.street,
          p_number: form.number,
          p_neighborhood: form.neighborhood,
          p_city: form.city,
          p_state: form.state,
          p_complement: form.complement,
          p_payment_method: form.payment,
          p_device_type: device.type,
          p_device_label: device.label,
          p_user_agent: device.ua,
        });
        if (error) throw error;
        setSubmitted(true);
        return;
      }

      const order = {
        id: `PED-${Date.now().toString().slice(-8)}`,
        createdAt: new Date().toISOString(),
        customer: form,
        items: cart.items,
        total: cart.cartTotal,
        status: "Novo",
        device,
      };

      if (supabase) {
        const { error } = await supabase.from("orders").insert({
          public_id: order.id,
          status: "Novo",
          customer_name: form.name,
          whatsapp: form.whatsapp,
          cep: form.cep,
          street: form.street,
          number: form.number,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
          complement: form.complement,
          payment_method: form.payment,
          items: cart.items,
          total: cart.cartTotal,
          device_type: order.device.type,
          device_label: order.device.label,
          user_agent: order.device.ua,
          created_at: order.createdAt,
        });
        if (error) throw error;
      } else {
        const saved = JSON.parse(localStorage.getItem("customer-orders") || "[]");
        localStorage.setItem("customer-orders", JSON.stringify([order, ...saved]));
      }
      cart.items.forEach((item) => cart.removeItem(item.slug));
      setSubmitted(true);
    } catch (error) {
      setSubmitError(token
        ? "Não foi possível enviar. O link pode ter expirado ou já ter sido utilizado. Fale com o vendedor."
        : error.message || "Não foi possível enviar o pedido. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <CheckoutShell>
        <section className="checkout-success">
          <div className="success-check">✓</div>
          <span>Pedido recebido</span>
          <h1>Seu pedido foi enviado!</h1>
          <p>Um dos nossos vendedores entrará em contato pelo WhatsApp para confirmar as informações e o pedido.</p>
          <aside className="checkout-tracking-notice">
            <strong>Acompanhe sua entrega em tempo real</strong>
            <p>Peça ao vendedor o link do aplicativo de rastreamento para baixar. Com ele, você acompanha todo o percurso do pedido, da loja até sua casa, com transparência em cada etapa.</p>
            <a href={`https://wa.me/?text=${encodeURIComponent("Olá! Enviei meu pedido e quero acompanhar a entrega em tempo real. Por favor, me envie o link do aplicativo de rastreamento para baixar.")}`} target="_blank" rel="noreferrer">
              PEDIR LINK DO APLICATIVO PELO WHATSAPP
            </a>
          </aside>
          <div className="success-payment">
            <strong>PAGAMENTO NA ENTREGA</strong>
            <span>Nenhum valor foi cobrado antecipadamente</span>
          </div>
          <button type="button" onClick={() => navigate("/")}>CONTINUAR COMPRANDO</button>
        </section>
      </CheckoutShell>
    );
  }

  if (token && !sharedItems && !sharedError) {
    return <CheckoutShell><section className="checkout-empty"><strong>Carregando seu pedido...</strong></section></CheckoutShell>;
  }

  if (token && sharedError) {
    return (
      <CheckoutShell>
        <section className="checkout-empty">
          <strong>Não foi possível abrir este pedido</strong>
          <p>{sharedError}</p>
          <a href="https://wa.me/" target="_blank" rel="noreferrer">Falar com o vendedor pelo WhatsApp</a>
        </section>
      </CheckoutShell>
    );
  }

  if (checkoutItems.length === 0) {
    return (
      <CheckoutShell>
        <section className="checkout-empty">
          <strong>Seu carrinho está vazio</strong>
          <p>Adicione produtos antes de finalizar o pedido.</p>
          <button type="button" onClick={() => navigate("/")}>VER PRODUTOS</button>
        </section>
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell>
      <div className="checkout-page">
        <div className="checkout-heading">
          <span>FINALIZAÇÃO DO PEDIDO</span>
          <h1>Preencha seus dados</h1>
          <p>Não cobramos nenhum valor antecipadamente.</p>
        </div>
        <div className="checkout-layout">
          <form className="checkout-form" onSubmit={submitOrder}>
            <section>
              <h2>Dados de contato</h2>
              <div className="checkout-fields">
                <label><span>Nome completo</span><input required value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Seu nome" /></label>
                <label><span>WhatsApp</span><input required value={form.whatsapp} onChange={(event) => updateField("whatsapp", event.target.value)} placeholder="(00) 00000-0000" /></label>
              </div>
            </section>

            <section>
              <h2>Endereço de entrega</h2>
              <div className="checkout-fields">
                <label className="field-cep"><span>CEP</span><input required value={form.cep} onChange={(event) => { updateField("cep", event.target.value); searchCep(event.target.value); }} placeholder="00000-000" inputMode="numeric" /><small>{cepStatus}</small></label>
                <label className="field-wide"><span>Rua / Avenida</span><input required value={form.street} onChange={(event) => updateField("street", event.target.value)} placeholder="Nome da rua" /></label>
                <label><span>Número</span><input required value={form.number} onChange={(event) => updateField("number", event.target.value)} placeholder="Número" /></label>
                <label><span>Bairro</span><input required value={form.neighborhood} onChange={(event) => updateField("neighborhood", event.target.value)} placeholder="Bairro" /></label>
                <label><span>Cidade</span><input required value={form.city} onChange={(event) => updateField("city", event.target.value)} placeholder="Cidade" /></label>
                <label><span>Estado</span><input required value={form.state} onChange={(event) => updateField("state", event.target.value)} placeholder="UF" maxLength={2} /></label>
                <label className="field-wide"><span>Complemento</span><input value={form.complement} onChange={(event) => updateField("complement", event.target.value)} placeholder="Apartamento, ponto de referência..." /></label>
              </div>
            </section>

            <section>
              <h2>Forma de pagamento na entrega</h2>
              <div className="payment-options">
                {["Pix", "Cartão", "Dinheiro"].map((option) => (
                  <label key={option} className={form.payment === option ? "active" : ""}>
                    <input type="radio" name="payment" value={option} checked={form.payment === option} onChange={(event) => updateField("payment", event.target.value)} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </section>

            {submitError && <div className="checkout-error">{submitError}</div>}
            <button className="checkout-submit" type="submit" disabled={submitting}>{submitting ? "ENVIANDO PEDIDO..." : "ENVIAR PEDIDO"}</button>
          </form>

          <aside className="checkout-summary">
            <h2>Resumo do pedido</h2>
            {checkoutItems.map((item, index) => (
              <div className="checkout-item" key={item.slug || `${item.name}-${index}`}>
                <img src={item.image} alt={item.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/tire-placeholder.svg"; }} />
                <div><strong>{item.brand || "Marca não informada"}</strong><span>{item.name}</span><small>{item.quantity} unidade(s)</small></div>
                <b>{money.format(item.price * item.quantity)}</b>
              </div>
            ))}
            <div className="checkout-total"><span>Total</span><strong>{money.format(checkoutTotal)}</strong></div>
            <div className="checkout-reassurance">
              <strong>PAGAMENTO SOMENTE NA ENTREGA</strong>
              <p>Não realizamos cobrança antecipada. Um vendedor entrará em contato pelo WhatsApp para confirmar seus dados e o pedido.</p>
            </div>
          </aside>
        </div>
      </div>
    </CheckoutShell>
  );
}

function CheckoutShell({ children }) {
  return (
    <>
      <Header cartCount={0} query="" onQueryChange={() => {}} onSearch={() => {}} onRimSelect={() => {}} />
      <main className="checkout-main">{children}</main>
    </>
  );
}

function AndroidDownloadPage() {
  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    let active = true;
    if (!supabase) {
      setError("O serviço de download está temporariamente indisponível.");
      setLoading(false);
      return () => { active = false; };
    }
    supabase.rpc("get_android_app_release").then(({ data, error: releaseError }) => {
      if (!active) return;
      if (releaseError) setError("Não foi possível carregar os dados do aplicativo.");
      else setRelease(data?.[0] || null);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setError("Não foi possível carregar os dados do aplicativo.");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const copyHash = async () => {
    if (!release?.sha256) return;
    try {
      await navigator.clipboard.writeText(release.sha256);
      setCopiedHash(true);
      window.setTimeout(() => setCopiedHash(false), 1600);
    } catch {
      setCopiedHash(false);
    }
  };

  const downloadUrl = release && supabase
    ? supabase.storage.from("android-app-downloads").getPublicUrl(release.file_path, { download: "aplicativo-pneusbrasil.apk" }).data.publicUrl
    : "";

  return (
    <>
      <Header cartCount={0} query="" onQueryChange={() => {}} onSearch={() => {}} onRimSelect={() => {}} />
      <main className="android-download-page">
        <div className="android-download-shell">
          <section className="android-hero">
            <div className="android-icon-large"><AndroidIcon /></div>
            <span className="android-eyebrow">APLICATIVO PARA ANDROID</span>
            <h1>Rastreamento da sua entrega</h1>
            <p>Baixe o aplicativo oficial para acompanhar as atualizações do percurso da loja até sua casa. Peça ao vendedor os dados ou o link de acesso ao rastreamento do seu pedido.</p>
          </section>

          <section className="android-release-card">
            {loading ? (
              <p>Carregando informações do aplicativo...</p>
            ) : error ? (
              <p className="android-download-error">{error}</p>
            ) : release ? (
              <>
                <div className="android-release-heading">
                  <div><span>VERSÃO PUBLICADA</span><h2>{release.app_name}</h2></div>
                  <b>v{release.version}</b>
                </div>
                <p>{release.description}</p>
                {release.release_notes && <div className="android-release-notes"><strong>Novidades</strong><p>{release.release_notes}</p></div>}
                <div className="android-release-meta">
                  <div><span>Arquivo</span><strong>APK para Android</strong></div>
                  <div><span>Tamanho</span><strong>{formatFileSize(Number(release.file_size_bytes))}</strong></div>
                  <div><span>Publicado em</span><strong>{new Date(release.updated_at).toLocaleDateString("pt-BR")}</strong></div>
                </div>
                <a className="android-download-button" href={downloadUrl}>
                  <AndroidIcon /> BAIXAR APLICATIVO PARA ANDROID
                </a>
                <div className="android-hash">
                  <div><strong>SHA-256 do arquivo publicado</strong><code>{release.sha256}</code></div>
                  <button type="button" onClick={copyHash}>{copiedHash ? "Copiado" : "Copiar hash"}</button>
                </div>
              </>
            ) : (
              <div className="android-not-published">
                <strong>O aplicativo ainda não foi publicado</strong>
                <p>Volte a esta página mais tarde ou peça o link diretamente ao vendedor.</p>
              </div>
            )}
          </section>

          <section className="android-security-card">
            <h2>Instale com atenção à segurança</h2>
            <ol>
              <li>Confirme que está no site oficial <strong>pneusbrasilofc.com.br</strong> e baixe o APK somente por esta página.</li>
              <li>Se o Android pedir autorização para instalar pelo navegador, permita apenas para esse navegador e desative a autorização depois da instalação.</li>
              <li>Mantenha o Google Play Protect ativado. Se o Android avisar que o app pode ser nocivo, que o desenvolvedor não foi verificado ou bloquear a instalação, pare e fale com o vendedor. Não desative as proteções nem tente contornar o aviso.</li>
              <li>Confira as permissões solicitadas pelo aplicativo e conceda somente as que fizerem sentido para o serviço.</li>
            </ol>
            <p className="android-security-note">O SHA-256 identifica exatamente o arquivo publicado, mas não é uma análise antivírus. O Android também verifica a assinatura digital do APK durante a instalação. Nenhuma página pode garantir risco zero; alertas do dispositivo devem ser respeitados.</p>
            <div className="android-security-links">
              <a href="https://support.google.com/googleplay/answer/2812853?hl=pt-BR" target="_blank" rel="noreferrer">Como o Google Play Protect protege seu aparelho</a>
              <a href="https://support.google.com/android/answer/17588095?hl=pt-BR" target="_blank" rel="noreferrer">Informações do Android sobre apps de desenvolvedores não verificados</a>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function TrackingPage() {
  const { code: routeCode } = useParams();
  const [code, setCode] = useState(routeCode || "");
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchTracking = async (event) => {
    event?.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      setError("Informe o código de rastreamento.");
      return;
    }

    setLoading(true);
    setError("");
    setTracking(null);

    if (supabase) {
      const { data, error: trackingError } = await supabase.rpc("get_tracking", { p_code: normalizedCode });
      if (trackingError) {
        setError("Não foi possível consultar o rastreamento.");
      } else if (!data || data.length === 0) {
        setError("Código não encontrado.");
      } else {
        setTracking(data[0]);
      }
    } else {
      const saved = JSON.parse(localStorage.getItem("tracking-codes") || "[]");
      const found = saved.find((item) => item.code === normalizedCode);
      if (found) setTracking(found);
      else setError("Código não encontrado.");
    }

    setLoading(false);
  };

  useEffect(() => {
    if (routeCode) searchTracking();
  }, [routeCode]);

  return (
    <main className="tracking-public">
      <section className="tracking-shell">
        <div className="tracking-brand">
          <span className="tracking-brand-mark"><i /><i /><i /></span>
          <strong>Pneus<span>Brasil</span></strong>
        </div>

        <form className="tracking-search" onSubmit={searchTracking}>
          <div>
            <span>CÓDIGO DE RASTREAMENTO</span>
            <h1>Acompanhe sua encomenda</h1>
          </div>
          <div className="tracking-input-row">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="Ex.: PNEU-AB12CD34"
              aria-label="Código de rastreamento"
            />
            <button type="submit" disabled={loading}>{loading ? "Consultando..." : "RASTREAR"}</button>
          </div>
          {error && <div className="tracking-error">{error}</div>}
        </form>

        <aside className="tracking-live-notice" aria-label="Informação sobre rastreamento em tempo real">
          <span className="tracking-live-notice-icon" aria-hidden="true">!</span>
          <div>
            <strong>Quer acompanhar o trajeto da entrega em tempo real?</strong>
            <p>
              O rastreamento em tempo real está disponível para todas as entregas. Peça ao vendedor
              que envie o link ou aplicativo para acompanhar o percurso da loja até sua residência.
            </p>
          </div>
        </aside>

        {tracking && (
          <section className="tracking-result">
            <div className="tracking-result-head">
              <div>
                <span>Status atual</span>
                <strong>{tracking.current_status}</strong>
              </div>
              <b>{tracking.code}</b>
            </div>

            <div className="tracking-route">
              <div><span>ORIGEM</span><strong>{tracking.origin_city}</strong></div>
              <div className="tracking-route-line"><i /><b /><i /></div>
              <div><span>DESTINO</span><strong>{tracking.destination_city}</strong></div>
            </div>

            <div className="tracking-history">
              <h2>Histórico da encomenda</h2>
              {(tracking.history || []).length === 0 ? (
                <p>Nenhuma atualização registrada ainda.</p>
              ) : (
                [...tracking.history].reverse().map((item, index) => (
                  <article className={index === 0 ? "latest" : ""} key={`${item.created_at}-${index}`}>
                    <div className="tracking-dot" />
                    <div>
                      <strong>{item.status}</strong>
                      <span>{item.city}</span>
                      <p>{item.description}</p>
                      <time>{item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : ""}</time>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function AdminPage() {
  const availableProducts = getAllProducts();
  const [email, setEmail] = useState("fehprado2025@outlook.com");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState(() => JSON.parse(localStorage.getItem("customer-orders") || "[]"));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [copiedId, setCopiedId] = useState("");
  const [trackingOrderId, setTrackingOrderId] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [trackingStatus, setTrackingStatus] = useState("Pedido confirmado");
  const [trackingLocation, setTrackingLocation] = useState("");
  const [trackingDescription, setTrackingDescription] = useState("");
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [checkoutPriceDrafts, setCheckoutPriceDrafts] = useState({});
  const [productSearch, setProductSearch] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQuantity, setCustomQuantity] = useState(1);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [customImageFile, setCustomImageFile] = useState(null);
  const [customImagePreview, setCustomImagePreview] = useState("");
  const [customImageUploading, setCustomImageUploading] = useState(false);
  const [checkoutLinks, setCheckoutLinks] = useState([]);
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [latestCheckoutLink, setLatestCheckoutLink] = useState("");
  const [copiedCheckoutToken, setCopiedCheckoutToken] = useState("");
  const [appName, setAppName] = useState("PneusBrasil Rastreamento");
  const [appVersion, setAppVersion] = useState("");
  const [appDescription, setAppDescription] = useState("");
  const [appReleaseNotes, setAppReleaseNotes] = useState("");
  const [apkFile, setApkFile] = useState(null);
  const [androidRelease, setAndroidRelease] = useState(null);
  const [androidReleaseSaving, setAndroidReleaseSaving] = useState(false);
  const [androidReleaseMessage, setAndroidReleaseMessage] = useState("");
  const [androidReleaseError, setAndroidReleaseError] = useState("");

  useEffect(() => {
    if (!customImageFile) {
      setCustomImagePreview("");
      return;
    }
    const preview = URL.createObjectURL(customImageFile);
    setCustomImagePreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [customImageFile]);

  const loadOrders = async () => {
    if (!supabase) {
      setOrders(JSON.parse(localStorage.getItem("customer-orders") || "[]"));
      return;
    }
    const { data, error: loadError } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (!loadError) setOrders(data || []);
  };

  const loadCheckoutLinks = async () => {
    if (!supabase) return;
    const { data, error: linksError } = await supabase
      .from("checkout_links")
      .select("id, token, items, created_at, expires_at, used_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (!linksError) setCheckoutLinks(data || []);
  };

  const loadAndroidRelease = async () => {
    if (!supabase) return;
    const { data, error: releaseError } = await supabase
      .from("android_app_releases")
      .select("id, app_name, version, description, release_notes, file_path, file_size_bytes, sha256, updated_at")
      .eq("id", "current")
      .maybeSingle();
    if (releaseError || !data) return;
    setAndroidRelease(data);
    setAppName(data.app_name);
    setAppVersion(data.version);
    setAppDescription(data.description);
    setAppReleaseNotes(data.release_notes || "");
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setAuthenticated(true);
    });
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    loadOrders();
    loadCheckoutLinks();
    loadAndroidRelease();
    if (!supabase) return;
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, loadOrders)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authenticated]);

  const addCheckoutProduct = (product) => {
    const slug = productSlug(product);
    setCheckoutItems((current) => {
      const existing = current.find((item) => item.slug === slug);
      if (existing) {
        return current.map((item) => item.slug === slug ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { ...product, slug, quantity: 1 }];
    });
    setProductSearch("");
    setLinkError("");
  };

  const updateCheckoutQuantity = (slug, quantity) => {
    setCheckoutItems((current) => quantity < 1
      ? current.filter((item) => item.slug !== slug)
      : current.map((item) => item.slug === slug ? { ...item, quantity } : item));
  };

  const updateCheckoutPrice = (slug, price) => {
    const normalizedPrice = Math.round(Math.max(0, price || 0) * 100) / 100;
    setCheckoutItems((current) => current.map((item) => item.slug === slug ? { ...item, price: normalizedPrice } : item));
  };

  const updateCheckoutPriceDraft = (slug, value) => {
    setCheckoutPriceDrafts((current) => ({ ...current, [slug]: value }));
    const parsedPrice = parseBrazilianPrice(value);
    if (Number.isFinite(parsedPrice) && parsedPrice >= 0) updateCheckoutPrice(slug, parsedPrice);
  };

  const finishCheckoutPriceEdit = (slug) => {
    setCheckoutPriceDrafts((current) => {
      const next = { ...current };
      delete next[slug];
      return next;
    });
  };

  const addCustomCheckoutProduct = async () => {
    const name = productSearch.trim();
    const price = Math.round(parseBrazilianPrice(customPrice) * 100) / 100;
    if (!name || !Number.isFinite(price) || price <= 0 || customQuantity < 1) return;
    let image = customImageUrl.trim() || "/tire-placeholder.svg";
    if (customImageUrl.trim()) {
      try {
        const parsedUrl = new URL(customImageUrl.trim());
        if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("URL inválida");
      } catch {
        setLinkError("Informe um link de imagem válido começando com https://.");
        return;
      }
    }
    if (customImageFile) {
      const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
      const extension = extensions[customImageFile.type];
      if (!extension || customImageFile.size > 5 * 1024 * 1024) {
        setLinkError("Use uma imagem JPG, PNG, WEBP ou AVIF de até 5 MB.");
        return;
      }
      setCustomImageUploading(true);
      const path = `${crypto.randomUUID()}.${extension}`;
      try {
        const { error: uploadError } = await supabase.storage
          .from("checkout-product-images")
          .upload(path, customImageFile, { cacheControl: "31536000", upsert: false });
        if (uploadError) throw uploadError;
        image = supabase.storage.from("checkout-product-images").getPublicUrl(path).data.publicUrl;
      } catch {
        setLinkError("Não foi possível enviar a imagem. Aplique a migração de imagens do Supabase e tente novamente.");
        return;
      } finally {
        setCustomImageUploading(false);
      }
    }
    const slug = `manual-${crypto.randomUUID()}`;
    setCheckoutItems((current) => [...current, {
      id: slug,
      slug,
      brand: customBrand.trim() || "Pneu sob encomenda",
      name,
      price,
      image,
      quantity: Number(customQuantity),
    }]);
    setProductSearch("");
    setCustomBrand("");
    setCustomPrice("");
    setCustomQuantity(1);
    setCustomImageUrl("");
    setCustomImageFile(null);
    setLinkError("");
  };

  const createCheckoutLink = async () => {
    setLinkError("");
    if (!supabase || checkoutItems.length === 0) {
      setLinkError("Adicione pelo menos um pneu antes de gerar o link.");
      return;
    }
    setLinkSaving(true);
    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const items = checkoutItems.map(({ id, slug, brand, name, price, image, quantity }) => ({
      id: String(id), slug, brand, name, price: Number(price), image, quantity: Number(quantity),
    }));
    const { error: createError } = await supabase
      .from("checkout_links")
      .insert({ token, items, expires_at: expiresAt })
      .then((result) => result)
      .catch(() => ({ error: true }));
    setLinkSaving(false);
    if (createError) {
      setLinkError("Não foi possível criar o link. Verifique se a migração do checkout foi aplicada no Supabase.");
      return;
    }
    const link = `${window.location.origin}/pedido/${token}`;
    setLatestCheckoutLink(link);
    setCheckoutItems([]);
    await loadCheckoutLinks();
  };

  const publishAndroidRelease = async (event) => {
    event.preventDefault();
    setAndroidReleaseError("");
    setAndroidReleaseMessage("");
    if (!supabase || !apkFile) {
      setAndroidReleaseError("Selecione o arquivo APK que deseja publicar.");
      return;
    }
    if (!apkFile.name.toLowerCase().endsWith(".apk") || apkFile.size <= 0 || apkFile.size > 100 * 1024 * 1024) {
      setAndroidReleaseError("Selecione um arquivo .apk de até 100 MB.");
      return;
    }
    setAndroidReleaseSaving(true);
    let uploadedPath = "";
    try {
      const digest = await crypto.subtle.digest("SHA-256", await apkFile.arrayBuffer());
      const sha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      const safeVersion = appVersion.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
      uploadedPath = `releases/${safeVersion}-${Date.now()}-${sha256.slice(0, 12)}.apk`;
      const { error: uploadError } = await supabase.storage
        .from("android-app-downloads")
        .upload(uploadedPath, apkFile, {
          cacheControl: "3600",
          contentType: "application/vnd.android.package-archive",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const releaseData = {
        id: "current",
        app_name: appName.trim(),
        version: appVersion.trim(),
        description: appDescription.trim(),
        release_notes: appReleaseNotes.trim() || null,
        file_path: uploadedPath,
        file_size_bytes: apkFile.size,
        sha256,
        updated_at: new Date().toISOString(),
      };
      const { data, error: saveError } = await supabase
        .from("android_app_releases")
        .upsert(releaseData)
        .select("id, app_name, version, description, release_notes, file_path, file_size_bytes, sha256, updated_at")
        .single();
      if (saveError) throw saveError;

      if (androidRelease?.file_path && androidRelease.file_path !== uploadedPath) {
        await supabase.storage.from("android-app-downloads").remove([androidRelease.file_path]).catch(() => null);
      }
      setAndroidRelease(data);
      setApkFile(null);
      setAndroidReleaseMessage(`APK publicado. SHA-256: ${sha256}`);
    } catch {
      if (uploadedPath) await supabase.storage.from("android-app-downloads").remove([uploadedPath]).catch(() => null);
      setAndroidReleaseError("Não foi possível publicar. Confira a migração do APK, a assinatura do arquivo e tente novamente.");
    } finally {
      setAndroidReleaseSaving(false);
    }
  };

  const copyCheckoutLink = async (link, token) => {
    await navigator.clipboard.writeText(link);
    setCopiedCheckoutToken(token);
    window.setTimeout(() => setCopiedCheckoutToken(""), 1600);
  };

  const login = async (event) => {
    event.preventDefault();
    setError("");
    if (!supabase) {
      setError("Configure as credenciais do Supabase para acessar o painel administrativo.");
      return;
    }
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError(loginError.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : loginError.message);
    } else {
      setAuthenticated(true);
    }
  };

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setAuthenticated(false);
  };

  const updateStatus = async (orderId, status) => {
    if (supabase) {
      await supabase.from("orders").update({ status }).eq("id", orderId);
      await loadOrders();
    } else {
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
    }
  };

  const copyWhatsApp = async (whatsapp, orderId) => {
    let digits = String(whatsapp).replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
    await navigator.clipboard.writeText(digits);
    setCopiedId(orderId);
    window.setTimeout(() => setCopiedId(""), 1500);
  };

  const generateTrackingCode = () => {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    setTrackingCode(`PNEU-${random}`);
  };

  const saveTracking = async (event) => {
    event.preventDefault();
    const code = trackingCode.trim().toUpperCase();
    if (!code || !trackingOrderId || !originCity || !destinationCity) return;

    const historyItem = {
      status: trackingStatus,
      city: trackingLocation || originCity,
      description: trackingDescription || "Informação de rastreamento atualizada.",
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      const { data: existing } = await supabase
        .from("tracking_codes")
        .select("history")
        .eq("code", code)
        .maybeSingle();
      const history = existing?.history ? [...existing.history, historyItem] : [historyItem];
      await supabase.from("tracking_codes").upsert({
        code,
        order_id: trackingOrderId,
        origin_city: originCity,
        destination_city: destinationCity,
        current_status: trackingStatus,
        history,
        updated_at: new Date().toISOString(),
      }, { onConflict: "code" });
    } else {
      const saved = JSON.parse(localStorage.getItem("tracking-codes") || "[]");
      const found = saved.find((item) => item.code === code);
      const tracking = {
        code,
        order_id: trackingOrderId,
        origin_city: originCity,
        destination_city: destinationCity,
        current_status: trackingStatus,
        history: found ? [...found.history, historyItem] : [historyItem],
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem("tracking-codes", JSON.stringify([tracking, ...saved.filter((item) => item.code !== code)]));
    }

    setTrackingDescription("");
  };

  const normalizeOrder = (order) =>
    supabase
      ? {
          id: order.id,
          publicId: order.public_id,
          createdAt: order.created_at,
          status: order.status,
          customer: {
            name: order.customer_name,
            whatsapp: order.whatsapp,
            cep: order.cep,
            street: order.street,
            number: order.number,
            neighborhood: order.neighborhood,
            city: order.city,
            state: order.state,
            complement: order.complement,
            payment: order.payment_method,
          },
          items: order.items,
          total: Number(order.total),
          device: { label: order.device_label, type: order.device_type, ua: order.user_agent },
        }
      : order;

  const normalizedOrders = orders.map(normalizeOrder);
  const filteredOrders = normalizedOrders.filter((order) => {
    const matchesStatus = statusFilter === "Todos" || order.status === statusFilter;
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      order.customer?.name?.toLowerCase().includes(query) ||
      String(order.customer?.whatsapp || "").includes(query) ||
      String(order.publicId || "").toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });
  const productMatches = productSearch.trim()
    ? availableProducts
        .filter((product) => `${product.brand} ${product.name}`.toLowerCase().includes(productSearch.trim().toLowerCase()))
        .slice(0, 10)
    : [];
  const checkoutItemsTotal = checkoutItems.reduce((total, item) => total + item.price * item.quantity, 0);

  if (!authenticated) {
    return (
      <div className="admin-login">
        <form onSubmit={login}>
          <strong>ÁREA ADMINISTRATIVA</strong>
          <h1>Acesso restrito</h1>
          {!supabase && <span className="admin-error">Configure o Supabase para habilitar o acesso administrativo.</span>}
          {supabase && <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mail" required />}
          {supabase && <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha" required />}
          {error && <span className="admin-error">{error}</span>}
          {supabase && <button type="submit">ENTRAR</button>}
        </form>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <aside>
        <strong>Painel</strong>
        <span>Pedidos</span>
      </aside>
      <main>
        <header>
          <div><span>Pedidos recebidos</span><h1>Administração</h1></div>
          <button type="button" onClick={logout}>Sair</button>
        </header>
        <div className="admin-toolbar">
          <label>
            <span>Buscar pedido</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente, WhatsApp ou código" />
          </label>
          <label>
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {["Todos", "Novo", "Em atendimento", "Confirmado", "Finalizado", "Cancelado"].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => { loadOrders(); loadCheckoutLinks(); }}>Atualizar</button>
        </div>
        <section className="admin-stats">
          <div><span>Total de pedidos</span><strong>{normalizedOrders.length}</strong></div>
          <div><span>Novos</span><strong>{normalizedOrders.filter((order) => order.status === "Novo").length}</strong></div>
          <div><span>Valor em pedidos</span><strong>{money.format(normalizedOrders.reduce((total, order) => total + Number(order.total || 0), 0))}</strong></div>
        </section>
        <section className="android-release-admin">
          <div className="tracking-admin-head">
            <div><span>Download para Android</span><h2>Publicar ou atualizar APK</h2></div>
            <Link to="/app" target="_blank">Ver página pública</Link>
          </div>
          {androidRelease && (
            <div className="android-current-release">
              <strong>Versão atualmente publicada: {androidRelease.app_name} v{androidRelease.version}</strong>
              <span>Atualizada em {new Date(androidRelease.updated_at).toLocaleString("pt-BR")} · {formatFileSize(Number(androidRelease.file_size_bytes))}</span>
              <code>SHA-256: {androidRelease.sha256}</code>
            </div>
          )}
          <form onSubmit={publishAndroidRelease}>
            <label><span>Nome do aplicativo</span><input value={appName} onChange={(event) => setAppName(event.target.value)} required /></label>
            <label><span>Versão</span><input value={appVersion} onChange={(event) => setAppVersion(event.target.value)} placeholder="Ex.: 1.0.0" required /></label>
            <label className="android-release-wide"><span>Descrição para o cliente</span><input value={appDescription} onChange={(event) => setAppDescription(event.target.value)} placeholder="O que o cliente consegue acompanhar no aplicativo" required /></label>
            <label className="android-release-wide"><span>Novidades desta versão</span><textarea value={appReleaseNotes} onChange={(event) => setAppReleaseNotes(event.target.value)} placeholder="Opcional" rows={3} /></label>
            <label className="android-release-wide"><span>Arquivo APK (até 100 MB)</span><input key={apkFile?.name || "apk-empty"} type="file" accept=".apk,application/vnd.android.package-archive" onChange={(event) => setApkFile(event.target.files?.[0] || null)} required /></label>
            <p className="android-admin-security-note">O painel calcula o SHA-256 do arquivo e publica apenas a versão carregada. Confirme que o APK foi assinado e verificado antes de enviá-lo; o painel não executa análise antivírus nem valida a identidade do certificado.</p>
            {androidReleaseError && <div className="checkout-error">{androidReleaseError}</div>}
            {androidReleaseMessage && <div className="android-upload-success">{androidReleaseMessage}</div>}
            <button className="android-publish-button" type="submit" disabled={androidReleaseSaving}>
              {androidReleaseSaving ? "ENVIANDO E CALCULANDO HASH..." : "PUBLICAR APK PARA ANDROID"}
            </button>
          </form>
        </section>
        <section className="checkout-link-admin">
          <div className="tracking-admin-head">
            <div>
              <span>Pedido pelo WhatsApp</span>
              <h2>Preparar link de finalização</h2>
            </div>
          </div>
          <p>Escolha os pneus e as quantidades. O cliente receberá um link para preencher os dados de entrega e escolher o pagamento na entrega.</p>
          <label className="checkout-product-search">
            <span>Buscar pneu no catálogo</span>
            <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Marca, medida ou modelo" />
          </label>
          {productMatches.length > 0 && (
            <div className="checkout-product-matches">
              {productMatches.map((product) => (
                <button type="button" key={productSlug(product)} onClick={() => addCheckoutProduct(product)}>
                  <span><strong>{product.brand || "Marca não informada"}</strong>{product.name}</span>
                  <b>{money.format(product.price)}</b>
                </button>
              ))}
            </div>
          )}
          {productSearch.trim() && productMatches.length === 0 && (
            <div className="checkout-manual-product">
              <strong>Não encontramos esse pneu no catálogo</strong>
              <span>Adicione os dados combinados com o cliente:</span>
              <div>
                <label><span>Marca</span><input value={customBrand} onChange={(event) => setCustomBrand(event.target.value)} placeholder="Ex.: XBRI" /></label>
                <label><span>Preço unitário</span><input type="text" inputMode="decimal" value={customPrice} onChange={(event) => setCustomPrice(event.target.value)} placeholder="Ex.: 2150 ou 2.150,00" /></label>
                <label><span>Quantidade</span><input type="number" min="1" max="99" value={customQuantity} onChange={(event) => setCustomQuantity(Math.max(1, Number(event.target.value) || 1))} /></label>
              </div>
              <div className="checkout-image-options">
                <label><span>Imagem por link</span><input type="url" value={customImageUrl} onChange={(event) => { setCustomImageUrl(event.target.value); setCustomImageFile(null); }} placeholder="https://..." /></label>
                <label><span>Ou escolha uma imagem do computador</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => { setCustomImageFile(event.target.files?.[0] || null); setCustomImageUrl(""); }} /></label>
                {(customImagePreview || customImageUrl) && <img src={customImagePreview || customImageUrl} alt="Prévia da imagem do pneu" />}
              </div>
              <small className="checkout-price-help">Digite o valor em reais. Exemplos: 2150, 2.150 ou 2.150,00.</small>
              <button type="button" onClick={addCustomCheckoutProduct} disabled={!Number.isFinite(parseBrazilianPrice(customPrice)) || parseBrazilianPrice(customPrice) <= 0 || customImageUploading}>
                {customImageUploading ? "ENVIANDO IMAGEM..." : "ADICIONAR PNEU"}
              </button>
            </div>
          )}
          {checkoutItems.length > 0 && (
            <div className="checkout-link-items">
              {checkoutItems.map((item) => (
                <article key={item.slug}>
                  <div><strong>{item.brand || "Marca não informada"}</strong><span>{item.name}</span><small>{money.format(item.price)} cada</small></div>
                  <label><span>Qtd.</span><input type="number" min="0" max="99" value={item.quantity} onChange={(event) => updateCheckoutQuantity(item.slug, Number(event.target.value))} /></label>
                  <label><span>Unitário</span><input type="text" inputMode="decimal" value={checkoutPriceDrafts[item.slug] ?? item.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} onChange={(event) => updateCheckoutPriceDraft(item.slug, event.target.value)} onBlur={() => finishCheckoutPriceEdit(item.slug)} /></label>
                  <b>{money.format(item.price * item.quantity)}</b>
                </article>
              ))}
              <div className="checkout-link-total"><span>Total do pedido</span><strong>{money.format(checkoutItemsTotal)}</strong></div>
            </div>
          )}
          {linkError && <div className="checkout-error">{linkError}</div>}
          <button className="checkout-link-create" type="button" onClick={createCheckoutLink} disabled={linkSaving || checkoutItems.length === 0 || checkoutItems.some((item) => item.price <= 0 || (checkoutPriceDrafts[item.slug] !== undefined && !Number.isFinite(parseBrazilianPrice(checkoutPriceDrafts[item.slug]))))}>
            {linkSaving ? "GERANDO LINK..." : "GERAR LINK PARA O CLIENTE"}
          </button>
          {latestCheckoutLink && (
            <div className="checkout-link-created">
              <strong>Link pronto. Ele expira em 7 dias e pode ser usado uma vez.</strong>
              <input readOnly value={latestCheckoutLink} aria-label="Link do pedido" />
              <div>
                <button type="button" onClick={() => copyCheckoutLink(latestCheckoutLink, "latest")}>
                  {copiedCheckoutToken === "latest" ? "Copiado" : "Copiar link"}
                </button>
                <a href={`https://wa.me/?text=${encodeURIComponent(`Olá! Confira os pneus e finalize seu pedido com pagamento na entrega: ${latestCheckoutLink}`)}`} target="_blank" rel="noreferrer">Abrir WhatsApp</a>
              </div>
            </div>
          )}
          {checkoutLinks.length > 0 && (
            <div className="checkout-link-history">
              <h3>Links recentes</h3>
              {checkoutLinks.map((link) => {
                const url = `${window.location.origin}/pedido/${link.token}`;
                const expired = new Date(link.expires_at).getTime() <= Date.now();
                const status = link.used_at ? "Pedido enviado" : expired ? "Expirado" : "Aguardando cliente";
                return (
                  <article key={link.id}>
                    <div><strong>{link.items.map((item) => `${item.quantity}x ${item.name}`).join(" · ")}</strong><span>{status} · {new Date(link.created_at).toLocaleString("pt-BR")}</span></div>
                    <button type="button" disabled={Boolean(link.used_at) || expired} onClick={() => copyCheckoutLink(url, link.token)}>
                      {copiedCheckoutToken === link.token ? "Copiado" : "Copiar"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <section className="tracking-admin">
          <div className="tracking-admin-head">
            <div>
              <span>Rastreio</span>
              <h2>Criar ou atualizar envio</h2>
            </div>
          </div>
          <form onSubmit={saveTracking}>
            <label>
              <span>Pedido</span>
              <select value={trackingOrderId} onChange={(event) => setTrackingOrderId(event.target.value)} required>
                <option value="">Selecione o pedido</option>
                {normalizedOrders.map((order) => (
                  <option value={order.id} key={order.id}>{order.publicId || order.id} - {order.customer.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Código</span>
              <div className="tracking-code-row">
                <input value={trackingCode} onChange={(event) => setTrackingCode(event.target.value.toUpperCase())} placeholder="PNEU-XXXXXX" required />
                <button type="button" onClick={generateTrackingCode}>Gerar</button>
              </div>
            </label>
            <label><span>Cidade de origem</span><input value={originCity} onChange={(event) => setOriginCity(event.target.value)} placeholder="Ex.: São Paulo/SP" required /></label>
            <label><span>Cidade de destino</span><input value={destinationCity} onChange={(event) => setDestinationCity(event.target.value)} placeholder="Ex.: Fortaleza/CE" required /></label>
            <label>
              <span>Status atual</span>
              <select value={trackingStatus} onChange={(event) => setTrackingStatus(event.target.value)}>
                {["Pedido confirmado", "Enviado", "Em trânsito", "Chegou na cidade de destino", "Saiu para entrega", "Entregue"].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label><span>Local atual / por onde passou</span><input value={trackingLocation} onChange={(event) => setTrackingLocation(event.target.value)} placeholder="Ex.: Centro de distribuição de Goiânia" /></label>
            <label className="tracking-description"><span>Descrição da atualização</span><input value={trackingDescription} onChange={(event) => setTrackingDescription(event.target.value)} placeholder="Ex.: Encomenda chegou ao centro de distribuição" /></label>
            <button className="tracking-save" type="submit">SALVAR RASTREAMENTO</button>
          </form>
        </section>
        <section className="admin-orders">
          {filteredOrders.length === 0 ? (
            <div className="admin-empty"><strong>Nenhum pedido recebido</strong><span>Os pedidos aparecerão aqui automaticamente.</span></div>
          ) : filteredOrders.map((order) => (
            <article key={order.id}>
              <header>
                <div><strong>{order.publicId || order.id}</strong><span>{new Date(order.createdAt).toLocaleString("pt-BR")}</span></div>
                <select
                  className={`order-status status-${String(order.status).toLowerCase().replace(/\s/g, "-")}`}
                  value={order.status}
                  onChange={(event) => updateStatus(order.id, event.target.value)}
                >
                  {["Novo", "Em atendimento", "Confirmado", "Finalizado", "Cancelado"].map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </header>
              <div className="admin-order-grid">
                <div><span>Cliente</span><strong>{order.customer.name}</strong></div>
                <div>
                  <span>WhatsApp</span>
                  <div className="whatsapp-copy-row">
                    <strong>{order.customer.whatsapp}</strong>
                    <button type="button" onClick={() => copyWhatsApp(order.customer.whatsapp, order.id)}>
                      {copiedId === order.id ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </div>
                <div><span>Pagamento</span><strong>{order.customer.payment}</strong></div>
                <div><span>Dispositivo</span><strong>{order.device.label}</strong></div>
                <div className="admin-address"><span>Endereço</span><strong>{order.customer.street}, {order.customer.number} - {order.customer.neighborhood}, {order.customer.city}/{order.customer.state} - CEP {order.customer.cep}</strong></div>
                <div className="admin-address"><span>Pedido</span><strong>{order.items.map((item) => `${item.quantity}x ${item.name}`).join(" | ")}</strong></div>
                <div><span>Total</span><strong>{money.format(order.total)}</strong></div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CatalogApp />} />
          <Route path="/produto/:slug" element={<ProductDetail />} />
          <Route path="/finalizar-pedido" element={<CheckoutPage />} />
          <Route path="/pedido/:token" element={<CheckoutPage />} />
          <Route path="/rastreamento/:code" element={<TrackingPage />} />
          <Route path="/rastreamento" element={<TrackingPage />} />
          <Route path="/app" element={<AndroidDownloadPage />} />
          <Route path="/baixar-aplicativo" element={<AndroidDownloadPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<CatalogApp />} />
        </Routes>
        <CartDrawer />
      </BrowserRouter>
    </CartProvider>
  );
}
