/* ============================================================
   MAIN.JS
   Toma los datos de js/products.js y arma:
   1. Menú móvil
   2. Tabs de filtro + grid del catálogo
   3. Carrusel de destacados
   4. Tarjetas de testimonios
   5. Carrito de compras (localStorage) + checkout por WhatsApp
   Todo el contenido dinámico vive en products.js; este archivo
   solo sabe cómo pintarlo.
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initNavToggle();
  initVideoBanner();
  initCatalog();
  initCarousel();
  initTestimonials();
  initCart();
  initLightbox();
});

/* ---------- Banner de video ---------- */
function initVideoBanner() {
  const video = document.getElementById("banner-video");
  const banner = document.getElementById("video-banner");
  if (!video || !banner) return;

  // Si videos/deco-billy-reel.mp4 no existe todavía, mostramos el
  // marcador visual en vez de un reproductor roto.
  video.addEventListener("error", () => banner.classList.add("no-media"));
  const source = video.querySelector("source");
  source?.addEventListener("error", () => banner.classList.add("no-media"));

  // Si en 1.5s no hay datos cargados, asumimos que el archivo no está.
  window.setTimeout(() => {
    if (video.readyState === 0) banner.classList.add("no-media");
  }, 1500);
}

/* ---------- Menú móvil ---------- */
function initNavToggle() {
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("main-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------- Tracking (Google Tag Manager / Google Analytics) ---------- */
function trackEvent(eventName, params) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...params });
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}

/* ---------- Tarjeta de producto (compartida por catálogo y carrusel) ---------- */
function renderProductCardHTML(product) {
  const initials = product.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const images = product.images && product.images.length ? product.images : [];
  const hasGallery = images.length > 1;

  return `
    <div class="card-media" data-id="${product.id}" role="button" tabindex="0"
         aria-label="Ampliar fotos de ${product.name}">
      <img src="${images[0] || ""}" alt="${product.name}"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
           loading="lazy" />
      <span class="placeholder-mark" style="align-items:center; justify-content:center; width:100%; height:100%;">${initials}</span>
      ${product.badge ? `<span class="card-badge">${product.badge}</span>` : ""}
      ${hasGallery ? `<span class="gallery-badge">1/${images.length}</span>` : ""}
    </div>
    <div class="card-body">
      <span class="card-cat">${CATEGORY_LABELS[product.category] || product.category}</span>
      <span class="card-name">${product.name}</span>
      <span class="card-price">${product.price}</span>
      <div class="card-actions">
        <a class="card-buy" target="_blank" rel="noopener" href="${buildWhatsappLink(product.name)}"
           data-id="${product.id}" data-name="${product.name}" data-price="${product.price}">
          Comprar
        </a>
        <button class="card-add-cart" type="button"
                data-id="${product.id}" data-name="${product.name}" data-price="${product.price}">
          Añadir al carrito
        </button>
      </div>
    </div>
  `;
}

/* ---------- Catálogo + filtros ---------- */
function initCatalog() {
  const tabsWrap = document.getElementById("filter-tabs");
  const grid = document.getElementById("product-grid");
  if (!tabsWrap || !grid) return;

  const categories = ["todos", ...new Set(PRODUCTS.map((p) => p.category))];

  tabsWrap.innerHTML = categories
    .map(
      (cat, i) => `
      <button class="filter-tab" role="tab" data-cat="${cat}" aria-selected="${i === 0}">
        ${CATEGORY_LABELS[cat] || cat}
      </button>`
    )
    .join("");

  function renderGrid(cat) {
    const items = cat === "todos" ? PRODUCTS : PRODUCTS.filter((p) => p.category === cat);
    grid.innerHTML = items
      .map(
        (p) => `
        <article class="product-card" data-id="${p.id}">
          ${renderProductCardHTML(p)}
        </article>`
      )
      .join("");
  }

  tabsWrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-tab");
    if (!btn) return;
    tabsWrap.querySelectorAll(".filter-tab").forEach((b) => b.setAttribute("aria-selected", "false"));
    btn.setAttribute("aria-selected", "true");
    renderGrid(btn.dataset.cat);
  });

  renderGrid("todos");
}

