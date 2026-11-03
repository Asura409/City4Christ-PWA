import React from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/lib/icons";
import { GIVE_A_LITTLE_CAMPAIGN_URL } from "@/giving/checkout";

export default function GivingScreen() {
  const navigate = useNavigate();

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
        <h2>Give securely with Give A Little</h2>
        <p className="lead">Tap below to continue to Give A Little. City4Christ does not collect, process, or send donation details to the provider.</p>
        <a className="btn gold giving-checkout" href={GIVE_A_LITTLE_CAMPAIGN_URL}>
          Continue to Give A Little
        </a>
        <p className="giving-provider-note">Give A Little handles the donation, payment, and receipt on its own platform.</p>
        <a className="giving-campaign-link" href={GIVE_A_LITTLE_CAMPAIGN_URL}>
          View the Give A Little campaign
        </a>
      </section>
    </section>
  );
}
