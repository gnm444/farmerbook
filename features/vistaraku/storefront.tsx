"use client";

import Script from "next/script";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Leaf,
  Minus,
  PackageCheck,
  Plus,
  Send,
  ShoppingBag,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import {
  formatINR,
  packPrice,
  storePrice,
  type VistarakuStoreProduct,
} from "@/features/vistaraku/store-products";
import { submitVistarakuOrderAction } from "./order-actions";
import styles from "@/features/vistaraku/vistaraku.module.css";

type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string;
  remove(widgetId: string): void;
  reset(widgetId: string): void;
};

function getTurnstileApi() {
  return (window as typeof window & { turnstile?: TurnstileApi }).turnstile;
}

type Props = {
  products: readonly VistarakuStoreProduct[];
  orderEmail: string;
  turnstileSiteKey: string;
};

const ALL = "All products";

export function VistarakuStorefront({ products, orderEmail, turnstileSiteKey }: Props) {
  const categories = [ALL, ...Array.from(new Set(products.map((product) => product.category)))];
  const [category, setCategory] = useState(ALL);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const rawId = useId();
  const formId = rawId.replaceAll(":", "");

  const filteredProducts = category === ALL
    ? products
    : products.filter((product) => product.category === category);

  const cartItems = useMemo(
    () => products
      .filter((product) => cart[product.slug])
      .map((product) => ({ product, quantity: cart[product.slug] })),
    [cart, products],
  );
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = cartItems.reduce((sum, item) => sum + packPrice(item.product) * item.quantity, 0);

  useEffect(() => {
    if (!checkoutOpen || !turnstileReady || !turnstileSiteKey || !turnstileContainer.current) return undefined;
    const api = getTurnstileApi();
    if (!api) return undefined;
    if (turnstileWidgetId.current) api.remove(turnstileWidgetId.current);
    const widgetId = api.render(turnstileContainer.current, {
      sitekey: turnstileSiteKey,
      action: "vistaraku_store_checkout",
      callback: setTurnstileToken,
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
    turnstileWidgetId.current = widgetId;
    return () => {
      const currentApi = getTurnstileApi();
      if (currentApi) currentApi.remove(widgetId);
      turnstileWidgetId.current = null;
      setTurnstileToken("");
    };
  }, [checkoutOpen, turnstileReady, turnstileSiteKey]);

  function updateCart(slug: string, nextQuantity: number) {
    setCheckoutSuccess(false);
    setCart((current) => {
      const next = { ...current };
      if (nextQuantity > 0) next[slug] = nextQuantity;
      else delete next[slug];
      return next;
    });
  }

  function openCheckout() {
    setCheckoutError("");
    setCheckoutOpen(true);
    setCartOpen(true);
  }

  function submitCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    setCheckoutError("");
    setIsSubmitting(true);

    void submitVistarakuOrderAction({
      name: data.get("name"),
      email: data.get("email"),
      phone: data.get("phone"),
      location: data.get("location"),
      notes: data.get("notes") ?? "",
      consent: data.get("consent") === "on",
      website: data.get("website") ?? "",
      idempotencyKey: crypto.randomUUID(),
      turnstileToken,
      items: cartItems.map(({ product, quantity }) => ({
        slug: product.slug,
        quantity,
      })),
    }).then((result) => {
      setIsSubmitting(false);
      if (!result.ok) {
        setCheckoutError(result.message);
        if (turnstileWidgetId.current) getTurnstileApi()?.reset(turnstileWidgetId.current);
        setTurnstileToken("");
        return;
      }
      setCheckoutSuccess(true);
      setCheckoutOpen(false);
      setCart({});
      formElement.reset();
    });
  }

  return (
    <>
      <section className={styles.storeHero}>
        <div className={styles.storeHeroImage} role="img" aria-label="Natural leaf texture from Vistaraku products" />
        <div className={styles.storeHeroOverlay} />
        <div className={styles.storeHeroContent}>
          <span className={styles.storeKicker}><Leaf size={16} aria-hidden="true" /> Vistaraku × FarmerBook</span>
          <h1>Serve every meal<br /><em>with intention.</em></h1>
          <p>Natural leaf plates and planet-kind tableware for ceremonies, community meals, homes and food businesses.</p>
          <a className={`button ${styles.buttonLight}`} href="#shop">Shop the collection <ChevronDown size={16} aria-hidden="true" /></a>
        </div>
        <div className={styles.heroStamp}><Sparkles size={15} aria-hidden="true" /><span>100%<small>natural leaf options</small></span></div>
      </section>

      <section className={styles.awarenessStrip} aria-label="Why choose natural tableware">
        <div><span className={styles.stripIcon}><Leaf size={19} aria-hidden="true" /></span><strong>Made from leaves</strong><span>Thoughtful alternatives to plastic-coated tableware</span></div>
        <div><span className={styles.stripIcon}><PackageCheck size={19} aria-hidden="true" /></span><strong>Bulk-ready packs</strong><span>Clear pack sizes for events and everyday use</span></div>
        <div><span className={styles.stripIcon}><Truck size={19} aria-hidden="true" /></span><strong>Built for gatherings</strong><span>Plates, bowls, boxes, glasses and cutlery</span></div>
      </section>

      <section className={styles.storyBand}>
        <div>
          <p className={styles.eyebrow}>మన భోజనం · మన బాధ్యత</p>
          <h2>ఖర్చు మాత్రమే కాదు.<br />ఎంపిక కూడా ముఖ్యం.</h2>
        </div>
        <p dir="auto">ఈ రోజుల్లో మనలో చాలామంది ఆరోగ్యం లేదా భద్రత కంటే ముందు ఖర్చు గురించే ఆలోచిస్తారు. వేడుకల్లో భోజనం వడ్డించే పాత్రలను కూడా మన ఎంపికలో భాగంగా చేసుకుందాం. సహజమైన ఆకు ప్లేట్లు మన భోజనానికి అందాన్ని, మనసుకు బాధ్యతను జోడిస్తాయి.</p>
        <p>We often optimise the menu and the budget, but the plate is part of the meal too. Choose tableware that respects the occasion, the people eating and the world we share. Product suitability and disposal should always be checked for your local conditions.</p>
      </section>

      <section className={styles.shopSection} id="shop">
        <div className={styles.shopHeader}>
          <div>
            <p className={styles.eyebrow}>The Vistaraku collection</p>
            <h2>Choose your tableware</h2>
            <p>Prices below are based on the supplied wholesale price list with a 30% markup. GST and freight are confirmed separately.</p>
          </div>
          <button className={styles.mobileCartButton} type="button" onClick={() => setCartOpen(true)}><ShoppingBag size={17} aria-hidden="true" /> Cart <span>{itemCount}</span></button>
        </div>

        <div className={styles.shopLayout}>
          <div className={styles.catalogColumn}>
            <div className={styles.categoryScroller} aria-label="Product categories">
              {categories.map((item) => <button className={item === category ? styles.categoryButtonActive : styles.categoryButton} key={item} type="button" onClick={() => setCategory(item)}>{item}</button>)}
            </div>
            <div className={styles.storeProductGrid}>
              {filteredProducts.map((product) => {
                const quantity = cart[product.slug] ?? 0;
                return (
                  <article className={styles.storeProductCard} key={product.slug}>
                    <div className={styles.storeProductImage}><img src={product.image} alt={product.imageAlt} loading="lazy" /></div>
                    <div className={styles.storeProductInfo}>
                      <span className={styles.productCategory}>{product.category}</span>
                      <h3>{product.name}</h3>
                      <div className={styles.priceRow}><strong>{formatINR(storePrice(product))}</strong><span>per {product.unitLabel}</span></div>
                      <p className={styles.packLine}>Pack of {product.packQuantity} · {formatINR(packPrice(product))}</p>
                      {product.note ? <p className={styles.storeProductNote}>{product.note}</p> : null}
                      {product.gstNote ? <p className={styles.storeGst}>{product.gstNote}</p> : null}
                      <div className={styles.productCardAction}>
                        {quantity ? (
                          <div className={styles.quantityControl} aria-label={`Quantity for ${product.name}`}>
                            <button type="button" aria-label={`Remove one pack of ${product.name}`} onClick={() => updateCart(product.slug, quantity - 1)}><Minus size={15} /></button>
                            <strong>{quantity}</strong>
                            <button type="button" aria-label={`Add one pack of ${product.name}`} onClick={() => updateCart(product.slug, quantity + 1)}><Plus size={15} /></button>
                          </div>
                        ) : <button className={styles.addButton} type="button" onClick={() => updateCart(product.slug, 1)}>Add pack to enquiry <Plus size={15} aria-hidden="true" /></button>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className={`${styles.cartPanel} ${cartOpen ? styles.cartPanelOpen : ""}`} aria-label="Enquiry cart">
            <div className={styles.cartHeader}><div><span className={styles.productCategory}>Your selection</span><h2>Enquiry cart</h2></div><button className={styles.closeCart} type="button" aria-label="Close cart" onClick={() => setCartOpen(false)}><X size={18} /></button></div>
            {checkoutSuccess ? <div className={styles.checkoutSuccess} role="status"><CheckCircle2 size={28} aria-hidden="true" /><strong>Order enquiry sent</strong><span>It was sent to {orderEmail}. Vistaraku can now reply directly to you.</span></div> : null}
            {cartItems.length ? <div className={styles.cartItems}>{cartItems.map(({ product, quantity }) => <div className={styles.cartItem} key={product.slug}><div><strong>{product.name}</strong><span>{quantity} pack(s) · {quantity * product.packQuantity} pieces</span><span>{formatINR(packPrice(product))} per pack</span></div><button type="button" aria-label={`Remove ${product.name}`} onClick={() => updateCart(product.slug, 0)}><X size={15} /></button></div>)}</div> : <div className={styles.emptyCart}><ShoppingBag size={28} aria-hidden="true" /><p>Your selection is empty.</p><span>Add products to build an enquiry for Vistaraku.</span></div>}
            {cartItems.length ? <div className={styles.cartSummary}><div><span>Estimated product total</span><strong>{formatINR(total)}</strong></div><small>30% markup included. GST, freight and final availability are confirmed by Vistaraku.</small><button className="button" type="button" onClick={openCheckout}><ClipboardList size={16} aria-hidden="true" /> Checkout on FarmerBook</button>{checkoutOpen ? <form className={styles.checkoutForm} onSubmit={submitCheckout}><div className={styles.checkoutHeading}><strong>Send your order enquiry</strong><span>No Gmail sign-in. FarmerBook sends it securely to Vistaraku.</span></div><div className={styles.checkoutFields}><label htmlFor={`${formId}-name`}><span>Name</span><input id={`${formId}-name`} name="name" autoComplete="name" minLength={2} maxLength={120} required /></label><label htmlFor={`${formId}-email`}><span>Reply email</span><input id={`${formId}-email`} name="email" type="email" autoComplete="email" maxLength={254} required /></label><label htmlFor={`${formId}-phone`}><span>Phone / WhatsApp</span><input id={`${formId}-phone`} name="phone" type="tel" minLength={7} maxLength={24} required /></label><label htmlFor={`${formId}-location`}><span>Delivery location</span><input id={`${formId}-location`} name="location" minLength={2} maxLength={160} required /></label></div><label htmlFor={`${formId}-notes`}><span>Notes or preferred delivery date</span><textarea id={`${formId}-notes`} name="notes" maxLength={600} /></label><label className={styles.checkoutConsent}><input name="consent" type="checkbox" required /><span>I agree that FarmerBook may send these details to Vistaraku for this order request.</span></label><label className={styles.checkoutHoneypot} aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label><div className={styles.checkoutTurnstile}>{turnstileSiteKey ? <><span>Spam protection</span><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setTurnstileReady(true)} /><div ref={turnstileContainer} /></> : <span>Protected by FarmerBook form validation.</span>}</div>{checkoutError ? <p className={styles.checkoutError} role="alert">{checkoutError}</p> : null}<div className={styles.checkoutActions}><button className="button" type="submit" disabled={isSubmitting || Boolean(turnstileSiteKey && !turnstileToken)}><Send size={16} aria-hidden="true" />{isSubmitting ? "Sending…" : "Send order enquiry"}</button><button className={styles.cancelCheckout} type="button" onClick={() => setCheckoutOpen(false)}>Cancel</button></div><small className={styles.checkoutFinePrint}>Vistaraku confirms availability, GST, freight, delivery and payment directly. No payment is taken here.</small></form> : null}</div> : null}
          </aside>
        </div>
      </section>

      <section className={styles.communityCta}>
        <div className={styles.communityImage}><img src="/images/vistaraku/community-photo.png" alt="Community members holding Vistaraku leaf tableware" loading="lazy" /></div>
        <div><p className={styles.eyebrow}>Gather. Share. Make a difference.</p><h2>Start with your next ceremony.</h2><p>Planning a wedding, Ganesh celebration, apartment event or community meal? Send us your requirement and we’ll help you choose pack sizes for the occasion.</p><a className="button" href="#shop">Build your event order <Check size={16} aria-hidden="true" /></a></div>
      </section>

      <p className={styles.storeFinePrint}>Source: Vistaraku Wholesale Price List — Domestic Bulk, supplied for this storefront. Price list validity shown in source: 11 Aug 2025–11 Aug 2026. Prices, tax, stock, MOQ, freight and delivery must be confirmed before payment. Images are from the Vistaraku brand website: <a href="https://www.vistaraku.co.in/" target="_blank" rel="noopener noreferrer">vistaraku.co.in</a>.</p>
    </>
  );
}
