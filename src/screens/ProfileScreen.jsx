import React from 'react';
import { Icon } from '@/lib/icons';
import { useToast } from '@/components/Toast';

export default function ProfileScreen() {
  const toast = useToast();
  return (
    <section className="screen active" aria-label="Member profile">
      <div className="banner" aria-hidden="true" />
      <div className="p-photo" aria-hidden="true">GJ</div>
      <h1 className="p-name">Gbande James</h1>
      <p className="p-role">Youth Ministry</p>
      <div className="stats">
        <div><b>42</b><span>Prayers</span></div>
        <div><b>17</b><span>Posts</span></div>
        <div><b>3</b><span>Groups</span></div>
      </div>
      <div className="p-act">
        <button className="btn gold" onClick={() => toast('Following Gbande')}>Follow</button>
        <button className="btn soft" onClick={() => toast('Chat is coming soon')}>Message</button>
      </div>

      <div className="sh"><h2>Ministry badges</h2></div>
      <div className="wrap">
        <span className="badge b-gold"><Icon name="medal" />Leader</span>
        <span className="badge b-blue"><Icon name="music" />Worship team</span>
        <span className="badge b-green"><Icon name="globe" />Outreach</span>
      </div>

      <div className="sh"><h2>Interests</h2></div>
      <div className="wrap">
        <span className="int i-w">Bible study</span>
        <span className="int i-p">New marrieds</span>
      </div>

      <div className="sh"><h2>Personal testimony</h2></div>
      <div className="testimony">
        I gave my life to Christ at a youth retreat, and serving here has taught me that ministry is mostly showing up for people.
      </div>
    </section>
  );
}