/* ---------- Carrusel de destacados ---------- */
function initCarousel() {
  const track = document.getElementById("carousel-track");
  const dotsWrap = document.getElementById("carousel-dots");
  const prevBtn = document.getElementById("carousel-prev");
  const nextBtn = document.getElementById("carousel-next");
  if (!track) return;

  const featured = PRODUCTS.filter((p) => p.featured);
  if (featured.length === 0) return;

  track.innerHTML = featured
    .map(
      (p) => `
      <li class="carousel-slide">
        <article class="carousel-card">
          ${renderProductCardHTML(p)}
        </article>
      </li>`
    )
    .join("");

  const slides = Array.from(track.children);
  let index = 0;
  let visiblePerView = getVisiblePerView();
  let autoplayId = null;

  function getVisiblePerView() {
    const w = window.innerWidth;
    if (w <= 720) return 1;
    if (w <= 980) return 2;
    return 3;
  }

  function maxIndex() {
    return Math.max(0, slides.length - visiblePerView);
  }

  function update() {
    const slideWidth = slides[0].getBoundingClientRect().width + 22;
    track.style.transform = `translateX(-${index * slideWidth}px)`;
    renderDots();
  }

  function renderDots() {
    const dotCount = maxIndex() + 1;
    dotsWrap.innerHTML = Array.from({ length: dotCount })
      .map((_, i) => `<button aria-current="${i === index}" aria-label="Ir al grupo ${i + 1}"></button>`)
      .join("");
  }

  function goTo(i) {
    index = Math.min(Math.max(i, 0), maxIndex());
    update();
  }

  prevBtn?.addEventListener("click", () => goTo(index - 1));
  nextBtn?.addEventListener("click", () => goTo(index + 1));
  dotsWrap.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    goTo(Array.from(dotsWrap.children).indexOf(btn));
  });

  window.addEventListener("resize", () => {
    visiblePerView = getVisiblePerView();
    goTo(0);
  });

  /* Autoplay suave, se detiene si el usuario interactúa o pasa el mouse */
  function startAutoplay() {
    stopAutoplay();
    autoplayId = window.setInterval(() => {
      goTo(index + 1 >= maxIndex() + 1 ? 0 : index + 1);
    }, 5500);
  }
  function stopAutoplay() {
    if (autoplayId) window.clearInterval(autoplayId);
  }

  const carouselEl = document.getElementById("carousel");
  carouselEl?.addEventListener("mouseenter", stopAutoplay);
  carouselEl?.addEventListener("mouseleave", startAutoplay);

  update();
  startAutoplay();
}

/* ---------- Testimonios ---------- */
function initTestimonials() {
  const wrap = document.getElementById("testimonial-grid");
  if (!wrap) return;

  wrap.innerHTML = TESTIMONIALS.map(
    (t) => `
    <article class="testimonial-card">
      <div class="testimonial-stars" aria-label="${t.rating} de 5 estrellas">${"★".repeat(t.rating)}</div>
      <p class="testimonial-quote" style="text-align: justify;">“${t.quote}”</p>
      <p class="testimonial-name">${t.name}</p>
      <p class="testimonial-city">${t.city}</p>
    </article>`
  ).join("");
}

/* ---------- Carrito de compras (localStorage + checkout por WhatsApp) ---------- */
const CART_KEY = "decobilly_cart_v1";

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch (e) {
    /* localStorage no disponible: el carrito solo vive en esta carga de página */
  }
  updateCartBadge();
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find((i) => i.id === item.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  setCart(cart);
}

function removeFromCart(id) {
  setCart(getCart().filter((i) => i.id !== id));
  renderCartItems();
}

function clearCart() {
  setCart([]);
  renderCartItems();
}

