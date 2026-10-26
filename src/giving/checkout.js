export const GIVE_A_LITTLE_CAMPAIGN_ID = "ce1d67aa-f451-418f-9468-ab80effc8dae";
export const GIVE_A_LITTLE_CAMPAIGN_URL = "https://givealittle.co/c/6GvrA4jJbNQcVwhdnfppWA";
export const GIVE_A_LITTLE_AMOUNTS = [20, 50, 100];

export function buildGiveALittleCheckoutURL({ amount, recurring = false, currentURL = window.location.href }) {
  if (!GIVE_A_LITTLE_AMOUNTS.includes(Number(amount))) {
    throw new TypeError("Choose an amount offered by the Give A Little campaign.");
  }
  const returnURL = new URL(currentURL);
  returnURL.search = "";
  returnURL.hash = "/giving/return";

  const checkout = new URL(`/${GIVE_A_LITTLE_CAMPAIGN_ID}/initiate-donation`, "https://givealittle.co");
  checkout.searchParams.set("amount", String(Number(amount)));
  checkout.searchParams.set("recurring", String(Boolean(recurring)));
  checkout.searchParams.set("returnUrl", returnURL.href);
  return checkout.href;
}
