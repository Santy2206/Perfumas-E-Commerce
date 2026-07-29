import Script from "next/script";

/**
 * Prefetch Wompi widget while the shopper fills checkout fields.
 */
export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="preconnect" href="https://checkout.wompi.co" />
      <link rel="dns-prefetch" href="https://checkout.wompi.co" />
      <Script
        src="https://checkout.wompi.co/widget.js"
        strategy="afterInteractive"
      />
      {children}
    </>
  );
}
