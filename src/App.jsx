import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { products } from "./data/products";
import { aro12Products } from "./data/aro12Products";
import { rimProducts } from "./data/rimProducts";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function productSlug(product) {
  return product.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getAllProducts() {
  const catalog = [...products, ...aro12Products];
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
                    ["Medidas", carSizes],
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
                  {mobileSection === "Medidas" && carSizes.map((item) => (
                    <a href="#" key={item}>{item}<span>›</span></a>
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
                    <div className="mega-column"><h3>Carros</h3>{carSizes.map((item) => <a href="#" key={item}>{item}</a>)}</div>
                    <div className="mega-column"><h3>Caminhões</h3>{truckSizes.map((item) => <a href="#" key={item}>{item}</a>)}</div>
                    <div className="mega-column"><h3>Caminhões/SUV</h3>{suvSizes.map((item) => <a href="#" key={item}>{item}</a>)}</div>
                  </>
                ) : null}
              </div>
            )}
          </div>
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

function ProductCard({ product, onBuy }) {
  const [added, setAdded] = useState(false);
  const navigate = useNavigate();
  const cart = useCart();
  const warranty = product.brand === "Bransales" ? "7" : "5";
  const brandClass = product.brand.toLowerCase();
  const demoRatings = [4.8, 4.9, 4.7, 5, 4.6, 4.8, 4.5, 4.9, 4.7, 5, 4.6, 4.8, 4.9, 4.5, 4.7, 5, 4.8, 4.6];
  const demoCounts = [120, 284, 156, 430, 208, 319, 112, 502, 245, 378, 167, 449, 226, 105, 534, 291, 348, 416];
  const rating = demoRatings[(product.id - 1) % demoRatings.length];
  const reviewCount = demoCounts[(product.id - 1) % demoCounts.length];
  const filledWidth = `${rating * 20}%`;

  function buyProduct() {
    cart.addItem(product, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  return (
    <article className="product-card" onClick={() => navigate(`/produto/${productSlug(product)}`)}>
      <div className="product-image">
        <span className={`quality-seal quality-${brandClass}`}>
          <b>{warranty}</b>
          <span>
            <small>anos</small>
            <em>garantia</em>
          </span>
        </span>
        <span className={`brand-logo brand-logo-${brandClass}`}>
          {product.brand === "JK" ? "JK TYRE" : product.brand}
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
        <div className="brand-name">{product.brand}</div>
        <div className="product-name">{product.name}</div>
        <div className="rating" aria-label={`${rating} de 5 estrelas, ${reviewCount} avaliações`}>
          <span className="stars" aria-hidden="true">
            <span className="stars-empty">★★★★★</span>
            <span className="stars-filled" style={{ width: filledWidth }}>★★★★★</span>
          </span>
          <strong>({reviewCount})</strong>
        </div>
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
    .filter((item) => item.id !== product.id)
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
            <span className="detail-brand">{product.brand}</span>
            <h1>{product.name}</h1>
            <div className="detail-rating"><span>★★★★★</span><small>Produto novo</small></div>
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
            <div><span>Marca</span><strong>{product.brand}</strong></div>
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
              <Link className="related-card" to={`/produto/${productSlug(item)}`} key={item.id || item.name}>
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
          <div className="review-summary">
            <strong>4.8</strong>
            <div><span>★★★★★</span><small>54 avaliações</small></div>
          </div>
          <p>Ainda não há perguntas sobre este produto.</p>
          <input type="text" placeholder="Escreva uma pergunta" aria-label="Pergunta sobre o produto" />
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
    const source = selectedRim
      ? (rimProducts[selectedRim] || (selectedRim === "Aro 12" ? aro12Products : []))
      : products;
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
                  <ProductCard product={product} onBuy={() => {}} key={product.id} />
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

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
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
    if (cart.items.length === 0) return;
    setSubmitError("");

    const order = {
      id: `PED-${Date.now().toString().slice(-8)}`,
      createdAt: new Date().toISOString(),
      customer: form,
      items: cart.items,
      total: cart.cartTotal,
      status: "Novo",
      device: detectDevice(),
    };

    try {
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
      setSubmitError(error.message || "Não foi possível enviar o pedido. Tente novamente.");
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
          <div className="success-payment">
            <strong>PAGAMENTO NA ENTREGA</strong>
            <span>Nenhum valor foi cobrado antecipadamente</span>
          </div>
          <button type="button" onClick={() => navigate("/")}>CONTINUAR COMPRANDO</button>
        </section>
      </CheckoutShell>
    );
  }

  if (cart.items.length === 0) {
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
            <button className="checkout-submit" type="submit">ENVIAR PEDIDO</button>
          </form>

          <aside className="checkout-summary">
            <h2>Resumo do pedido</h2>
            {cart.items.map((item) => (
              <div className="checkout-item" key={item.slug}>
                <img src={item.image} alt={item.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/tire-placeholder.svg"; }} />
                <div><strong>{item.brand}</strong><span>{item.name}</span><small>{item.quantity} unidade(s)</small></div>
                <b>{money.format(item.price * item.quantity)}</b>
              </div>
            ))}
            <div className="checkout-total"><span>Total</span><strong>{money.format(cart.cartTotal)}</strong></div>
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

function AdminPage() {
  const [email, setEmail] = useState("fehprado2025@gmail.com");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState(() => JSON.parse(localStorage.getItem("customer-orders") || "[]"));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [copiedId, setCopiedId] = useState("");

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

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setAuthenticated(true);
    });
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    loadOrders();
    if (!supabase) return;
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, loadOrders)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authenticated]);

  const login = async (event) => {
    event.preventDefault();
    setError("");
    if (!supabase) {
      if (password === "boy@2027") setAuthenticated(true);
      else setError("Senha incorreta");
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

  if (!authenticated) {
    return (
      <div className="admin-login">
        <form onSubmit={login}>
          <strong>ÁREA ADMINISTRATIVA</strong>
          <h1>Acesso restrito</h1>
          {supabase && <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mail" required />}
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha" required />
          {error && <span className="admin-error">{error}</span>}
          <button type="submit">ENTRAR</button>
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
          <button type="button" onClick={loadOrders}>Atualizar</button>
        </div>
        <section className="admin-stats">
          <div><span>Total de pedidos</span><strong>{normalizedOrders.length}</strong></div>
          <div><span>Novos</span><strong>{normalizedOrders.filter((order) => order.status === "Novo").length}</strong></div>
          <div><span>Valor em pedidos</span><strong>{money.format(normalizedOrders.reduce((total, order) => total + Number(order.total || 0), 0))}</strong></div>
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
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<CatalogApp />} />
        </Routes>
        <CartDrawer />
      </BrowserRouter>
    </CartProvider>
  );
}