function updateCartBadge() {
  const badge = document.getElementById("cart-count");
  if (!badge) return;
  const count = getCart().reduce((sum, i) => sum + i.qty, 0);
  badge.textContent = String(count);
  badge.style.display = count > 0 ? "inline-flex" : "none";
}

function parsePriceToNumber(priceStr) {
  const digits = (priceStr.match(/\d+/g) || []).join("");
  return digits ? parseInt(digits, 10) : 0;
}

function formatCOP(n) {
  return `$${n.toLocaleString("es-CO")}`;
}

function getCartTotal() {
  return getCart().reduce((sum, i) => sum + parsePriceToNumber(i.price) * i.qty, 0);
}

function buildCartWhatsappLink() {
  const cart = getCart();
  if (cart.length === 0) return null;

  const lines = cart.map(
    (i) => `${i.name}\n${i.qty} und · ${i.price}`
  );
  const total = formatCOP(getCartTotal());

  const message = [
    "*DECO BILLY* 🖤",
    "Este es mi pedido desde la web:",
    "",
    "*PRODUCTOS*",
    lines.join("\n\n"),
    "",
    "*TOTAL*",
    `${total} `,
    "_envío se cotiza aparte_",
    "",
    "Quedo pendiente a la confirmación de disponibilidad y tiempos de entrega. 🔥"
  ].join("\n");

  return `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;
}

function renderCartItems() {
  const wrap = document.getElementById("cart-items");
  const totalWrap = document.getElementById("cart-total");
  if (!wrap) return;
  const cart = getCart();

  if (cart.length === 0) {
    wrap.innerHTML = `<p class="cart-empty">Tu carrito está vacío. Agrega piezas desde el catálogo o los destacados.</p>`;
    if (totalWrap) totalWrap.innerHTML = "";
    return;
  }

  wrap.innerHTML = cart
    .map(
      (item) => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-info">
          <span class="cart-item-name">${item.name}</span>
          <span class="cart-item-meta">Cant. ${item.qty} · ${item.price}</span>
        </div>
        <button class="cart-item-remove" type="button" data-id="${item.id}" aria-label="Quitar ${item.name}">✕</button>
      </div>`
    )
    .join("");

  if (totalWrap) {
    totalWrap.innerHTML = `<span>Total</span><span>${formatCOP(getCartTotal())}</span>`;
  }
}

function openCart() {
  const modal = document.getElementById("cart-modal");
  if (!modal) return;
  renderCartItems();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  const modal = document.getElementById("cart-modal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function initCart() {
  updateCartBadge();

  document.getElementById("cart-trigger")?.addEventListener("click", openCart);
  document.getElementById("cart-close")?.addEventListener("click", closeCart);
  document.getElementById("cart-overlay")?.addEventListener("click", closeCart);
  document.getElementById("cart-clear")?.addEventListener("click", clearCart);

  document.getElementById("cart-checkout")?.addEventListener("click", () => {
    const link = buildCartWhatsappLink();
    if (!link) {
      renderCartItems();
      return;
    }
    trackEvent("begin_checkout", {
      items: getCart().map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.qty })),
    });
    window.open(link, "_blank", "noopener");
  });

  // Delegación de eventos: funciona con tarjetas del catálogo y del
  // carrusel, incluso cuando se regeneran al cambiar de filtro.
  document.addEventListener("click", (e) => {
    const buyBtn = e.target.closest(".card-buy");
    if (buyBtn) {
      trackEvent("select_item", {
        item_id: buyBtn.dataset.id,
        item_name: buyBtn.dataset.name,
        price: buyBtn.dataset.price,
      });
    }

    const addBtn = e.target.closest(".card-add-cart");
    if (addBtn) {
      const item = {
        id: addBtn.dataset.id,
        name: addBtn.dataset.name,
        price: addBtn.dataset.price,
      };
      addToCart(item);
      trackEvent("add_to_cart", {
        item_id: item.id,
        item_name: item.name,
        price: item.price,
      });
      const original = addBtn.textContent;
      addBtn.textContent = "Agregado ✓";
      addBtn.disabled = true;
      window.setTimeout(() => {
        addBtn.textContent = original;
        addBtn.disabled = false;
      }, 1100);
      return;
    }

    const removeBtn = e.target.closest(".cart-item-remove");
    if (removeBtn) {
      removeFromCart(removeBtn.dataset.id);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeCart();
    closeLightbox();
  });
}

