import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/lib/icons";

export default function GivingReturnScreen() {
  return (
    <section className="screen active giving-return-screen" aria-label="Giving thank you">
      <span className="giving-icon"><Icon name="heart" fill /></span>
      <p className="group-eyebrow">CITY4CHRIST GIVING</p>
      <h1>Thank you for supporting City4Christ</h1>
      <p className="lead">
        Your transaction and receipt are available in your Give A Little account under Transactions, then Donations Given &amp; Pledges Made. Sign in there with the email address you used when donating.
      </p>
      <a className="btn gold giving-checkout" href="https://givealittle.co">
        View Give A Little
      </a>
      <Link className="giving-home-link" to="/home">Return to City4Christ</Link>
    </section>
  );
}
