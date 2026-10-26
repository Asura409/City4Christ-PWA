import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/lib/icons";
import {
  buildGiveALittleCheckoutURL,
  GIVE_A_LITTLE_AMOUNTS,
  GIVE_A_LITTLE_CAMPAIGN_URL,
} from "@/giving/checkout";

export default function GivingScreen() {
  const [amount, setAmount] = useState(GIVE_A_LITTLE_AMOUNTS[0]);
  const [recurring, setRecurring] = useState(false);
  const navigate = useNavigate();
  const checkoutURL = buildGiveALittleCheckoutURL({ amount, recurring });

  return (
    <section className="screen active giving-screen" aria-label="Giving">
      <button className="btn soft giving-back" type="button" onClick={() => navigate(-1)}>
        <Icon name="back" /> Back
      </button>
      <header className="giving-heading">
        <span className="giving-icon"><Icon name="heart" fill /></span>
        <p className="group-eyebrow">GIVING</p>
        <h1>Give to City4Christ</h1>
        <p className="lead">Your generosity supports the life and work of our church.</p>
      </header>

      <section className="card giving-card" aria-label="Give A Little donation">
        <h2>Choose an amount</h2>
        <div className="giving-amounts" role="group" aria-label="Donation amount">
          {GIVE_A_LITTLE_AMOUNTS.map((option) => (
            <button
              className="giving-amount"
              key={option}
              type="button"
              aria-pressed={amount === option}
              onClick={() => setAmount(option)}
            >
              £{option}
            </button>
          ))}
        </div>
        <label className="giving-recurring">
          <input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} />
          <span>Make this a monthly donation</span>
        </label>
        <a className="btn gold giving-checkout" href={checkoutURL}>
          Continue to Give A Little
        </a>
        <p className="giving-provider-note">
          Give A Little handles your payment and receipt. Your card details stay with them.
        </p>
        <a className="giving-campaign-link" href={GIVE_A_LITTLE_CAMPAIGN_URL}>
          View the Give A Little campaign
        </a>
      </section>
    </section>
  );
}
