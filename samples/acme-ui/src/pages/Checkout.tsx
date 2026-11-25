export function Checkout() {
  return (
    <main style={{ padding: 30 }}>
      <h1 style={{ fontSize: 42, fontWeight: 800, color: '#0f172a' }}>Checkout</h1>
      <img src="/card.png" />
      <input type="text" placeholder="Card number" style={{ padding: '10px 14px', border: '2px solid #9ca3af', borderRadius: 0, fontSize: 16 }} />
      <input id="coupon" placeholder="Coupon" className="px-3 py-2 border border-gray-300 rounded-md text-sm" />
      <button style={{ backgroundColor: '#2464ea', color: '#ffffff', padding: '10px 20px', borderRadius: 6, fontWeight: 600 }}>Pay now</button>
      <button className="bg-red-600 text-white px-4 py-2 rounded-sm">Cancel</button>
      <button aria-describedby="close-help" className="p-2 rounded-full bg-gray-100"><svg width="16" height="16" /></button>
      <p style={{ color: '#a3a3a3', backgroundColor: '#ffffff', fontSize: 13 }}>Prices include VAT.</p>
    </main>
  );
}