/* ---------- Lightbox / galería de imágenes del producto ---------- */
let lightboxImages = [];
let lightboxIndex = 0;
let lightboxProductName = "";

function findProductImages(id) {
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) return { images: [], name: "" };
  return { images: product.images || [], name: product.name };
}

function renderLightboxImage() {
  const img = document.getElementById("lightbox-image");
  const counter = document.getElementById("lightbox-counter");
  const caption = document.getElementById("lightbox-caption");
  if (!img || lightboxImages.length === 0) return;

  img.src = lightboxImages[lightboxIndex];
  img.alt = `${lightboxProductName} — foto ${lightboxIndex + 1}`;
  if (counter) {
    counter.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
    counter.style.display = lightboxImages.length > 1 ? "inline-flex" : "none";
  }
  if (caption) caption.textContent = lightboxProductName;

  const modal = document.getElementById("lightbox");
  modal?.querySelectorAll(".lightbox-prev, .lightbox-next").forEach((btn) => {
    btn.style.display = lightboxImages.length > 1 ? "grid" : "none";
  });
}

function openLightbox(productId, startIndex = 0) {
  const { images, name } = findProductImages(productId);
  if (images.length === 0) return;

  lightboxImages = images;
  lightboxIndex = startIndex;
  lightboxProductName = name;
  renderLightboxImage();

  const modal = document.getElementById("lightbox");
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  const modal = document.getElementById("lightbox");
  if (!modal || !modal.classList.contains("is-open")) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function lightboxStep(delta) {
  if (lightboxImages.length === 0) return;
  lightboxIndex = (lightboxIndex + delta + lightboxImages.length) % lightboxImages.length;
  renderLightboxImage();
}

function initLightbox() {
  document.getElementById("lightbox-close")?.addEventListener("click", closeLightbox);
  document.getElementById("lightbox-overlay")?.addEventListener("click", closeLightbox);
  document.getElementById("lightbox-prev")?.addEventListener("click", () => lightboxStep(-1));
  document.getElementById("lightbox-next")?.addEventListener("click", () => lightboxStep(1));

  // Delegación: cualquier miniatura de producto (catálogo o carrusel)
  // abre la galería, aunque las tarjetas se regeneren al filtrar.
  document.addEventListener("click", (e) => {
    const media = e.target.closest(".card-media");
    if (media && media.dataset.id) {
      openLightbox(media.dataset.id, 0);
    }
  });

  document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("lightbox");
    if (!modal || !modal.classList.contains("is-open")) return;
    if (e.key === "ArrowLeft") lightboxStep(-1);
    if (e.key === "ArrowRight") lightboxStep(1);
  });

  // Accesibilidad: abrir con Enter/Espacio cuando la miniatura tiene foco
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const media = document.activeElement?.closest?.(".card-media");
    if (media && media.dataset.id) {
      e.preventDefault();
      openLightbox(media.dataset.id, 0);
    }
  });
}

/* ============================================================
   TRANSICIÓN HERO → VIDEO (animación de entrada)
============================================================ */
(function(){
  var el = document.getElementById('transicion');
  if (!el) return;
  if (!('IntersectionObserver' in window)) { el.classList.add('is-visible'); return; }
  var io = new IntersectionObserver(function(entries){
    if (entries[0].isIntersecting) {
      el.classList.add('is-visible');
      io.disconnect();
    }
  }, { threshold: 0.3 });
  io.observe(el);
})();
